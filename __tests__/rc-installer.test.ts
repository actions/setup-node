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
  let platSpy: jest.SpiedFunction<typeof osm.platform>;
  let archSpy: jest.SpiedFunction<typeof osm.arch>;
  let dlSpy: jest.Mock;
  let exSpy: jest.Mock;
  let cacheSpy: jest.Mock;
  let dbgSpy: jest.Mock;
  let whichSpy: jest.Mock;
  let existsSpy: jest.SpiedFunction<typeof fs.existsSync>;
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
    // getDistSpy = jest.spyOn(im, 'getVersionsFromDist') as jest.Mock;

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
    isCacheActionAvailable.mockImplementation(() => false);

    // disable authentication portion for installer tests
    authSpy = auth.configAuthentication as jest.Mock;
    authSpy.mockImplementation(() => {});

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
    getExecOutputSpy.mockImplementation(() => 'v16.15.0-rc.1');
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
    inputs['node-version'] = '12.0.0-rc.1';
    inputs.stable = 'true';

    const toolPath = path.normalize('/cache/node/12.0.0-rc.1/x64');
    findSpy.mockImplementation(() => toolPath);
    await main.run();

    expect(logSpy).toHaveBeenCalledWith(`Found in cache @ ${toolPath}`);
  });

  it('finds version in cache with stable not supplied', async () => {
    inputs['node-version'] = '12.0.0-rc.1';

    inSpy.mockImplementation((name: any) => inputs[name]);

    const toolPath = path.normalize('/cache/node/12.0.0-rc.1/x64');
    findSpy.mockImplementation(() => toolPath);
    await main.run();

    expect(logSpy).toHaveBeenCalledWith(`Found in cache @ ${toolPath}`);
  });

  it('finds version in cache and adds it to the path', async () => {
    inputs['node-version'] = '12.0.0-rc.1';

    inSpy.mockImplementation((name: any) => inputs[name]);

    const toolPath = path.normalize('/cache/node/12.0.0-rc.1/x64');
    findSpy.mockImplementation(() => toolPath);
    await main.run();

    const expPath = path.join(toolPath, 'bin');
    expect(addPathSpy).toHaveBeenCalledWith(expPath);
  });

  it('handles unhandled find error and reports error', async () => {
    const errMsg = 'unhandled error message';
    inputs['node-version'] = '12.0.0-rc.1';

    findSpy.mockImplementation(() => {
      throw new Error(errMsg);
    });

    await main.run();

    expect(setFailedSpy).toHaveBeenCalledWith(errMsg);
  });

  it('falls back to a version from node dist', async () => {
    os.platform = 'linux';
    os.arch = 'x64';

    const versionSpec = '13.0.0-rc.0';

    inputs['node-version'] = versionSpec;
    inputs['token'] = 'faketoken';

    // ... but not in the local cache
    findSpy.mockImplementation(() => '');

    dlSpy.mockImplementation(async () => '/some/temp/path');
    const toolPath = path.normalize('/cache/node/13.0.0-rc.0/x64');
    exSpy.mockImplementation(async () => '/some/other/temp/path');
    cacheSpy.mockImplementation(async () => toolPath);

    await main.run();

    const expPath = path.join(toolPath, 'bin');

    expect(dlSpy).toHaveBeenCalled();
    expect(exSpy).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith('Extracting ...');
    expect(logSpy).toHaveBeenCalledWith('Done');
    expect(addPathSpy).toHaveBeenCalledWith(expPath);
  });

  it('does not find a version that does not exist', async () => {
    os.platform = 'linux';
    os.arch = 'x64';

    const versionSpec = '9.99.9-rc.1';
    inputs['node-version'] = versionSpec;

    findSpy.mockImplementation(() => '');
    await main.run();

    expect(setFailedSpy).toHaveBeenCalledWith(
      `Unable to find Node version '${versionSpec}' for platform ${os.platform} and architecture ${os.arch}.`
    );
  });

  it('reports a failed download', async () => {
    const errMsg = 'unhandled download message';
    os.platform = 'linux';
    os.arch = 'x64';

    const versionSpec = '14.7.0-rc.1';

    inputs['node-version'] = versionSpec;
    inputs['token'] = 'faketoken';

    findSpy.mockImplementation(() => '');
    findAllVersionsSpy.mockImplementation(() => []);
    dlSpy.mockImplementation(() => {
      throw new Error(errMsg);
    });
    await main.run();

    expect(setFailedSpy).toHaveBeenCalledWith(errMsg);
  });

  it('acquires specified architecture of node', async () => {
    for (const {arch, version, osSpec} of [
      {arch: 'x86', version: '13.4.0-rc.0', osSpec: 'win32'},
      {arch: 'x86', version: '14.15.5-rc.0', osSpec: 'win32'}
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

      const expectedUrl = `https://nodejs.org/download/rc/v${version}/node-v${version}-${platform}-${arch}.${fileExtension}`;

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

  describe('rc versions', () => {
    it.each([
      [
        '13.10.1-rc.0',
        '13.10.1-rc.0',
        'https://nodejs.org/download/rc/v13.10.1-rc.0/node-v13.10.1-rc.0-linux-x64.tar.gz'
      ],
      [
        '14.15.5-rc.1',
        '14.15.5-rc.1',
        'https://nodejs.org/download/rc/v14.15.5-rc.1/node-v14.15.5-rc.1-linux-x64.tar.gz'
      ],
      [
        '16.17.0-rc.1',
        '16.17.0-rc.1',
        'https://nodejs.org/download/rc/v16.17.0-rc.1/node-v16.17.0-rc.1-linux-x64.tar.gz'
      ],
      [
        '17.0.0-rc.1',
        '17.0.0-rc.1',
        'https://nodejs.org/download/rc/v17.0.0-rc.1/node-v17.0.0-rc.1-linux-x64.tar.gz'
      ],
      [
        '19.0.0-rc.2',
        '19.0.0-rc.2',
        'https://nodejs.org/download/rc/v19.0.0-rc.2/node-v19.0.0-rc.2-linux-x64.tar.gz'
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
        expect(logSpy).toHaveBeenCalledWith('Extracting ...');
        expect(logSpy).toHaveBeenCalledWith('Adding to the cache ...');
        expect(addPathSpy).toHaveBeenCalledWith(path.join(toolPath, 'bin'));
      }
    );

    it.each([
      ['13.10.1-rc.0', '13.10.1-rc.0'],
      ['14.15.5-rc.1', '14.15.5-rc.1'],
      ['16.17.0-rc.1', '16.17.0-rc.1'],
      ['17.0.0-rc.1', '17.0.0-rc.1']
    ])(
      'finds the %s version in the hostedToolcache',
      async (input, expectedVersion) => {
        const toolPath = path.normalize(`/cache/node/${expectedVersion}/x64`);
        findSpy.mockImplementation((_, version) =>
          path.normalize(`/cache/node/${version}/x64`)
        );
        findAllVersionsSpy.mockReturnValue([
          '2.2.2-rc.2',
          '1.1.1-rc.1',
          '99.1.1',
          expectedVersion,
          '88.1.1',
          '3.3.3-rc.3'
        ]);

        inputs['node-version'] = input;
        os['arch'] = 'x64';
        os['platform'] = 'linux';

        // act
        await main.run();

        // assert
        expect(logSpy).toHaveBeenCalledWith(`Found in cache @ ${toolPath}`);
        expect(addPathSpy).toHaveBeenCalledWith(path.join(toolPath, 'bin'));
      }
    );

    it('throws an error if version is not found', async () => {
      const versionSpec = '19.0.0-rc.3';

      findSpy.mockImplementation(() => '');
      findAllVersionsSpy.mockImplementation(() => []);
      dlSpy.mockImplementation(async () => '/some/temp/path');
      exSpy.mockImplementation(async () => '/some/other/temp/path');

      inputs['node-version'] = versionSpec;
      os['arch'] = 'x64';
      os['platform'] = 'linux';
      // act
      await main.run();

      // assert
      expect(setFailedSpy).toHaveBeenCalledWith(
        `Unable to find Node version '${versionSpec}' for platform ${os.platform} and architecture ${os.arch}.`
      );
    });
  });
});
