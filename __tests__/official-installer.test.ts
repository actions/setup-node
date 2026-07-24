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
import fs from 'fs';
import cp from 'child_process';
import osm from 'os';
import path from 'path';

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

jest.unstable_mockModule('@actions/io', () => ({
  which: jest.fn(),
  mkdirP: jest.fn(),
  rmRF: jest.fn(),
  mv: jest.fn(),
  cp: jest.fn()
}));

jest.unstable_mockModule('@actions/tool-cache', () => ({
  find: jest.fn(),
  findAllVersions: jest.fn(),
  downloadTool: jest.fn(),
  extractTar: jest.fn(),
  extractZip: jest.fn(),
  extractXar: jest.fn(),
  extract7z: jest.fn(),
  cacheDir: jest.fn(),
  cacheFile: jest.fn(),
  getManifestFromRepo: jest.fn(),
  findFromManifest: jest.fn(),
  HTTPError: class HTTPError extends Error {
    readonly httpStatusCode: number;
    constructor(httpStatusCode?: number) {
      super(`Unexpected HTTP response: ${httpStatusCode}`);
      this.httpStatusCode = httpStatusCode ?? 0;
    }
  }
}));

const _mockGetJson = jest.fn();
jest.unstable_mockModule('@actions/http-client', () => ({
  HttpClient: jest.fn().mockImplementation(() => ({
    getJson: _mockGetJson
  }))
}));

jest.unstable_mockModule('@actions/exec', () => ({
  exec: jest.fn(),
  getExecOutput: jest.fn()
}));

jest.unstable_mockModule('@actions/cache', () => ({
  saveCache: jest.fn(),
  restoreCache: jest.fn(),
  isFeatureAvailable: jest.fn()
}));

// Pre-import real authutil before mocking
const realAuth = await import('../src/authutil.js');
jest.unstable_mockModule('../src/authutil.js', () => ({
  ...realAuth,
  configAuthentication: jest.fn()
}));

// Dynamic imports after mocking
const core = await import('@actions/core');
const io = await import('@actions/io');
const tc = await import('@actions/tool-cache');
const httpm = await import('@actions/http-client');
const exec = await import('@actions/exec');
const cache = await import('@actions/cache');
const main = await import('../src/main.js');
const auth = await import('../src/authutil.js');
const {default: OfficialBuilds} =
  await import('../src/distributions/official_builds/official_builds.js');

const {default: nodeTestManifest} = await import(
  './data/versions-manifest.json',
  {with: {type: 'json'}}
);
const {default: nodeTestDist} = await import('./data/node-dist-index.json', {
  with: {type: 'json'}
});
const {default: nodeTestDistNightly} = await import(
  './data/node-nightly-index.json',
  {with: {type: 'json'}}
);
const {default: nodeTestDistRc} = await import('./data/node-rc-index.json', {
  with: {type: 'json'}
});
const {default: nodeV8CanaryTestDist} = await import(
  './data/v8-canary-dist-index.json',
  {with: {type: 'json'}}
);

import type {INodeVersion} from '../src/distributions/base-models.js';
import type {IToolRelease} from '@actions/tool-cache';

