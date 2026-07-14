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
  let getDistSpy: jest.Mock;
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
  let parseNodeVersionSpy: jest.Mock;
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
      } else if (url.includes('/v8-canary')) {
        res = <INodeVersion[]>nodeV8CanaryTestDist;
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
    getExecOutputSpy.mockImplementation(() => 'v16.15.0');
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
  // Found in cache tests
  //--------------------------------------------------

  it('finds version in cache with stable true', async () => {
    inputs['node-version'] = '20-v8-canary';
    os['arch'] = 'x64';
    inputs.stable = 'true';

    const toolPath = path.normalize(
      '/cache/node/20.0.0-v8-canary20221103f7e2421e91/x64'
    );
    findSpy.mockImplementation(() => toolPath);
    findAllVersionsSpy.mockImplementation(() => [
      '20.0.0-v8-canary20221103f7e2421e91',
      '20.0.0-v8-canary20221030fefe1c0879',
      '19.0.0-v8-canary202210172ec229fc56',
      '20.0.0-v8-canary2022102310ff1e5a8d'
    ]);
    await main.run();

    expect(findSpy).toHaveBeenCalledWith(
      'node',
      '20.0.0-v8-canary20221103f7e2421e91',
      'x64'
    );
    expect(logSpy).toHaveBeenCalledWith(`Found in cache @ ${toolPath}`);
  });

  it('finds version in cache and adds it to the path', async () => {
    inputs['node-version'] = '20-v8-canary';
    os['arch'] = 'x64';

    inSpy.mockImplementation((name: any) => inputs[name]);

    const toolPath = path.normalize(
      '/cache/node/20.0.0-v8-canary20221103f7e2421e91/x64'
    );
    findSpy.mockImplementation(() => toolPath);
    findAllVersionsSpy.mockImplementation(() => [
      '20.0.0-v8-canary20221103f7e2421e91',
      '20.0.0-v8-canary20221030fefe1c0879',
      '19.0.0-v8-canary202210172ec229fc56',
      '20.0.0-v8-canary2022102310ff1e5a8d'
    ]);
    await main.run();

    const expPath = path.join(toolPath, 'bin');
    expect(addPathSpy).toHaveBeenCalledWith(expPath);
  });

  it('handles unhandled find error and reports error', async () => {
    os.platform = 'linux';
    const errMsg = 'unhandled error message';
    inputs['node-version'] = '20.0.0-v8-canary20221103f7e2421e91';

    findSpy.mockImplementation(() => {
      throw new Error(errMsg);
    });
    findAllVersionsSpy.mockImplementation(() => [
      '20.0.0-v8-canary20221103f7e2421e91',
      '20.0.0-v8-canary20221030fefe1c0879',
      '19.0.0-v8-canary202210172ec229fc56',
      '20.0.0-v8-canary2022102310ff1e5a8d'
    ]);

    await main.run();

    expect(setFailedSpy).toHaveBeenCalledWith(errMsg);
  });

  //--------------------------------------------------
  // Manifest tests
  //--------------------------------------------------
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
    const toolPath = path.normalize('/cache/node/11.11.0/x64');
    exSpy.mockImplementation(async () => '/some/other/temp/path');
    cacheSpy.mockImplementation(async () => toolPath);

    await main.run();

    const expPath = path.join(toolPath, 'bin');

    expect(dlSpy).toHaveBeenCalled();
    expect(exSpy).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(
      'Not found in manifest. Falling back to download directly from Node'
    );
    expect(logSpy).toHaveBeenCalledWith(
      `Attempting to download ${versionSpec}...`
    );
    expect(addPathSpy).toHaveBeenCalledWith(expPath);
  });

  it('does not find a version that does not exist', async () => {
    os.platform = 'linux';
    os.arch = 'x64';

    const versionSpec = '23.0.0-v8-canary20221103f7e2421e91';
    inputs['node-version'] = versionSpec;

    findSpy.mockImplementation(() => '');
    findAllVersionsSpy.mockImplementation(() => [
      '20.0.0-v8-canary20221103f7e2421e91',
      '20.0.0-v8-canary20221030fefe1c0879',
      '19.0.0-v8-canary202210172ec229fc56',
      '20.0.0-v8-canary2022102310ff1e5a8d'
    ]);
    await main.run();

    expect(setFailedSpy).toHaveBeenCalledWith(
      `Unable to find Node version '${versionSpec}' for platform ${os.platform} and architecture ${os.arch}.`
    );
  });

  it('reports a failed download', async () => {
    const errMsg = 'unhandled download message';
    os.platform = 'linux';
    os.arch = 'x64';

    // a version which is in the manifest
    const versionSpec = '19.0.0-v8-canary';

    inputs['node-version'] = versionSpec;
    inputs['token'] = 'faketoken';

    findSpy.mockImplementation(() => '');
    findAllVersionsSpy.mockImplementation(() => [
      '20.0.0-v8-canary20221103f7e2421e91',
      '20.0.0-v8-canary20221030fefe1c0879',
      '20.0.0-v8-canary2022102310ff1e5a8d'
    ]);
    dlSpy.mockImplementation(() => {
      throw new Error(errMsg);
    });
    await main.run();

    expect(setFailedSpy).toHaveBeenCalledWith(errMsg);
  });

  it('acquires specified architecture of node', async () => {
    for (const {arch, version, osSpec} of [
      {
        arch: 'x86',
        version: '20.0.0-v8-canary20221022e83bcb6c41',
        osSpec: 'win32'
      },
      {
        arch: 'x86',
        version: '20.0.0-v8-canary20221103f7e2421e91',
        osSpec: 'win32'
      }
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

      const expectedUrl = `https://nodejs.org/download/v8-canary/v${version}/node-v${version}-${platform}-${arch}.${fileExtension}`;

      // ... but not in the local cache
      findSpy.mockImplementation(() => '');
      findAllVersionsSpy.mockImplementation(() => []);

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

  describe('nightly versions', () => {
    it.each([
      [
        '20.0.0-v8-canary',
        '20.0.0-v8-canary20221103f7e2421e91',
        'https://nodejs.org/download/v8-canary/v20.0.0-v8-canary20221103f7e2421e91/node-v20.0.0-v8-canary20221103f7e2421e91-linux-x64.tar.gz'
      ],
      [
        '20-v8-canary',
        '20.0.0-v8-canary20221103f7e2421e91',
        'https://nodejs.org/download/v8-canary/v20.0.0-v8-canary20221103f7e2421e91/node-v20.0.0-v8-canary20221103f7e2421e91-linux-x64.tar.gz'
      ],
      [
        '19.0.0-v8-canary',
        '19.0.0-v8-canary202210187d6960f23f',
        'https://nodejs.org/download/v8-canary/v19.0.0-v8-canary202210187d6960f23f/node-v19.0.0-v8-canary202210187d6960f23f-linux-x64.tar.gz'
      ],
      [
        '19-v8-canary',
        '19.0.0-v8-canary202210187d6960f23f',
        'https://nodejs.org/download/v8-canary/v19.0.0-v8-canary202210187d6960f23f/node-v19.0.0-v8-canary202210187d6960f23f-linux-x64.tar.gz'
      ],
      [
        '19.0.0-v8-canary202210187d6960f23f',
        '19.0.0-v8-canary202210187d6960f23f',
        'https://nodejs.org/download/v8-canary/v19.0.0-v8-canary202210187d6960f23f/node-v19.0.0-v8-canary202210187d6960f23f-linux-x64.tar.gz'
      ]
    ])(
      'finds the versions in the index.json and installs it',
      async (input, expectedVersion, expectedUrl) => {
        const toolPath = path.normalize(`/cache/node/${expectedVersion}/x64`);

        findSpy.mockImplementation(() => '');
        findAllVersionsSpy.mockImplementation(() => []);
        dlSpy.mockImplementation(async () => '/some/temp/path');
        exSpy.mockImplementation(async () => '/some/other/temp/path');
        cacheSpy.mockImplementation(async () => toolPath);

        inputs['node-version'] = input;
        os['arch'] = 'x64';
        os['platform'] = 'linux';
        // act
        await main.run();

        // assert
        expect(logSpy).toHaveBeenCalledWith(
          `Acquiring ${expectedVersion} - ${os.arch} from ${expectedUrl}`
        );
        expect(logSpy).toHaveBeenCalledWith('Extracting ...');
        expect(logSpy).toHaveBeenCalledWith('Adding to the cache ...');
        expect(addPathSpy).toHaveBeenCalledWith(path.join(toolPath, 'bin'));
      }
    );

    it.each([
      [
        '20.0.0-v8-canary20221103f7e2421e91',
        '20.0.0-v8-canary20221103f7e2421e91'
      ],
      ['20.0.0-v8-canary', '20.0.0-v8-canary20221103f7e2421e91'],
      ['20-v8-canary', '20.0.0-v8-canary20221103f7e2421e91']
    ])(
      'finds the %s version in the hostedToolcache',
      async (input, expectedVersion) => {
        const toolPath = path.normalize(`/cache/node/${expectedVersion}/x64`);
        findSpy.mockReturnValue(toolPath);
        findAllVersionsSpy.mockReturnValue([
          '20.0.0-v8-canary20221103f7e2421e91',
          '20.0.0-v8-canary20221030fefe1c0879',
          '19.0.0-v8-canary202210172ec229fc56',
          '20.0.0-v8-canary2022102310ff1e5a8d'
        ]);

        inputs['node-version'] = input;
        os['arch'] = 'x64';
        os['platform'] = 'linux';

        // act
        await main.run();

        // assert
        expect(findAllVersionsSpy).toHaveBeenCalled();
        expect(logSpy).toHaveBeenCalledWith(`Found in cache @ ${toolPath}`);
        expect(addPathSpy).toHaveBeenCalledWith(path.join(toolPath, 'bin'));
      }
    );

    it.each([
      [
        '20.0.0-v8-canary',
        '20.0.0-v8-canary20221103f7e2421e91',
        '20.0.0-v8-canary20221030fefe1c0879',
        'https://nodejs.org/download/v8-canary/v20.0.0-v8-canary20221103f7e2421e91/node-v20.0.0-v8-canary20221103f7e2421e91-linux-x64.tar.gz'
      ],
      [
        '20-v8-canary',
        '20.0.0-v8-canary20221103f7e2421e91',
        '20.0.0-v8-canary20221030fefe1c0879',
        'https://nodejs.org/download/v8-canary/v20.0.0-v8-canary20221103f7e2421e91/node-v20.0.0-v8-canary20221103f7e2421e91-linux-x64.tar.gz'
      ],
      [
        '19.0.0-v8-canary',
        '19.0.0-v8-canary202210187d6960f23f',
        '19.0.0-v8-canary202210172ec229fc56',
        'https://nodejs.org/download/v8-canary/v19.0.0-v8-canary202210187d6960f23f/node-v19.0.0-v8-canary202210187d6960f23f-linux-x64.tar.gz'
      ],
      [
        '19-v8-canary',
        '19.0.0-v8-canary202210187d6960f23f',
        '19.0.0-v8-canary202210172ec229fc56',
        'https://nodejs.org/download/v8-canary/v19.0.0-v8-canary202210187d6960f23f/node-v19.0.0-v8-canary202210187d6960f23f-linux-x64.tar.gz'
      ]
    ])(
      'get %s version from dist if check-latest is true',
      async (input, expectedVersion, foundVersion, expectedUrl) => {
        const foundToolPath = path.normalize(`/cache/node/${foundVersion}/x64`);
        const toolPath = path.normalize(`/cache/node/${expectedVersion}/x64`);

        inputs['node-version'] = input;
        inputs['check-latest'] = 'true';
        os['arch'] = 'x64';
        os['platform'] = 'linux';

        findSpy.mockReturnValue(foundToolPath);
        findAllVersionsSpy.mockReturnValue([
          '20.0.0-v8-canary20221030fefe1c0879',
          '19.0.0-v8-canary202210172ec229fc56',
          '20.0.0-v8-canary2022102310ff1e5a8d'
        ]);
        dlSpy.mockImplementation(async () => '/some/temp/path');
        exSpy.mockImplementation(async () => '/some/other/temp/path');
        cacheSpy.mockImplementation(async () => toolPath);

        // act
        await main.run();

        // assert
        expect(findAllVersionsSpy).toHaveBeenCalled();
        expect(logSpy).toHaveBeenCalledWith(
          `Acquiring ${expectedVersion} - ${os.arch} from ${expectedUrl}`
        );
        expect(logSpy).toHaveBeenCalledWith('Extracting ...');
        expect(logSpy).toHaveBeenCalledWith('Adding to the cache ...');
        expect(addPathSpy).toHaveBeenCalledWith(path.join(toolPath, 'bin'));
      }
    );

    it.each([
      [
        '20.0.0-v8-canary',
        '20.0.0-v8-canary20221103f7e2421e91',
        '20.0.0-v8-canary20221030fefe1c0879',
        'https://my_mirror.org/download/v8-canary/v20.0.0-v8-canary20221103f7e2421e91/node-v20.0.0-v8-canary20221103f7e2421e91-linux-x64.tar.gz'
      ],
      [
        '20-v8-canary',
        '20.0.0-v8-canary20221103f7e2421e91',
        '20.0.0-v8-canary20221030fefe1c0879',
        'https://my_mirror.org/download/v8-canary/v20.0.0-v8-canary20221103f7e2421e91/node-v20.0.0-v8-canary20221103f7e2421e91-linux-x64.tar.gz'
      ],
      [
        '19.0.0-v8-canary',
        '19.0.0-v8-canary202210187d6960f23f',
        '19.0.0-v8-canary202210172ec229fc56',
        'https://my_mirror.org/download/v8-canary/v19.0.0-v8-canary202210187d6960f23f/node-v19.0.0-v8-canary202210187d6960f23f-linux-x64.tar.gz'
      ],
      [
        '19-v8-canary',
        '19.0.0-v8-canary202210187d6960f23f',
        '19.0.0-v8-canary202210172ec229fc56',
        'https://my_mirror.org/download/v8-canary/v19.0.0-v8-canary202210187d6960f23f/node-v19.0.0-v8-canary202210187d6960f23f-linux-x64.tar.gz'
      ]
    ])(
      'get %s version from dist if check-latest is true',
      async (input, expectedVersion, foundVersion, expectedUrl) => {
        const foundToolPath = path.normalize(`/cache/node/${foundVersion}/x64`);
        const toolPath = path.normalize(`/cache/node/${expectedVersion}/x64`);

        inputs['node-version'] = input;
        inputs['check-latest'] = 'true';
        os['arch'] = 'x64';
        os['platform'] = 'linux';
        inputs['mirror'] = 'https://my_mirror.org';
        inputs['mirror-token'] = 'faketoken';

        findSpy.mockReturnValue(foundToolPath);
        findAllVersionsSpy.mockReturnValue([
          '20.0.0-v8-canary20221030fefe1c0879',
          '19.0.0-v8-canary202210172ec229fc56',
          '20.0.0-v8-canary2022102310ff1e5a8d'
        ]);
        dlSpy.mockImplementation(async () => '/some/temp/path');
        exSpy.mockImplementation(async () => '/some/other/temp/path');
        cacheSpy.mockImplementation(async () => toolPath);

        // act
        await main.run();

        // assert
        expect(findAllVersionsSpy).toHaveBeenCalled();
        expect(logSpy).toHaveBeenCalledWith(
          `Acquiring ${expectedVersion} - ${os.arch} from ${expectedUrl}`
        );
        expect(logSpy).toHaveBeenCalledWith('Extracting ...');
        expect(logSpy).toHaveBeenCalledWith('Adding to the cache ...');
        expect(addPathSpy).toHaveBeenCalledWith(path.join(toolPath, 'bin'));
      }
    );
  });

  describe('setup-node v8 canary tests', () => {
    it('v8 canary setup node flow with cached', async () => {
      const versionSpec = 'v20-v8-canary';

      inputs['node-version'] = versionSpec;
      inputs['token'] = 'faketoken';

      os.platform = 'linux';
      os.arch = 'x64';

      const versionExpected = 'v20.0.0-v8-canary20221103f7e2421e91';
      findAllVersionsSpy.mockImplementation(() => [versionExpected]);

      const toolPath = path.normalize(`/cache/node/${versionExpected}/x64`);
      findSpy.mockImplementation((version: any) => toolPath);

      await main.run();

      expect(addPathSpy).toHaveBeenCalledWith(`${toolPath}${path.sep}bin`);

      expect(dlSpy).not.toHaveBeenCalled();
      expect(exSpy).not.toHaveBeenCalled();
      expect(cacheSpy).not.toHaveBeenCalled();
    });
  });
});
