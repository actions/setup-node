import {jest, describe, it, expect, beforeEach, afterEach} from '@jest/globals';
import {fileURLToPath} from 'url';
import path from 'path';
import fs from 'fs';

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
  isFeatureAvailable: jest.fn(),
  ValidationError: class ValidationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ValidationError';
    }
  }
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
const {run} = await import('../src/cache-save.js');
const {State} = await import('../src/constants.js');

describe('run', () => {
  const yarnFileHash =
    'b8a0bae5243251f7c07dd52d1f78ff78281dfefaded700a176261b6b54fa245b';
  const npmFileHash =
    'abf7c9b306a3149dcfba4673e2362755503bcceaab46f0e4e6fee0ade493e20c';
  const pnpmFileHash =
    '26309058093e84713f38869c50cf1cee9b08155ede874ec1b44ce3fca8c68c70';
  const commonPath = '/some/random/path';
  process.env['GITHUB_WORKSPACE'] = path.join(__dirname, 'data');

  const inputs = {} as any;

  let getInputSpy: jest.Mock;
  let infoSpy: jest.Mock;
  let warningSpy: jest.Mock;
  let debugSpy: jest.Mock;
  let setFailedSpy: jest.Mock;
  let getStateSpy: jest.Mock;
  let saveCacheSpy: jest.Mock;
  let getExecOutputSpy: jest.Mock;
  let hashFilesSpy: jest.Mock;
  let existsSpy: jest.SpiedFunction<typeof fs.existsSync>;

  beforeEach(() => {
    getInputSpy = core.getInput as jest.Mock;
    getInputSpy.mockImplementation((name: any) => inputs[name]);

    infoSpy = core.info as jest.Mock;
    infoSpy.mockImplementation(() => undefined);

    warningSpy = core.warning as jest.Mock;
    warningSpy.mockImplementation(() => undefined);

    setFailedSpy = core.setFailed as jest.Mock;
    setFailedSpy.mockImplementation(() => undefined);

    debugSpy = core.debug as jest.Mock;
    debugSpy.mockImplementation(() => undefined);

    getStateSpy = core.getState as jest.Mock;

    // cache
    saveCacheSpy = cache.saveCache as jest.Mock;
    saveCacheSpy.mockImplementation(() => undefined);

    // glob
    hashFilesSpy = glob.hashFiles as jest.Mock;
    hashFilesSpy.mockImplementation((pattern: any) => {
      if (pattern.includes('package-lock.json')) {
        return npmFileHash;
      } else if (pattern.includes('yarn.lock')) {
        return yarnFileHash;
      } else {
        return '';
      }
    });

    existsSpy = jest.spyOn(fs, 'existsSync');
    existsSpy.mockImplementation(() => true);

    // exec
    getExecOutputSpy = exec.getExecOutput as jest.Mock;
  });

  afterEach(() => {
    existsSpy.mockRestore();
    jest.resetAllMocks();
    jest.clearAllMocks();
  });

  describe('Package manager validation', () => {
    it('Package manager is not provided, skip caching', async () => {
      inputs['cache'] = '';
      getStateSpy.mockImplementation(() => '');

      await run();

      expect(setFailedSpy).not.toHaveBeenCalled();
      expect(infoSpy).not.toHaveBeenCalled();
      expect(saveCacheSpy).not.toHaveBeenCalled();
      expect(debugSpy).toHaveBeenLastCalledWith(
        "Caching for '' is not supported"
      );
    });

    it('Package manager is not valid, skip caching', async () => {
      inputs['cache'] = 'yarn3';
      getStateSpy.mockImplementation(key =>
        key === State.CachePackageManager ? inputs['cache'] : ''
      );

      await run();

      expect(setFailedSpy).not.toHaveBeenCalled();
      expect(infoSpy).not.toHaveBeenCalled();
      expect(saveCacheSpy).not.toHaveBeenCalled();
      expect(debugSpy).toHaveBeenLastCalledWith(
        "Caching for 'yarn3' is not supported"
      );
    });
  });

  describe('Validate unchanged cache is not saved', () => {
    it('should not save cache for yarn1', async () => {
      inputs['cache'] = 'yarn';
      getStateSpy.mockImplementation(key =>
        key === State.CachePackageManager
          ? inputs['cache']
          : key === State.CachePrimaryKey || key === State.CacheMatchedKey
            ? yarnFileHash
            : key === State.CachePaths
              ? '["/foo/bar"]'
              : 'not expected'
      );

      await run();

      expect(getInputSpy).not.toHaveBeenCalled();
      expect(getStateSpy).toHaveBeenCalledTimes(4);
      expect(getExecOutputSpy).toHaveBeenCalledTimes(0);
      expect(debugSpy).toHaveBeenCalledTimes(0);
      expect(infoSpy).toHaveBeenCalledWith(
        `Cache hit occurred on the primary key ${yarnFileHash}, not saving cache.`
      );
      expect(setFailedSpy).not.toHaveBeenCalled();
    });

    it('should not save cache for yarn2', async () => {
      inputs['cache'] = 'yarn';
      getStateSpy.mockImplementation(key =>
        key === State.CachePackageManager
          ? inputs['cache']
          : key === State.CachePrimaryKey || key === State.CacheMatchedKey
            ? yarnFileHash
            : key === State.CachePaths
              ? '["/foo/bar"]'
              : 'not expected'
      );

      await run();

      expect(getInputSpy).not.toHaveBeenCalled();
      expect(getStateSpy).toHaveBeenCalledTimes(4);
      expect(getExecOutputSpy).toHaveBeenCalledTimes(0);
      expect(debugSpy).toHaveBeenCalledTimes(0);
      expect(infoSpy).toHaveBeenCalledWith(
        `Cache hit occurred on the primary key ${yarnFileHash}, not saving cache.`
      );
      expect(setFailedSpy).not.toHaveBeenCalled();
    });

    it('should not save cache for npm', async () => {
      inputs['cache'] = 'npm';
      getStateSpy.mockImplementation(key =>
        key === State.CachePackageManager
          ? inputs['cache']
          : key === State.CachePrimaryKey || key === State.CacheMatchedKey
            ? yarnFileHash
            : key === State.CachePaths
              ? '["/foo/bar"]'
              : 'not expected'
      );
      getExecOutputSpy.mockImplementationOnce(() => ({
        stdout: `${commonPath}/npm`,
        stderr: '',
        exitCode: 0
      }));

      await run();

      expect(getInputSpy).not.toHaveBeenCalled();
      expect(getStateSpy).toHaveBeenCalledTimes(4);
      expect(getExecOutputSpy).toHaveBeenCalledTimes(0);
      expect(debugSpy).toHaveBeenCalledTimes(0);
      expect(setFailedSpy).not.toHaveBeenCalled();
    });

    it('should not save cache for pnpm', async () => {
      inputs['cache'] = 'pnpm';
      getStateSpy.mockImplementation(key =>
        key === State.CachePackageManager
          ? inputs['cache']
          : key === State.CachePrimaryKey || key === State.CacheMatchedKey
            ? yarnFileHash
            : key === State.CachePaths
              ? '["/foo/bar"]'
              : 'not expected'
      );

      await run();

      expect(getInputSpy).not.toHaveBeenCalled();
      expect(getStateSpy).toHaveBeenCalledTimes(4);
      expect(getExecOutputSpy).toHaveBeenCalledTimes(0);
      expect(debugSpy).toHaveBeenCalledTimes(0);
      expect(setFailedSpy).not.toHaveBeenCalled();
    });
  });

  describe('action saves the cache', () => {
    it('saves cache from yarn 1', async () => {
      inputs['cache'] = 'yarn';
      getStateSpy.mockImplementation((key: any) =>
        key === State.CachePackageManager
          ? inputs['cache']
          : key === State.CacheMatchedKey
            ? yarnFileHash
            : key === State.CachePrimaryKey
              ? npmFileHash
              : key === State.CachePaths
                ? '["/foo/bar"]'
                : 'not expected'
      );

      await run();

      expect(getInputSpy).not.toHaveBeenCalled();
      expect(getStateSpy).toHaveBeenCalledTimes(4);
      expect(getExecOutputSpy).toHaveBeenCalledTimes(0);
      expect(debugSpy).toHaveBeenCalledTimes(0);
      expect(infoSpy).not.toHaveBeenCalledWith(
        `Cache hit occurred on the primary key ${yarnFileHash}, not saving cache.`
      );
      expect(saveCacheSpy).toHaveBeenCalled();
      expect(infoSpy).toHaveBeenLastCalledWith(
        `Cache saved with the key: ${npmFileHash}`
      );
      expect(setFailedSpy).not.toHaveBeenCalled();
    });

    it('saves cache from yarn 2', async () => {
      inputs['cache'] = 'yarn';
      getStateSpy.mockImplementation((key: any) =>
        key === State.CachePackageManager
          ? inputs['cache']
          : key === State.CacheMatchedKey
            ? yarnFileHash
            : key === State.CachePrimaryKey
              ? npmFileHash
              : key === State.CachePaths
                ? '["/foo/bar"]'
                : 'not expected'
      );

      await run();

      expect(getInputSpy).not.toHaveBeenCalled();
      expect(getStateSpy).toHaveBeenCalledTimes(4);
      expect(getExecOutputSpy).toHaveBeenCalledTimes(0);
      expect(debugSpy).toHaveBeenCalledTimes(0);
      expect(infoSpy).not.toHaveBeenCalledWith(
        `Cache hit occurred on the primary key ${yarnFileHash}, not saving cache.`
      );
      expect(saveCacheSpy).toHaveBeenCalled();
      expect(infoSpy).toHaveBeenLastCalledWith(
        `Cache saved with the key: ${npmFileHash}`
      );
      expect(setFailedSpy).not.toHaveBeenCalled();
    });

    it('saves cache from npm', async () => {
      inputs['cache'] = 'npm';
      getStateSpy.mockImplementation((key: any) =>
        key === State.CachePackageManager
          ? inputs['cache']
          : key === State.CacheMatchedKey
            ? npmFileHash
            : key === State.CachePrimaryKey
              ? yarnFileHash
              : key === State.CachePaths
                ? '["/foo/bar"]'
                : 'not expected'
      );

      await run();

      expect(getInputSpy).not.toHaveBeenCalled();
      expect(getStateSpy).toHaveBeenCalledTimes(4);
      expect(getExecOutputSpy).toHaveBeenCalledTimes(0);
      expect(debugSpy).toHaveBeenCalledTimes(0);
      expect(infoSpy).not.toHaveBeenCalledWith(
        `Cache hit occurred on the primary key ${npmFileHash}, not saving cache.`
      );
      expect(saveCacheSpy).toHaveBeenCalled();
      expect(infoSpy).toHaveBeenLastCalledWith(
        `Cache saved with the key: ${yarnFileHash}`
      );
      expect(setFailedSpy).not.toHaveBeenCalled();
    });

    it('saves cache from pnpm', async () => {
      inputs['cache'] = 'pnpm';
      getStateSpy.mockImplementation((key: any) =>
        key === State.CachePackageManager
          ? inputs['cache']
          : key === State.CacheMatchedKey
            ? pnpmFileHash
            : key === State.CachePrimaryKey
              ? npmFileHash
              : key === State.CachePaths
                ? '["/foo/bar"]'
                : 'not expected'
      );

      await run();

      expect(getInputSpy).not.toHaveBeenCalled();
      expect(getStateSpy).toHaveBeenCalledTimes(4);
      expect(getExecOutputSpy).toHaveBeenCalledTimes(0);
      expect(debugSpy).toHaveBeenCalledTimes(0);
      expect(infoSpy).not.toHaveBeenCalledWith(
        `Cache hit occurred on the primary key ${pnpmFileHash}, not saving cache.`
      );
      expect(saveCacheSpy).toHaveBeenCalled();
      expect(infoSpy).toHaveBeenLastCalledWith(
        `Cache saved with the key: ${npmFileHash}`
      );
      expect(setFailedSpy).not.toHaveBeenCalled();
    });

    it('save with -1 cacheId , should not fail workflow', async () => {
      inputs['cache'] = 'npm';
      getStateSpy.mockImplementation((key: any) =>
        key === State.CachePackageManager
          ? inputs['cache']
          : key === State.CacheMatchedKey
            ? npmFileHash
            : key === State.CachePrimaryKey
              ? yarnFileHash
              : key === State.CachePaths
                ? '["/foo/bar"]'
                : 'not expected'
      );
      saveCacheSpy.mockImplementation(() => {
        return -1;
      });

      await run();

      expect(getInputSpy).not.toHaveBeenCalled();
      expect(getStateSpy).toHaveBeenCalledTimes(4);
      expect(getExecOutputSpy).toHaveBeenCalledTimes(0);
      expect(debugSpy).toHaveBeenCalledWith(
        `Cache was not saved for the key: ${yarnFileHash}`
      );
      expect(infoSpy).not.toHaveBeenCalledWith(
        `Cache hit occurred on the primary key ${npmFileHash}, not saving cache.`
      );
      expect(saveCacheSpy).toHaveBeenCalled();
      expect(infoSpy).not.toHaveBeenLastCalledWith(
        `Cache saved with the key: ${yarnFileHash}`
      );
      expect(setFailedSpy).not.toHaveBeenCalled();
    });

    it('saves with error from toolkit, should fail workflow', async () => {
      inputs['cache'] = 'npm';
      getStateSpy.mockImplementation((key: any) =>
        key === State.CachePackageManager
          ? inputs['cache']
          : key === State.CacheMatchedKey
            ? npmFileHash
            : key === State.CachePrimaryKey
              ? yarnFileHash
              : key === State.CachePaths
                ? '["/foo/bar"]'
                : 'not expected'
      );
      saveCacheSpy.mockImplementation(() => {
        throw new cache.ValidationError('Validation failed');
      });

      await run();

      expect(getInputSpy).not.toHaveBeenCalled();
      expect(getStateSpy).toHaveBeenCalledTimes(4);
      expect(getExecOutputSpy).toHaveBeenCalledTimes(0);
      expect(debugSpy).toHaveBeenCalledTimes(0);
      expect(infoSpy).not.toHaveBeenCalledWith(
        `Cache hit occurred on the primary key ${npmFileHash}, not saving cache.`
      );
      expect(saveCacheSpy).toHaveBeenCalled();
      expect(setFailedSpy).toHaveBeenCalled();
    });
  });
});