describe('setup-node', () => {
  let build: InstanceType<typeof OfficialBuilds>;
  let inputs = {} as any;
  let os = {} as any;

  let inSpy: jest.Mock;
  let findSpy: jest.Mock;
  let findAllVersionsSpy: jest.Mock;
  let cnSpy: jest.SpiedFunction<typeof process.stdout.write>;
  let logSpy: jest.Mock;
  let warningSpy: jest.Mock;
  let addPathSpy: jest.Mock;
  let setFailedSpy: jest.Mock;
  let getManifestSpy: jest.Mock;
  let platSpy: jest.SpiedFunction<typeof osm.platform>;
  let archSpy: jest.SpiedFunction<typeof osm.arch>;
  let dlSpy: jest.Mock;
  let exSpy: jest.Mock;
  let cacheSpy: jest.Mock;
  let dbgSpy: jest.Mock;
  let whichSpy: jest.Mock;
  let existsSpy: jest.SpiedFunction<typeof fs.existsSync>;
  let readFileSyncSpy: jest.Mock;
  let mkdirpSpy: jest.Mock;
  let execSpy: jest.SpiedFunction<typeof cp.execSync>;
  let authSpy: jest.Mock;
  let isCacheActionAvailable: jest.Mock;
  let getExecOutputSpy: jest.Mock;
  let getJsonSpy: jest.Mock;

  beforeEach(() => {
    // @actions/core
    console.log('::stop-commands::stoptoken'); // Disable executing of runner commands when running tests in actions
    process.env['GITHUB_PATH'] = ''; // Stub out ENV file functionality so we can verify it writes to standard out
    process.env['GITHUB_OUTPUT'] = ''; // Stub out ENV file functionality so we can verify it writes to standard out
    inputs = {};
    inSpy = core.getInput as jest.Mock;
    inSpy.mockImplementation((name: any) => inputs[name]);

    // node
    os = {};
    platSpy = jest.spyOn(osm, 'platform');
    platSpy.mockImplementation(() => os['platform']);
    archSpy = jest.spyOn(osm, 'arch');
    archSpy.mockImplementation(() => os['arch']);
    execSpy = jest.spyOn(cp, 'execSync');

    // @actions/tool-cache
    findSpy = tc.find as jest.Mock;
    findAllVersionsSpy = tc.findAllVersions as jest.Mock;
    dlSpy = tc.downloadTool as jest.Mock;
    exSpy = tc.extractTar as jest.Mock;
    cacheSpy = tc.cacheDir as jest.Mock;
    getManifestSpy = tc.getManifestFromRepo as jest.Mock;

    // Restore findFromManifest after clearMocks.
    // In ESM, the real tc.findFromManifest uses os.platform() from its own
    // module namespace, which jest.spyOn on our os import cannot override.
    // So we provide a minimal reimplementation that uses the test's os var.
    (tc.findFromManifest as jest.Mock).mockImplementation(
      async (versionSpec: any, stable: any, manifest: any, archFilter: any) => {
        const arch = archFilter || os['arch'] || 'x64';
        const plat = os['platform'] || process.platform;
        const semverModule = await import('semver');
        for (const rel of manifest || []) {
          if (
            semverModule.default.satisfies(rel.version, versionSpec, {
              includePrerelease: true
            }) &&
            rel.stable === stable
          ) {
            const file = rel.files.find(
              (f: any) => f.arch === arch && f.platform === plat
            );
            if (file) return {...rel, files: [file]};
          }
        }
        return undefined;
      }
    );

    // http-client
    getJsonSpy = _mockGetJson;
    (httpm.HttpClient as jest.Mock).mockImplementation(() => ({
      getJson: _mockGetJson
    }));

    // io
    whichSpy = io.which as jest.Mock;
    existsSpy = jest.spyOn(fs, 'existsSync');
    mkdirpSpy = io.mkdirP as jest.Mock;

    // @actions/tool-cache
    isCacheActionAvailable = cache.isFeatureAvailable as jest.Mock;

    // disable authentication portion for installer tests
    authSpy = auth.configAuthentication as jest.Mock;
    authSpy.mockImplementation(() => {});

    // gets
    getManifestSpy.mockImplementation(() => <IToolRelease[]>nodeTestManifest);

    getJsonSpy.mockImplementation((url: any) => {
      let res: any;
      if (url.includes('/rc')) {
        res = <INodeVersion[]>nodeTestDistRc;
      } else if (url.includes('/nightly')) {
        res = <INodeVersion[]>nodeTestDistNightly;
      } else {
        res = <INodeVersion[]>nodeTestDist;
      }

      return {result: res};
    });

    // writes
    cnSpy = jest.spyOn(process.stdout, 'write');
    logSpy = core.info as jest.Mock;
    dbgSpy = core.debug as jest.Mock;
    warningSpy = core.warning as jest.Mock;
    addPathSpy = core.addPath as jest.Mock;
    setFailedSpy = core.setFailed as jest.Mock;
    cnSpy.mockImplementation(() => true);
    logSpy.mockImplementation(() => {});
    dbgSpy.mockImplementation(() => {});
    warningSpy.mockImplementation(() => {});

    // @actions/exec
    getExecOutputSpy = exec.getExecOutput as jest.Mock;
    getExecOutputSpy.mockImplementation(async () => ({
      stdout: 'v16.15.0',
      stderr: '',
      exitCode: 0
    }));
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
    //jest.restoreAllMocks();
  });

  afterAll(async () => {
    console.log('::stoptoken::'); // Re-enable executing of runner commands when running tests in actions
    jest.restoreAllMocks();
  }, 100000);

  //--------------------------------------------------
  // Manifest find tests
  //--------------------------------------------------
  it.each([
    ['12.16.2', 'darwin', '12.16.2', 'Erbium'],
    ['12', 'linux', '12.16.2', 'Erbium'],
    ['10', 'win32', '10.20.1', 'Dubnium'],
    ['*', 'linux', '14.0.0', 'Fermium']
  ])(
    'can find %s from manifest on %s',
    async (versionSpec, platform, expectedVersion, expectedLts) => {
      os.platform = platform;
      os.arch = 'x64';
      const versions: IToolRelease[] | null = await tc.getManifestFromRepo(
        'actions',
        'node-versions',
        'mocktoken'
      );
      expect(versions).toBeDefined();
      const match = await tc.findFromManifest(
        versionSpec,
        true,
        versions,
        // `archFilter` parameter of `findFromManifest` function has a default value of `os.arch()`.
        // However, default parameters cannot be replaced by `spyOn` function of Jest.
        osm.arch()
      );
      expect(match).toBeDefined();
      expect(match?.version).toBe(expectedVersion);
      expect((match as any).lts).toBe(expectedLts);
    }
  );

  //--------------------------------------------------
  // Found in cache tests
  //--------------------------------------------------

  it('finds version in cache with stable true', async () => {
    inputs['node-version'] = '12';
    inputs.stable = 'true';

    const toolPath = path.normalize('/cache/node/12.16.1/x64');
    findSpy.mockImplementation(() => toolPath);
    await main.run();

    expect(logSpy).toHaveBeenCalledWith(`Found in cache @ ${toolPath}`);
  });

  it('finds version in cache with stable not supplied', async () => {
    inputs['node-version'] = '12';

    inSpy.mockImplementation((name: any) => inputs[name]);

    const toolPath = path.normalize('/cache/node/12.16.1/x64');
    findSpy.mockImplementation(() => toolPath);
    await main.run();

    expect(logSpy).toHaveBeenCalledWith(`Found in cache @ ${toolPath}`);
  });

  it('finds version in cache and adds it to the path', async () => {
    inputs['node-version'] = '12';

    inSpy.mockImplementation((name: any) => inputs[name]);

    const toolPath = path.normalize('/cache/node/12.16.1/x64');
    findSpy.mockImplementation(() => toolPath);
    await main.run();

    const expPath = path.join(toolPath, 'bin');
    expect(addPathSpy).toHaveBeenCalledWith(expPath);
  });

  it('handles unhandled find error and reports error', async () => {
    const errMsg = 'unhandled error message';
    inputs['node-version'] = '12';

    findSpy.mockImplementation(() => {
      throw new Error(errMsg);
    });

    await main.run();

    expect(setFailedSpy).toHaveBeenCalledWith(errMsg);
  });

  //--------------------------------------------------
  // Manifest tests
  //--------------------------------------------------

  it('downloads a version from a manifest match', async () => {
    os.platform = 'linux';
    os.arch = 'x64';

    // a version which is in the manifest
    const versionSpec = '12.16.2';
    const resolvedVersion = versionSpec;

    inputs['node-version'] = versionSpec;
    inputs['token'] = 'faketoken';

    const expectedUrl =
      'https://github.com/actions/node-versions/releases/download/12.16.2-20200507.95/node-12.16.2-linux-x64.tar.gz';

    // ... but not in the local cache
    findSpy.mockImplementation(() => '');

    dlSpy.mockImplementation(async () => '/some/temp/path');
    const toolPath = path.normalize('/cache/node/12.16.2/x64');
    exSpy.mockImplementation(async () => '/some/other/temp/path');
    cacheSpy.mockImplementation(async () => toolPath);
    whichSpy.mockImplementation((cmd: any) => {
      return `some/${cmd}/path`;
    });
    getExecOutputSpy.mockImplementation(async (cmd: string) => ({
      stdout:
        cmd === 'node'
          ? `v${resolvedVersion}`
          : cmd === 'npm'
            ? '11.12.1'
            : '4.17.1',
      stderr: '',
      exitCode: 0
    }));

    await main.run();

    const expPath = path.join(toolPath, 'bin');

    expect(getExecOutputSpy).toHaveBeenCalledWith(
      'node',
      ['--version'],
      expect.anything()
    );
    expect(getExecOutputSpy).toHaveBeenCalledWith(
      'npm',
      ['--version'],
      expect.anything()
    );
    expect(getExecOutputSpy).toHaveBeenCalledWith(
      'yarn',
      ['--version'],
      expect.anything()
    );
    expect(dlSpy).toHaveBeenCalled();
    expect(exSpy).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(
      `Acquiring ${resolvedVersion} - ${os.arch} from ${expectedUrl}`
    );
    expect(logSpy).toHaveBeenCalledWith(
      `Attempting to download ${versionSpec}...`
    );
    expect(addPathSpy).toHaveBeenCalledWith(expPath);
  });

  it('falls back to a version from node dist from mirror', async () => {
    os.platform = 'linux';
    os.arch = 'x64';

    // a version which is not in the manifest but is in node dist
    const versionSpec = '11.15.0';
    const mirror = 'https://my_mirror_url';
    inputs['node-version'] = versionSpec;
    inputs['token'] = 'faketoken';
    inputs['mirror'] = mirror;
    inputs['mirror-token'] = 'faketoken';

    // ... but not in the local cache
    findSpy.mockImplementation(() => '');

    dlSpy.mockImplementation(async () => '/some/temp/path');
    const toolPath = path.normalize('/cache/node/11.15.0/x64');
    exSpy.mockImplementation(async () => '/some/other/temp/path');
    cacheSpy.mockImplementation(async () => toolPath);

    await main.run();

    const expPath = path.join(toolPath, 'bin');

    expect(getManifestSpy).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(
      `Attempting to download ${versionSpec}...`
    );
    expect(logSpy).toHaveBeenCalledWith(
      `Not found in manifest. Falling back to download directly from ${mirror}`
    );
    expect(dlSpy).toHaveBeenCalled();
    expect(exSpy).toHaveBeenCalled();
    expect(addPathSpy).toHaveBeenCalledWith(expPath);
  });

  it('falls back to a version from node dist', async () => {
    os.platform = 'linux';
    os.arch = 'x64';

    // a version which is not in the manifest but is in node dist
    const versionSpec = '11.15.0';

    inputs['node-version'] = versionSpec;
    inputs['token'] = 'faketoken';

    // ... but not in the local cache
    findSpy.mockImplementation(() => '');

    dlSpy.mockImplementation(async () => '/some/temp/path');
    const toolPath = path.normalize('/cache/node/11.15.0/x64');
    exSpy.mockImplementation(async () => '/some/other/temp/path');
    cacheSpy.mockImplementation(async () => toolPath);

    await main.run();

    const expPath = path.join(toolPath, 'bin');

    expect(getManifestSpy).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(
      `Attempting to download ${versionSpec}...`
    );
    expect(logSpy).toHaveBeenCalledWith(
      'Not found in manifest. Falling back to download directly from Node'
    );
    expect(dlSpy).toHaveBeenCalled();
    expect(exSpy).toHaveBeenCalled();
    expect(addPathSpy).toHaveBeenCalledWith(expPath);
  });

  it('does not find a version that does not exist', async () => {
    os.platform = 'linux';
    os.arch = 'x64';

    const versionSpec = '9.99.9';
    inputs['node-version'] = versionSpec;

    findSpy.mockImplementation(() => '');
    await main.run();

    expect(logSpy).toHaveBeenCalledWith(
      'Not found in manifest. Falling back to download directly from Node'
    );
    expect(logSpy).toHaveBeenCalledWith(
      `Attempting to download ${versionSpec}...`
    );
    expect(setFailedSpy).toHaveBeenCalledWith(
      `Unable to find Node version '${versionSpec}' for platform ${os.platform} and architecture ${os.arch}.`
    );
  });

  it('reports a failed download', async () => {
    const errMsg = 'unhandled download message';
    os.platform = 'linux';
    os.arch = 'x64';

    // a version which is in the manifest
    const versionSpec = '12.16.2';
    const resolvedVersion = versionSpec;

    inputs['node-version'] = versionSpec;
    inputs['token'] = 'faketoken';

    findSpy.mockImplementation(() => '');
    dlSpy.mockImplementation(() => {
      throw new Error(errMsg);
    });
    await main.run();

    expect(setFailedSpy).toHaveBeenCalledWith(errMsg);
  });

  it('reports when download failed but version exists', async () => {
    os.platform = 'linux';
    os.arch = 'x64';

    // a version which is not in the manifest but is in node dist
    const versionSpec = '11.15.0';

    inputs['node-version'] = versionSpec;
    inputs['token'] = 'faketoken';

    // ... but not in the local cache
    findSpy.mockImplementation(() => '');

    dlSpy.mockImplementationOnce(async () => {
      throw new tc.HTTPError(404);
    });

    await main.run();

    expect(getManifestSpy).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(
      `Attempting to download ${versionSpec}...`
    );
    expect(logSpy).toHaveBeenCalledWith(
      'Not found in manifest. Falling back to download directly from Node'
    );
    expect(dlSpy).toHaveBeenCalled();
    expect(warningSpy).toHaveBeenCalledWith(
      `Node version ${versionSpec} for platform ${os.platform} and architecture ${os.arch} was found but failed to download. ` +
        'This usually happens when downloadable binaries are not fully updated at https://nodejs.org/. ' +
        'To resolve this issue you may either fall back to the older version or try again later.'
    );
  });

  it('acquires specified architecture of node', async () => {
    for (const {arch, version, osSpec} of [
      {arch: 'x86', version: '12.16.2', osSpec: 'win32'},
      {arch: 'x86', version: '14.0.0', osSpec: 'win32'}
    ]) {
      os.platform = osSpec;
      os.arch = arch;
      const fileExtension = os.platform === 'win32' ? '7z' : 'tar.gz';
      const platform = {
        linux: 'linux',
        darwin: 'darwin',
        win32: 'win'
      }[os.platform];

      inputs['node-version'] = version;
      inputs['architecture'] = arch;
      inputs['token'] = 'faketoken';

      const expectedUrl =
        arch === 'x64'
          ? `https://github.com/actions/node-versions/releases/download/${version}/node-${version}-${platform}-${arch}.zip`
          : `https://nodejs.org/dist/v${version}/node-v${version}-${platform}-${arch}.${fileExtension}`;

      // ... but not in the local cache
      findSpy.mockImplementation(() => '');

      dlSpy.mockImplementation(async () => '/some/temp/path');
      const toolPath = path.normalize(`/cache/node/${version}/${arch}`);
      exSpy.mockImplementation(async () => '/some/other/temp/path');
      cacheSpy.mockImplementation(async () => toolPath);

      await main.run();
      expect(dlSpy).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(
        `Acquiring ${version} - ${arch} from ${expectedUrl}`
      );
    }
  }, 100000);

  describe('check-latest flag', () => {
    it('use local version and dont check manifest if check-latest is not specified', async () => {
      os.platform = 'linux';
      os.arch = 'x64';

      inputs['node-version'] = '12';
      inputs['check-latest'] = 'false';

      const toolPath = path.normalize('/cache/node/12.16.1/x64');
      findSpy.mockReturnValue(toolPath);
      await main.run();

      expect(logSpy).toHaveBeenCalledWith(`Found in cache @ ${toolPath}`);
      expect(logSpy).not.toHaveBeenCalledWith(
        'Attempt to resolve the latest version from manifest...'
      );
      expect(dbgSpy).not.toHaveBeenCalledWith('No manifest cached');
      expect(dbgSpy).not.toHaveBeenCalledWith(
        'Getting manifest from actions/node-versions@main'
      );
    });

    it('check latest version and resolve it from local cache', async () => {
      os.platform = 'linux';
      os.arch = 'x64';

      inputs['node-version'] = '12';
      inputs['check-latest'] = 'true';

      const toolPath = path.normalize('/cache/node/12.16.2/x64');
      findSpy.mockReturnValue(toolPath);
      dlSpy.mockImplementation(async () => '/some/temp/path');
      exSpy.mockImplementation(async () => '/some/other/temp/path');
      cacheSpy.mockImplementation(async () => toolPath);

      await main.run();

      expect(logSpy).toHaveBeenCalledWith(
        'Attempt to resolve the latest version from manifest...'
      );
      expect(dbgSpy).toHaveBeenCalledWith('No manifest cached');
      expect(dbgSpy).toHaveBeenCalledWith(
        'Getting manifest from actions/node-versions@main'
      );
      expect(logSpy).toHaveBeenCalledWith("Resolved as '12.16.2'");
      expect(logSpy).toHaveBeenCalledWith(`Found in cache @ ${toolPath}`);
    });

    it('check latest version and install it from manifest', async () => {
      os.platform = 'linux';
      os.arch = 'x64';

      inputs['node-version'] = '12';
      inputs['check-latest'] = 'true';

      findSpy.mockImplementation(() => '');
      dlSpy.mockImplementation(async () => '/some/temp/path');
      const toolPath = path.normalize('/cache/node/12.16.2/x64');
      exSpy.mockImplementation(async () => '/some/other/temp/path');
      cacheSpy.mockImplementation(async () => toolPath);
      const expectedUrl =
        'https://github.com/actions/node-versions/releases/download/12.16.2-20200507.95/node-12.16.2-linux-x64.tar.gz';

      await main.run();

      expect(logSpy).toHaveBeenCalledWith(
        'Attempt to resolve the latest version from manifest...'
      );
      expect(dbgSpy).toHaveBeenCalledWith('No manifest cached');
      expect(dbgSpy).toHaveBeenCalledWith(
        'Getting manifest from actions/node-versions@main'
      );
      expect(logSpy).toHaveBeenCalledWith("Resolved as '12.16.2'");
      expect(logSpy).toHaveBeenCalledWith(
        `Acquiring 12.16.2 - ${os.arch} from ${expectedUrl}`
      );
      expect(logSpy).toHaveBeenCalledWith('Extracting ...');
    });

    it('fallback to dist if version if not found in manifest', async () => {
      os.platform = 'linux';
      os.arch = 'x64';

      // a version which is not in the manifest but is in node dist
      const versionSpec = '11';

      inputs['node-version'] = versionSpec;
      inputs['check-latest'] = 'true';
      inputs['token'] = 'faketoken';

      // ... but not in the local cache
      findSpy.mockImplementation(() => '');

      dlSpy.mockImplementation(async () => '/some/temp/path');
      const toolPath = path.normalize('/cache/node/11.11.0/x64');
      exSpy.mockImplementation(async () => '/some/other/temp/path');
      cacheSpy.mockImplementation(async () => toolPath);

      await main.run();

      const expPath = path.join(toolPath, 'bin');

      expect(dlSpy).toHaveBeenCalled();
      expect(exSpy).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(
        'Attempt to resolve the latest version from manifest...'
      );
      expect(dbgSpy).toHaveBeenCalledWith('No manifest cached');
      expect(dbgSpy).toHaveBeenCalledWith(
        'Getting manifest from actions/node-versions@main'
      );
      expect(logSpy).toHaveBeenCalledWith(
        `Failed to resolve version ${versionSpec} from manifest`
      );
      expect(logSpy).toHaveBeenCalledWith(
        `Attempting to download ${versionSpec}...`
      );
      expect(addPathSpy).toHaveBeenCalledWith(expPath);
    });

    it('fallback to dist if manifest is not available', async () => {
      os.platform = 'linux';
      os.arch = 'x64';

      // a version which is not in the manifest but is in node dist
      const versionSpec = '12';

      inputs['node-version'] = versionSpec;
      inputs['check-latest'] = 'true';
      inputs['token'] = 'faketoken';

      // ... but not in the local cache
      findSpy.mockImplementation(() => '');
      getManifestSpy.mockImplementation(() => {
        throw new Error('Unable to download manifest');
      });

      dlSpy.mockImplementation(async () => '/some/temp/path');
      const toolPath = path.normalize('/cache/node/12.11.0/x64');
      exSpy.mockImplementation(async () => '/some/other/temp/path');
      cacheSpy.mockImplementation(async () => toolPath);

      await main.run();

      const expPath = path.join(toolPath, 'bin');

      expect(dlSpy).toHaveBeenCalled();
      expect(exSpy).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(
        'Attempt to resolve the latest version from manifest...'
      );
      expect(logSpy).toHaveBeenCalledWith(
        'Unable to resolve version from manifest...'
      );
      expect(logSpy).toHaveBeenCalledWith(
        `Failed to resolve version ${versionSpec} from manifest`
      );
      expect(logSpy).toHaveBeenCalledWith(
        `Attempting to download ${versionSpec}...`
      );
      expect(addPathSpy).toHaveBeenCalledWith(expPath);
    }, 10000);
  });

  describe('LTS version', () => {
    beforeEach(() => {
      os.platform = 'linux';
      os.arch = 'x64';
      inputs.stable = 'true';
    });

    it.each([
      ['erbium', '12.16.2'],
      ['*', '14.0.0'],
      ['-1', '12.16.2']
    ])(
      'find latest LTS version and resolve it from local cache (lts/%s)',
      async (lts, expectedVersion) => {
        // arrange
        inputs['node-version'] = `lts/${lts}`;

        const toolPath = path.normalize(`/cache/node/${expectedVersion}/x64`);
        findSpy.mockReturnValue(toolPath);

        // act
        await main.run();

        // assert
        expect(logSpy).toHaveBeenCalledWith(
          'Attempt to resolve LTS alias from manifest...'
        );
        expect(dbgSpy).toHaveBeenCalledWith(
          'Getting manifest from actions/node-versions@main'
        );
        expect(dbgSpy).not.toHaveBeenCalledWith('No manifest cached');
        expect(dbgSpy).toHaveBeenCalledWith(
          `LTS alias '${lts}' for Node version 'lts/${lts}'`
        );
        expect(dbgSpy).toHaveBeenCalledWith(
          `Found LTS release '${expectedVersion}' for Node version 'lts/${lts}'`
        );
        expect(logSpy).toHaveBeenCalledWith(`Found in cache @ ${toolPath}`);
        expect(addPathSpy).toHaveBeenCalledWith(path.join(toolPath, 'bin'));
      }
    );

    it.each([
      [
        'erbium',
        '12.16.2',
        'https://github.com/actions/node-versions/releases/download/12.16.2-20200507.95/node-12.16.2-linux-x64.tar.gz'
      ],
      [
        '*',
        '14.0.0',
        'https://github.com/actions/node-versions/releases/download/14.0.0-20200507.99/node-14.0.0-linux-x64.tar.gz'
      ],
      [
        '-1',
        '12.16.2',
        'https://github.com/actions/node-versions/releases/download/12.16.2-20200507.95/node-12.16.2-linux-x64.tar.gz'
      ]
    ])(
      'find latest LTS version and install it from manifest (lts/%s)',
      async (lts, expectedVersion, expectedUrl) => {
        // arrange
        inputs['node-version'] = `lts/${lts}`;

        const toolPath = path.normalize(`/cache/node/${expectedVersion}/x64`);
        findSpy.mockImplementation(() => '');
        dlSpy.mockImplementation(async () => '/some/temp/path');
        exSpy.mockImplementation(async () => '/some/other/temp/path');
        cacheSpy.mockImplementation(async () => toolPath);
        const expectedMajor = expectedVersion.split('.')[0];

        // act
        await main.run();

        // assert
        expect(logSpy).toHaveBeenCalledWith(
          'Attempt to resolve LTS alias from manifest...'
        );
        expect(dbgSpy).toHaveBeenCalledWith(
          'Getting manifest from actions/node-versions@main'
        );
        expect(dbgSpy).not.toHaveBeenCalledWith('No manifest cached');
        expect(dbgSpy).toHaveBeenCalledWith(
          `LTS alias '${lts}' for Node version 'lts/${lts}'`
        );
        expect(dbgSpy).toHaveBeenCalledWith(
          `Found LTS release '${expectedVersion}' for Node version 'lts/${lts}'`
        );
        expect(logSpy).toHaveBeenCalledWith(
          `Attempting to download ${expectedMajor}...`
        );
        expect(logSpy).toHaveBeenCalledWith(
          `Acquiring ${expectedVersion} - ${os.arch} from ${expectedUrl}`
        );
        expect(logSpy).toHaveBeenCalledWith('Extracting ...');
        expect(logSpy).toHaveBeenCalledWith('Adding to the cache ...');
        expect(addPathSpy).toHaveBeenCalledWith(path.join(toolPath, 'bin'));
      }
    );

    it('fail with unable to parse LTS alias (lts/)', async () => {
      // arrange
      inputs['node-version'] = 'lts/';

      findSpy.mockImplementation(() => '');

      // act
      await main.run();

      // assert
      expect(logSpy).toHaveBeenCalledWith(
        'Attempt to resolve LTS alias from manifest...'
      );
      expect(dbgSpy).toHaveBeenCalledWith(
        'Getting manifest from actions/node-versions@main'
      );
      expect(setFailedSpy).toHaveBeenCalledWith(
        `Unable to parse LTS alias for Node version 'lts/'`
      );
    });

    it('fail to find LTS version (lts/unknown)', async () => {
      // arrange
      inputs['node-version'] = 'lts/unknown';

      findSpy.mockImplementation(() => '');

      // act
      await main.run();

      // assert
      expect(logSpy).toHaveBeenCalledWith(
        'Attempt to resolve LTS alias from manifest...'
      );
      expect(dbgSpy).toHaveBeenCalledWith(
        'Getting manifest from actions/node-versions@main'
      );
      expect(dbgSpy).toHaveBeenCalledWith(
        `LTS alias 'unknown' for Node version 'lts/unknown'`
      );
      expect(setFailedSpy).toHaveBeenCalledWith(
        `Unable to find LTS release 'unknown' for Node version 'lts/unknown'.`
      );
    });

    it('fail if manifest is not available', async () => {
      // arrange
      inputs['node-version'] = 'lts/erbium';

      // ... but not in the local cache
      findSpy.mockImplementation(() => '');
      getManifestSpy.mockImplementation(() => {
        throw new Error('Unable to download manifest');
      });

      // act
      await main.run();

      // assert
      expect(logSpy).toHaveBeenCalledWith(
        'Attempt to resolve LTS alias from manifest...'
      );
      expect(dbgSpy).toHaveBeenCalledWith(
        'Getting manifest from actions/node-versions@main'
      );
      expect(setFailedSpy).toHaveBeenCalledWith(
        `Failed to fetch a valid manifest after 3 attempts. Last error: Unable to download manifest`
      );
    }, 10000);
  });

  describe('latest alias syntax', () => {
    it.each(['latest', 'current', 'node'])(
      'download the %s version if alias is provided',
      async inputVersion => {
        // Arrange
        inputs['node-version'] = inputVersion;

        os.platform = 'darwin';
        os.arch = 'x64';

        findSpy.mockImplementation(() => '');
        getManifestSpy.mockImplementation(() => {
          throw new Error('Unable to download manifest');
        });

        // Act
        await main.run();

        // assert
        expect(logSpy).toHaveBeenCalledWith(
          'Failed to fetch a valid manifest after 3 attempts. Last error: Unable to download manifest'
        );

        expect(logSpy).toHaveBeenCalledWith('getting latest node version...');
      },
      10000
    );
  });

  describe('latest alias syntax from cache', () => {
    it.each(['latest', 'current', 'node'])(
      'download the %s version if alias is provided',
      async inputVersion => {
        // Arrange
        inputs['node-version'] = inputVersion;
        const expectedVersion = nodeTestDist[0];

        os.platform = 'darwin';
        os.arch = 'x64';

        const toolPath = path.normalize(
          `/cache/node/${expectedVersion.version}/x64`
        );
        findSpy.mockImplementation(() => toolPath);

        // Act
        await main.run();

        // assert

        expect(logSpy).toHaveBeenCalledWith('getting latest node version...');
        expect(logSpy).toHaveBeenCalledWith(`Found in cache @ ${toolPath}`);
      }
    );
  });

  it('acquires specified architecture of node from mirror', async () => {
    for (const {arch, version, osSpec} of [
      {arch: 'x86', version: '12.16.2', osSpec: 'win32'},
      {arch: 'x86', version: '14.0.0', osSpec: 'win32'}
    ]) {
      os.platform = osSpec;
      os.arch = arch;
      const fileExtension = os.platform === 'win32' ? '7z' : 'tar.gz';
      const platform = {
        linux: 'linux',
        darwin: 'darwin',
        win32: 'win'
      }[os.platform];
      inputs['node-version'] = version;
      inputs['architecture'] = arch;
      inputs['token'] = 'faketoken';
      inputs['mirror'] = 'https://my_mirror_url';
      inputs['mirror-token'] = 'faketoken';

      const expectedUrl =
        arch === 'x64'
          ? `https://github.com/actions/node-versions/releases/download/${version}/node-${version}-${platform}-${arch}.zip`
          : `https://my_mirror_url/dist/v${version}/node-v${version}-${platform}-${arch}.${fileExtension}`;

      // ... but not in the local cache
      findSpy.mockImplementation(() => '');

      dlSpy.mockImplementation(async () => '/some/temp/path');
      const toolPath = path.normalize(`/cache/node/${version}/${arch}`);
      exSpy.mockImplementation(async () => '/some/other/temp/path');
      cacheSpy.mockImplementation(async () => toolPath);

      await main.run();
      expect(dlSpy).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(
        `Acquiring ${version} - ${arch} from ${expectedUrl}`
      );
    }
  }, 100000);

  describe('manifest retry and validation', () => {
    beforeEach(() => {
      os.platform = 'linux';
      os.arch = 'x64';
      inputs['node-version'] = 'lts/erbium';
      findSpy.mockImplementation(() => '');
    });

    it('retries fetching the manifest and succeeds on a later attempt', async () => {
      let calls = 0;
      getManifestSpy.mockImplementation(() => {
        calls++;
        if (calls < 2) {
          throw new Error('transient network failure');
        }
        return <tc.IToolRelease[]>nodeTestManifest;
      });

      dlSpy.mockImplementation(async () => '/some/temp/path');
      const toolPath = path.normalize('/cache/node/12.16.2/x64');
      exSpy.mockImplementation(async () => '/some/other/temp/path');
      cacheSpy.mockImplementation(async () => toolPath);
      getExecOutputSpy.mockImplementation(async () => ({
        stdout: `v${path.basename(path.dirname(toolPath))}\n`,
        stderr: '',
        exitCode: 0
      }));

      await main.run();

      expect(calls).toBe(2);
      expect(logSpy).toHaveBeenCalledWith('Retrying to fetch the manifest...');
      expect(dbgSpy).toHaveBeenCalledWith(
        `Found LTS release '12.16.2' for Node version 'lts/erbium'`
      );
    }, 10000);

    it('rejects an empty manifest as invalid and retries', async () => {
      getManifestSpy.mockImplementation(() => []);

      await main.run();

      expect(getManifestSpy).toHaveBeenCalledTimes(3);
      expect(setFailedSpy).toHaveBeenCalledWith(
        `Failed to fetch a valid manifest after 3 attempts. Last error: The manifest fetched is empty, truncated, or does not contain any valid tool release entries.`
      );
    }, 10000);
  });

  describe('node version verification', () => {
    beforeEach(() => {
      os.platform = 'linux';
      os.arch = 'x64';
      inputs['node-version'] = '12';
    });

    it('fails when the installed node version does not match the expected version', async () => {
      const toolPath = path.normalize('/cache/node/12.16.1/x64');
      findSpy.mockReturnValue(toolPath);
      getExecOutputSpy.mockImplementation(async () => ({
        stdout: 'v22.22.3\n',
        stderr: '',
        exitCode: 0
      }));

      await main.run();

      expect(setFailedSpy).toHaveBeenCalledWith(
        `Node v12.16.1 installation failed, likely due to an incomplete or corrupted download.`
      );
    });

    it('fails when the node executable cannot be invoked', async () => {
      const toolPath = path.normalize('/cache/node/12.16.1/x64');
      findSpy.mockReturnValue(toolPath);
      getExecOutputSpy.mockImplementation(async () => {
        throw new Error('node not found');
      });

      await main.run();

      expect(setFailedSpy).toHaveBeenCalledWith(
        `Node installation failed. Node may not be installed or not on PATH: node not found`
      );
    });
  });
});
