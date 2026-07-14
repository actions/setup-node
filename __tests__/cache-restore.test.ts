import {jest, describe, it, expect, beforeEach, afterEach} from '@jest/globals';
import {fileURLToPath} from 'url';
import * as path from 'path';
import osm from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Mock @actions modules before importing anything that depends on them
jest.unstable_mockModule('@actions/core', () => ({
  info: jest.fn(),
  warning: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
  notice: jest.fn(),
  setFailed: jest.fn(),
  setOutput: jest.fn(),
  getInput: jest.fn(),
  getBooleanInput: jest.fn(),
  getMultilineInput: jest.fn(),
  addPath: jest.fn(),
  exportVariable: jest.fn(),
  saveState: jest.fn(),
  getState: jest.fn(),
  setSecret: jest.fn(),
  isDebug: jest.fn(() => false),
  startGroup: jest.fn(),
  endGroup: jest.fn(),
  group: jest.fn((_name: string, fn: () => Promise<unknown>) => fn()),
  toPlatformPath: jest.fn((p: string) => p),
  toWin32Path: jest.fn((p: string) => p),
  toPosixPath: jest.fn((p: string) => p)
}));

jest.unstable_mockModule('@actions/cache', () => ({
  saveCache: jest.fn(),
  restoreCache: jest.fn(),
  isFeatureAvailable: jest.fn()
}));

jest.unstable_mockModule('@actions/glob', () => ({
  hashFiles: jest.fn(),
  create: jest.fn()
}));

jest.unstable_mockModule('@actions/exec', () => ({
  exec: jest.fn(),
  getExecOutput: jest.fn()
}));

jest.unstable_mockModule('@actions/io', () => ({
  which: jest.fn(),
  mkdirP: jest.fn(),
  rmRF: jest.fn(),
  mv: jest.fn(),
  cp: jest.fn()
}));

// Dynamic imports after mocking
const core = await import('@actions/core');
const cache = await import('@actions/cache');
const glob = await import('@actions/glob');
const exec = await import('@actions/exec');
const utils = await import('../src/cache-utils.js');
const {restoreCache} = await import('../src/cache-restore.js');

