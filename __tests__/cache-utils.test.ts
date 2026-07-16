import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  afterAll
} from '@jest/globals';
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
const cacheUtils = await import('../src/cache-utils.js');
// @ts-ignore - test file outside rootDir
const {MockGlobber} = await import('./mock/glob-mock.js');

import type {PackageManagerInfo} from '../src/cache-utils.js';

const {
  isCacheFeatureAvailable,
  supportedPackageManagers,
  isGhes,
  resetProjectDirectoriesMemoized
} = utils;

// Helper: mock exec.getExecOutput to simulate getCommandOutput behavior
function mockGetCommandOutput(
  spy: jest.Mock,
  fn: (command: string, cwd?: string) => string
) {
  spy.mockImplementation(async (command: any, _args: any, options: any) => ({
    stdout: fn(command, options?.cwd),
    stderr: '',
    exitCode: 0
  }));
}

function mockGetCommandOutputOnce(spy: jest.Mock, result: string) {
  spy.mockImplementationOnce(async () => ({
    stdout: result,
    stderr: '',
    exitCode: 0
  }));
}

describe('cache-utils', () => {
  const versionYarn1 = '1.2.3';

  let debugSpy: jest.Mock;
  let getExecOutputSpy: jest.Mock;
  let isFeatureAvailable: jest.Mock;
  let info: jest.Mock;
  let warningSpy: jest.Mock;
  let fsRealPathSyncSpy: jest.SpiedFunction<typeof fs.realpathSync>;

  beforeEach(() => {
    console.log('::stop-commands::stoptoken');
    process.env['GITHUB_WORKSPACE'] = path.join(__dirname, 'data');

    debugSpy = core.debug as jest.Mock;
    debugSpy.mockImplementation((_msg: any) => {});

    info = core.info as jest.Mock;
    warningSpy = core.warning as jest.Mock;

    isFeatureAvailable = cache.isFeatureAvailable as jest.Mock;

    getExecOutputSpy = exec.getExecOutput as jest.Mock;

    fsRealPathSyncSpy = jest.spyOn(fs, 'realpathSync');
    fsRealPathSyncSpy.mockImplementation((dirName: any) => {
      return dirName;
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    console.log('::stoptoken::');
    jest.restoreAllMocks();
  }, 100000);

  describe('getPackageManagerInfo', () => {
    it.each<[string, PackageManagerInfo | null]>([
      ['npm', utils.supportedPackageManagers.npm],
      ['pnpm', utils.supportedPackageManagers.pnpm],
      ['yarn', utils.supportedPackageManagers.yarn],
      ['yarn1', null],
      ['yarn2', null],
      ['npm7', null]
    ])('getPackageManagerInfo for %s is %o', async (packageManager, result) => {
      mockGetCommandOutputOnce(getExecOutputSpy, versionYarn1);
      await expect(utils.getPackageManagerInfo(packageManager)).resolves.toBe(
        result
      );
    });
  });

  it('isCacheFeatureAvailable for GHES is false', () => {
    isFeatureAvailable.mockImplementation(() => false);
    process.env['GITHUB_SERVER_URL'] = 'https://www.test.com';

    expect(isCacheFeatureAvailable()).toBeFalsy();
    expect(warningSpy).toHaveBeenCalledWith(
      'Cache action is only supported on GHES version >= 3.5. If you are on version >=3.5 Please check with GHES admin if Actions cache service is enabled or not.'
    );
  });

  it('isCacheFeatureAvailable for GHES has an interhal error', () => {
    isFeatureAvailable.mockImplementation(() => false);
    process.env['GITHUB_SERVER_URL'] = '';
    isCacheFeatureAvailable();
    expect(warningSpy).toHaveBeenCalledWith(
      'The runner was not able to contact the cache service. Caching will be skipped'
    );
  });

  it('isCacheFeatureAvailable for GHES is available', () => {
    isFeatureAvailable.mockImplementation(() => true);
    expect(isCacheFeatureAvailable()).toStrictEqual(true);
  });

  afterEach(() => {
    process.env['GITHUB_SERVER_URL'] = '';
    jest.resetAllMocks();
    jest.clearAllMocks();
  });

  describe('getCacheDirectoriesPaths', () => {
    let existsSpy: jest.SpiedFunction<typeof fs.existsSync>;
    let lstatSpy: jest.SpiedFunction<typeof fs.lstatSync>;
    let globCreateSpy: jest.Mock;

    beforeEach(() => {
      existsSpy = jest.spyOn(fs, 'existsSync');
      existsSpy.mockImplementation(() => true);

      lstatSpy = jest.spyOn(fs, 'lstatSync');
      lstatSpy.mockImplementation(
        (_arg: any) => ({isDirectory: () => true}) as any
      );

      globCreateSpy = glob.create as jest.Mock;
      globCreateSpy.mockImplementation((_pattern: any) =>
        MockGlobber.create(['/foo', '/bar'])
      );

      resetProjectDirectoriesMemoized();
    });

    afterEach(() => {
      existsSpy.mockRestore();
      lstatSpy.mockRestore();
    });

    it.each([
      [supportedPackageManagers.npm, ''],
      [supportedPackageManagers.npm, '/dir/file.lock'],
      [supportedPackageManagers.npm, '/**/file.lock'],
      [supportedPackageManagers.pnpm, ''],
      [supportedPackageManagers.pnpm, '/dir/file.lock'],
      [supportedPackageManagers.pnpm, '/**/file.lock']
    ])(
      'getCacheDirectoriesPaths should return one dir for non yarn',
      async (packageManagerInfo, cacheDependency) => {
        mockGetCommandOutput(getExecOutputSpy, () => 'foo');
        const dirs = await cacheUtils.getCacheDirectories(
          packageManagerInfo,
          cacheDependency
        );
        expect(dirs).toEqual(['foo']);
        expect(getExecOutputSpy).toHaveBeenCalledTimes(1);
      }
    );

    it('getCacheDirectoriesPaths should return one dir for yarn without cacheDependency', async () => {
      mockGetCommandOutput(getExecOutputSpy, () => 'foo');
      const dirs = await cacheUtils.getCacheDirectories(
        supportedPackageManagers.yarn,
        ''
      );
      expect(dirs).toEqual(['foo']);
    });

    it.each([
      [supportedPackageManagers.npm, ''],
      [supportedPackageManagers.npm, '/dir/file.lock'],
      [supportedPackageManagers.npm, '/**/file.lock'],
      [supportedPackageManagers.pnpm, ''],
      [supportedPackageManagers.pnpm, '/dir/file.lock'],
      [supportedPackageManagers.pnpm, '/**/file.lock'],
      [supportedPackageManagers.yarn, ''],
      [supportedPackageManagers.yarn, '/dir/file.lock'],
      [supportedPackageManagers.yarn, '/**/file.lock']
    ])(
      'getCacheDirectoriesPaths should throw for getCommandOutput returning empty',
      async (packageManagerInfo, cacheDependency) => {
        mockGetCommandOutput(getExecOutputSpy, (command: string) =>
          command.includes('version') ? '1.' : ''
        );
        await expect(
          cacheUtils.getCacheDirectories(packageManagerInfo, cacheDependency)
        ).rejects.toThrow();
      }
    );

    it.each([
      [supportedPackageManagers.yarn, '/dir/file.lock'],
      [supportedPackageManagers.yarn, '/**/file.lock']
    ])(
      'getCacheDirectoriesPaths should nothrow in case of having not directories',
      async (packageManagerInfo, cacheDependency) => {
        lstatSpy.mockImplementation(
          (_arg: any) => ({isDirectory: () => false}) as any
        );
        await cacheUtils.getCacheDirectories(
          packageManagerInfo,
          cacheDependency
        );
        expect(warningSpy).toHaveBeenCalledTimes(1);
        expect(warningSpy).toHaveBeenCalledWith(
          `No existing directories found containing cache-dependency-path="${cacheDependency}"`
        );
      }
    );

    it.each(['1.1.1', '2.2.2'])(
      'getCacheDirectoriesPaths yarn v%s should return one dir without cacheDependency',
      async version => {
        mockGetCommandOutputOnce(getExecOutputSpy, version);
        mockGetCommandOutputOnce(getExecOutputSpy, `foo${version}`);
        const dirs = await cacheUtils.getCacheDirectories(
          supportedPackageManagers.yarn,
          ''
        );
        expect(dirs).toEqual([`foo${version}`]);
      }
    );

    it.each(['1.1.1', '2.2.2'])(
      'getCacheDirectoriesPaths yarn v%s should return 2 dirs with globbed cacheDependency',
      async version => {
        let dirNo = 1;
        mockGetCommandOutput(getExecOutputSpy, (command: string) =>
          command.includes('version') ? version : `file_${version}_${dirNo++}`
        );
        globCreateSpy.mockImplementation((_pattern: any) =>
          MockGlobber.create(['/tmp/dir1/file', '/tmp/dir2/file'])
        );
        const dirs = await cacheUtils.getCacheDirectories(
          supportedPackageManagers.yarn,
          '/tmp/**/file'
        );
        expect(dirs).toEqual([`file_${version}_1`, `file_${version}_2`]);
      }
    );

    it.each(['1.1.1', '2.2.2'])(
      'getCacheDirectoriesPaths yarn v%s should return 2 dirs  with globbed cacheDependency expanding to duplicates',
      async version => {
        let dirNo = 1;
        mockGetCommandOutput(getExecOutputSpy, (command: string) =>
          command.includes('version') ? version : `file_${version}_${dirNo++}`
        );
        globCreateSpy.mockImplementation((_pattern: any) =>
          MockGlobber.create([
            '/tmp/dir1/file',
            '/tmp/dir2/file',
            '/tmp/dir1/file'
          ])
        );
        const dirs = await cacheUtils.getCacheDirectories(
          supportedPackageManagers.yarn,
          '/tmp/**/file'
        );
        expect(dirs).toEqual([`file_${version}_1`, `file_${version}_2`]);
      }
    );

    it.each(['1.1.1', '2.2.2'])(
      'getCacheDirectoriesPaths yarn v%s should return 2 uniq dirs despite duplicate cache directories',
      async version => {
        let dirNo = 1;
        mockGetCommandOutput(getExecOutputSpy, (command: string) =>
          command.includes('version')
            ? version
            : `file_${version}_${dirNo++ % 2}`
        );
        globCreateSpy.mockImplementation((_pattern: any) =>
          MockGlobber.create([
            '/tmp/dir1/file',
            '/tmp/dir2/file',
            '/tmp/dir3/file'
          ])
        );
        const dirs = await cacheUtils.getCacheDirectories(
          supportedPackageManagers.yarn,
          '/tmp/**/file'
        );
        expect(dirs).toEqual([`file_${version}_1`, `file_${version}_0`]);
        expect(getExecOutputSpy).toHaveBeenCalledTimes(6);
        expect(getExecOutputSpy).toHaveBeenCalledWith(
          'yarn --version',
          undefined,
          expect.objectContaining({cwd: '/tmp/dir1'})
        );
        expect(getExecOutputSpy).toHaveBeenCalledWith(
          'yarn --version',
          undefined,
          expect.objectContaining({cwd: '/tmp/dir2'})
        );
        expect(getExecOutputSpy).toHaveBeenCalledWith(
          'yarn --version',
          undefined,
          expect.objectContaining({cwd: '/tmp/dir3'})
        );
        expect(getExecOutputSpy).toHaveBeenCalledWith(
          version.startsWith('1.')
            ? 'yarn cache dir'
            : 'yarn config get cacheFolder',
          undefined,
          expect.objectContaining({cwd: '/tmp/dir1'})
        );
        expect(getExecOutputSpy).toHaveBeenCalledWith(
          version.startsWith('1.')
            ? 'yarn cache dir'
            : 'yarn config get cacheFolder',
          undefined,
          expect.objectContaining({cwd: '/tmp/dir2'})
        );
        expect(getExecOutputSpy).toHaveBeenCalledWith(
          version.startsWith('1.')
            ? 'yarn cache dir'
            : 'yarn config get cacheFolder',
          undefined,
          expect.objectContaining({cwd: '/tmp/dir3'})
        );
      }
    );

    it.each(['1.1.1', '2.2.2'])(
      'getCacheDirectoriesPaths yarn v%s should return 4 dirs with multiple globs',
      async version => {
        const cacheDependencyPath = `/tmp/dir1/file
          /tmp/dir2/file
/tmp/**/file
          `;
        globCreateSpy.mockImplementation((_pattern: any) =>
          MockGlobber.create([
            '/tmp/dir1/file',
            '/tmp/dir2/file',
            '/tmp/dir3/file',
            '/tmp/dir4/file'
          ])
        );
        let dirNo = 1;
        mockGetCommandOutput(getExecOutputSpy, (command: string) =>
          command.includes('version') ? version : `file_${version}_${dirNo++}`
        );
        const dirs = await cacheUtils.getCacheDirectories(
          supportedPackageManagers.yarn,
          cacheDependencyPath
        );
        expect(dirs).toEqual([
          `file_${version}_1`,
          `file_${version}_2`,
          `file_${version}_3`,
          `file_${version}_4`
        ]);
      }
    );
  });
});

describe('isGhes', () => {
  const pristineEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {...pristineEnv};
  });

  afterAll(() => {
    process.env = pristineEnv;
  });

  it('returns false when the GITHUB_SERVER_URL environment variable is not defined', () => {
    delete process.env['GITHUB_SERVER_URL'];
    expect(isGhes()).toBeFalsy();
  });

  it('returns false when the GITHUB_SERVER_URL environment variable is set to github.com', () => {
    process.env['GITHUB_SERVER_URL'] = 'https://github.com';
    expect(isGhes()).toBeFalsy();
  });

  it('returns false when the GITHUB_SERVER_URL environment variable is set to a GitHub Enterprise Cloud-style URL', () => {
    process.env['GITHUB_SERVER_URL'] = 'https://contoso.ghe.com';
    expect(isGhes()).toBeFalsy();
  });

  it('returns false when the GITHUB_SERVER_URL environment variable has a .localhost suffix', () => {
    process.env['GITHUB_SERVER_URL'] = 'https://mock-github.localhost';
    expect(isGhes()).toBeFalsy();
  });

  it('returns true when the GITHUB_SERVER_URL environment variable is set to some other URL', () => {
    process.env['GITHUB_SERVER_URL'] = 'https://src.onpremise.fabrikam.com';
    expect(isGhes()).toBeTruthy();
  });
});