describe('cache-restore', () => {
  const packageManagers = ['yarn', 'npm', 'pnpm'] as const;
  type PackageManager = (typeof packageManagers)[number];

  const setWorkspaceFor = (pm: PackageManager) => {
    process.env['GITHUB_WORKSPACE'] = path.join(__dirname, 'data', pm);
  };
  const originalGithubWorkspace = process.env['GITHUB_WORKSPACE'];
  if (!process.env.RUNNER_OS) {
    process.env.RUNNER_OS = 'Linux';
  }
  const platform = process.env.RUNNER_OS;
  const arch = 'arm64';
  const commonPath = '/some/random/path';
  const npmCachePath = `${commonPath}/npm`;
  const pnpmCachePath = `${commonPath}/pnpm`;
  const yarn1CachePath = `${commonPath}/yarn1`;
  const yarn2CachePath = `${commonPath}/yarn2`;
  const yarnFileHash =
    'b8a0bae5243251f7c07dd52d1f78ff78281dfefaded700a176261b6b54fa245b';
  const npmFileHash =
    'abf7c9b306a3149dcfba4673e2362755503bcceaab46f0e4e6fee0ade493e20c';
  const pnpmFileHash =
    '26309058093e84713f38869c50cf1cee9b08155ede874ec1b44ce3fca8c68c70';
  const cachesObject: Record<string, string> = {
    [npmCachePath]: npmFileHash,
    [pnpmCachePath]: pnpmFileHash,
    [yarn1CachePath]: yarnFileHash,
    [yarn2CachePath]: yarnFileHash
  };

  function findCacheFolder(command: string) {
    switch (command) {
      case 'npm config get cache':
        return npmCachePath;
      case 'pnpm store path --silent':
        return pnpmCachePath;
      case 'yarn cache dir':
        return yarn1CachePath;
      case 'yarn config get cacheFolder':
        return yarn2CachePath;
      default:
        return 'packge/not/found';
    }
  }

  let saveStateSpy: jest.Mock;
  let infoSpy: jest.Mock;
  let debugSpy: jest.Mock;
  let setOutputSpy: jest.Mock;
  let getExecOutputSpy: jest.Mock;
  let restoreCacheSpy: jest.Mock;
  let hashFilesSpy: jest.Mock;
  let archSpy: jest.SpiedFunction<typeof osm.arch>;

  beforeEach(() => {
    // core
    infoSpy = core.info as jest.Mock;
    infoSpy.mockImplementation(() => undefined);

    debugSpy = core.debug as jest.Mock;
    debugSpy.mockImplementation(() => undefined);

    setOutputSpy = core.setOutput as jest.Mock;
    setOutputSpy.mockImplementation(() => undefined);

    saveStateSpy = core.saveState as jest.Mock;
    saveStateSpy.mockImplementation(() => undefined);

    // glob
    hashFilesSpy = glob.hashFiles as jest.Mock;
    (hashFilesSpy as jest.Mock<typeof glob.hashFiles>).mockImplementation(
      async (pattern: string) => {
        if (pattern.includes('package-lock.json')) {
          return npmFileHash;
        } else if (pattern.includes('pnpm-lock.yaml')) {
          return pnpmFileHash;
        } else if (pattern.includes('yarn.lock')) {
          return yarnFileHash;
        } else {
          return '';
        }
      }
    );

    // cache
    restoreCacheSpy = cache.restoreCache as jest.Mock;
    (
      restoreCacheSpy as jest.Mock<typeof cache.restoreCache>
    ).mockImplementation(async (cachePaths: string[], key: string) => {
      if (!cachePaths || cachePaths.length === 0) {
        return undefined;
      }

      const cachPath = cachePaths[0];
      const fileHash = cachesObject[cachPath];

      if (key.includes(fileHash)) {
        return key;
      }

      return undefined;
    });

    // exec
    getExecOutputSpy = exec.getExecOutput as jest.Mock;

    // os
    archSpy = jest.spyOn(osm, 'arch');
    archSpy.mockImplementation(() => arch);
  });

  describe('Validate provided package manager', () => {
    it.each([['npm7'], ['npm6'], ['pnpm6'], ['yarn1'], ['yarn2'], ['random']])(
      'Throw an error because %s is not supported',
      async packageManager => {
        await expect(restoreCache(packageManager, '')).rejects.toThrow(
          `Caching for '${packageManager}' is not supported`
        );
      }
    );
  });

  describe('Restore dependencies', () => {
    it.each([
      ['yarn', '2.1.2', yarnFileHash],
      ['yarn', '1.2.3', yarnFileHash],
      ['npm', '', npmFileHash],
      ['pnpm', '', pnpmFileHash]
    ])(
      'restored dependencies for %s',
      async (packageManager, toolVersion, fileHash) => {
        const expectedCacheKey = `node-cache-${platform}-${arch}-${packageManager}-${fileHash}`;
        setWorkspaceFor(packageManager as PackageManager);
        getExecOutputSpy.mockImplementation(async (command: any) => ({
          stdout: command.includes('version')
            ? toolVersion
            : findCacheFolder(command),
          stderr: '',
          exitCode: 0
        }));

        await restoreCache(packageManager, '');
        expect(hashFilesSpy).toHaveBeenCalled();
        expect(infoSpy).toHaveBeenCalledWith(
          `Cache restored from key: ${expectedCacheKey}`
        );
        expect(infoSpy).not.toHaveBeenCalledWith(
          `${packageManager} cache is not found`
        );
        expect(setOutputSpy).toHaveBeenCalledWith('cache-hit', true);
        expect(setOutputSpy).toHaveBeenCalledWith(
          'cache-primary-key',
          expectedCacheKey
        );
        expect(setOutputSpy).toHaveBeenCalledWith(
          'cache-matched-key',
          expectedCacheKey
        );
      }
    );
  });

  describe('Dependencies changed', () => {
    it.each([
      ['yarn', '2.1.2', yarnFileHash],
      ['yarn', '1.2.3', yarnFileHash],
      ['npm', '', npmFileHash],
      ['pnpm', '', pnpmFileHash]
    ])(
      'dependencies are changed %s',
      async (packageManager, toolVersion, fileHash) => {
        const expectedCacheKey = `node-cache-${platform}-${arch}-${packageManager}-${fileHash}`;
        setWorkspaceFor(packageManager as PackageManager);
        getExecOutputSpy.mockImplementation(async (command: any) => ({
          stdout: command.includes('version')
            ? toolVersion
            : findCacheFolder(command),
          stderr: '',
          exitCode: 0
        }));

        restoreCacheSpy.mockImplementationOnce(() => undefined);
        await restoreCache(packageManager, '');
        expect(hashFilesSpy).toHaveBeenCalled();
        expect(infoSpy).toHaveBeenCalledWith(
          `${packageManager} cache is not found`
        );
        expect(setOutputSpy).toHaveBeenCalledWith('cache-hit', false);
        expect(setOutputSpy).toHaveBeenCalledWith(
          'cache-primary-key',
          expectedCacheKey
        );
        expect(setOutputSpy).toHaveBeenCalledWith(
          'cache-matched-key',
          undefined
        );
      }
    );
  });

  afterEach(() => {
    if (originalGithubWorkspace === undefined) {
      delete process.env['GITHUB_WORKSPACE'];
    } else {
      process.env['GITHUB_WORKSPACE'] = originalGithubWorkspace;
    }
    jest.resetAllMocks();
    jest.clearAllMocks();
  });
});
