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
  let mkdirpSpy: jest.Mock;
  let cpSpy: jest.Mock;
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
    process.env['RUNNER_TEMP'] = '/runner_temp';
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
    cpSpy = io.cp as jest.Mock;

    // @actions/tool-cache
    isCacheActionAvailable = cache.isFeatureAvailable as jest.Mock;

    // disable authentication portion for installer tests
    authSpy = auth.configAuthentication as jest.Mock;
    authSpy.mockImplementation(() => {});

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
    inputs['node-version'] = '16-nightly';
    os['arch'] = 'x64';
    inputs.stable = 'true';

    const toolPath = path.normalize(
      '/cache/node/16.0.0-nightly20210417bc31dc0e0f/x64'
    );
    findSpy.mockImplementation(() => toolPath);
    findAllVersionsSpy.mockImplementation(() => [
      '12.0.1',
      '16.0.0-nightly20210415c3a5e15ebe',
      '16.0.0-nightly20210417bc31dc0e0f',
      '16.1.3'
    ]);

    await main.run();

    expect(findSpy).toHaveBeenCalledWith(
      'node',
      '16.0.0-nightly20210417bc31dc0e0f',
      'x64'
    );
    expect(logSpy).toHaveBeenCalledWith(`Found in cache @ ${toolPath}`);
  });

  it('finds version in cache with stable false', async () => {
    inputs['node-version'] = '16.0.0-nightly20210415c3a5e15ebe';
    os['arch'] = 'x64';
    inputs.stable = 'false';

    const toolPath = path.normalize(
      '/cache/node/16.0.0-nightly20210415c3a5e15ebe/x64'
    );
    findSpy.mockImplementation(() => toolPath);
    findAllVersionsSpy.mockImplementation(() => [
      '12.0.1',
      '16.0.0-nightly20210415c3a5e15ebe',
      '16.0.0-nightly20210417bc31dc0e0f',
      '16.1.3'
    ]);

    await main.run();

    expect(findSpy).toHaveBeenCalledWith(
      'node',
      '16.0.0-nightly20210415c3a5e15ebe',
      'x64'
    );
    expect(logSpy).toHaveBeenCalledWith(`Found in cache @ ${toolPath}`);
  });

  it('finds version in cache and adds it to the path', async () => {
    inputs['node-version'] = '16-nightly';
    os['arch'] = 'x64';

    inSpy.mockImplementation((name: any) => inputs[name]);

    const toolPath = path.normalize(
      '/cache/node/16.0.0-nightly20210417bc31dc0e0f/x64'
    );
    findSpy.mockImplementation(() => toolPath);
    findAllVersionsSpy.mockImplementation(() => [
      '12.0.1',
      '16.0.0-nightly20210415c3a5e15ebe',
      '16.0.0-nightly20210417bc31dc0e0f',
      '16.1.3'
    ]);

    await main.run();

    expect(findSpy).toHaveBeenCalledWith(
      'node',
      '16.0.0-nightly20210417bc31dc0e0f',
      'x64'
    );

    const expPath = path.join(toolPath, 'bin');
    expect(addPathSpy).toHaveBeenCalledWith(expPath);
  });

  it('handles unhandled find error and reports error', async () => {
    const errMsg = 'unhandled error message';
    inputs['node-version'] = '16.0.0-nightly20210417bc31dc0e0f';

    findAllVersionsSpy.mockImplementation(() => [
      '12.0.1',
      '16.0.0-nightly20210415c3a5e15ebe',
      '16.0.0-nightly20210417bc31dc0e0f',
      '16.1.3'
    ]);

    findSpy.mockImplementation(() => {
      throw new Error(errMsg);
    });

    await main.run();

    expect(setFailedSpy).toHaveBeenCalledWith(errMsg);
  });

  it('falls back to a version from node dist', async () => {
    os.platform = 'linux';
    os.arch = 'x64';

    // a version which is not in the manifest but is in node dist
    const versionSpec = '13.13.1-nightly20200415947ddec091';

    inputs['node-version'] = versionSpec;
    inputs['token'] = 'faketoken';

    // ... but not in the local cache
    findSpy.mockImplementation(() => '');
    findAllVersionsSpy.mockImplementation(() => []);

    dlSpy.mockImplementation(async () => '/some/temp/path');
    const toolPath = path.normalize(
      '/cache/node/13.13.1-nightly20200415947ddec091/x64'
    );
    exSpy.mockImplementation(async () => '/some/other/temp/path');
    cacheSpy.mockImplementation(async () => toolPath);

    await main.run();

    const expPath = path.join(toolPath, 'bin');

    expect(dlSpy).toHaveBeenCalled();
    expect(exSpy).toHaveBeenCalled();
    expect(addPathSpy).toHaveBeenCalledWith(expPath);
  });

  it('windows: falls back to exe version if not in manifest and not in node dist', async () => {
    os.platform = 'win32';
    os.arch = 'x64';

    // a version which is not in the manifest but is in node dist
    const versionSpec = '13.13.1-nightly20200415947ddec091';

    const workingUrls = [
      `https://nodejs.org/download/nightly/v${versionSpec}/win-x64/node.exe`,
      `https://nodejs.org/download/nightly/v${versionSpec}/win-x64/node.lib`
    ];

    inputs['node-version'] = versionSpec;
    inputs['token'] = 'faketoken';

    // ... but not in the local cache
    findSpy.mockImplementation(() => '');
    findAllVersionsSpy.mockImplementation(() => []);

    dlSpy.mockImplementation(async (url: any) => {
      if (workingUrls.includes(url as string)) {
        return '/some/temp/path';
      }

      throw new tc.HTTPError(404);
    });
    const toolPath = path.normalize(
      '/cache/node/13.13.1-nightly20200415947ddec091/x64'
    );
    cacheSpy.mockImplementation(async () => toolPath);
    mkdirpSpy.mockImplementation(async () => {});
    cpSpy.mockImplementation(async () => {});

    await main.run();

    workingUrls.forEach((url: any) => {
      expect(dlSpy).toHaveBeenCalledWith(url, undefined, undefined);
    });
    expect(addPathSpy).toHaveBeenCalledWith(toolPath);
  });

  it('linux: does not fall back to exe version if not in manifest and not in node dist', async () => {
    os.platform = 'linux';
    os.arch = 'x64';

    // a version which is not in the manifest but is in node dist
    const versionSpec = '13.13.1-nightly20200415947ddec091';

    const workingUrls = [
      `https://nodejs.org/download/nightly/v${versionSpec}/win-x64/node.exe`,
      `https://nodejs.org/download/nightly/v${versionSpec}/win-x64/node.lib`
    ];

    inputs['node-version'] = versionSpec;
    inputs['token'] = 'faketoken';

    // ... but not in the local cache
    findSpy.mockImplementation(() => '');
    findAllVersionsSpy.mockImplementation(() => []);

    dlSpy.mockImplementation(async (url: any) => {
      if (workingUrls.includes(url as string)) {
        return '/some/temp/path';
      }

      throw new tc.HTTPError(404);
    });
    const toolPath = path.normalize(
      '/cache/node/13.13.1-nightly20200415947ddec091/x64'
    );
    cacheSpy.mockImplementation(async () => toolPath);
    mkdirpSpy.mockImplementation(async () => {});
    cpSpy.mockImplementation(async () => {});

    await main.run();

    workingUrls.forEach((url: any) => {
      expect(dlSpy).not.toHaveBeenCalledWith(url);
    });
    expect(setFailedSpy).toHaveBeenCalledWith('Unexpected HTTP response: 404');
  });

  it('does not find a version that does not exist', async () => {
    os.platform = 'linux';
    os.arch = 'x64';

    const versionSpec = '10.13.1-nightly20200415947ddec091';
    inputs['node-version'] = versionSpec;

    findSpy.mockImplementation(() => '');
    findAllVersionsSpy.mockImplementation(() => []);
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
    const versionSpec = '18.0.0-nightly202204180699150267';

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
      {
        arch: 'x86',
        version: '18.0.0-nightly202110204cb3e06ed8',
        osSpec: 'win32'
      },
      {
        arch: 'x86',
        version: '20.0.0-nightly2022101987cdf7d412',
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

      const expectedUrl = `https://nodejs.org/download/nightly/v${version}/node-v${version}-${platform}-${arch}.${fileExtension}`;

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

  it('acquires specified architecture of node from mirror', async () => {
    for (const {arch, version, osSpec} of [
      {
        arch: 'x86',
        version: '18.0.0-nightly202110204cb3e06ed8',
        osSpec: 'win32'
      },
      {
        arch: 'x86',
        version: '20.0.0-nightly2022101987cdf7d412',
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
      inputs['mirror'] = 'https://my-mirror.org';
      inputs['mirror-token'] = 'my-mirror-token';

      const expectedUrl = `https://my-mirror.org/download/nightly/v${version}/node-v${version}-${platform}-${arch}.${fileExtension}`;

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
        '17.5.0-nightly',
        '17.5.0-nightly20220209e43808936a',
        'https://nodejs.org/download/nightly/v17.5.0-nightly20220209e43808936a/node-v17.5.0-nightly20220209e43808936a-linux-x64.tar.gz'
      ],
      [
        '17-nightly',
        '17.5.0-nightly20220209e43808936a',
        'https://nodejs.org/download/nightly/v17.5.0-nightly20220209e43808936a/node-v17.5.0-nightly20220209e43808936a-linux-x64.tar.gz'
      ],
      [
        '18.0.0-nightly',
        '18.0.0-nightly20220419bde889bd4e',
        'https://nodejs.org/download/nightly/v18.0.0-nightly20220419bde889bd4e/node-v18.0.0-nightly20220419bde889bd4e-linux-x64.tar.gz'
      ],
      [
        '18-nightly',
        '18.0.0-nightly20220419bde889bd4e',
        'https://nodejs.org/download/nightly/v18.0.0-nightly20220419bde889bd4e/node-v18.0.0-nightly20220419bde889bd4e-linux-x64.tar.gz'
      ],
      [
        '20.0.0-nightly',
        '20.0.0-nightly2022101987cdf7d412',
        'https://nodejs.org/download/nightly/v20.0.0-nightly2022101987cdf7d412/node-v20.0.0-nightly2022101987cdf7d412-linux-x64.tar.gz'
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
      ['17.5.0-nightly', '17.5.0-nightly20220209e43808936a'],
      ['17-nightly', '17.5.0-nightly20220209e43808936a'],
      ['20.0.0-nightly', '20.0.0-nightly2022101987cdf7d412']
    ])(
      'finds the %s version in the hostedToolcache',
      async (input, expectedVersion) => {
        const toolPath = path.normalize(`/cache/node/${expectedVersion}/x64`);
        findSpy.mockReturnValue(toolPath);
        findAllVersionsSpy.mockReturnValue([
          '17.5.0-nightly20220209e43808936a',
          '17.5.0-nightly20220209e43808935a',
          '20.0.0-nightly2022101987cdf7d412',
          '20.0.0-nightly2022101987cdf7d411'
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
        '17.5.0-nightly',
        '17.5.0-nightly20220209e43808936a',
        '17.0.0-nightly202110193f11666dc7',
        'https://nodejs.org/download/nightly/v17.5.0-nightly20220209e43808936a/node-v17.5.0-nightly20220209e43808936a-linux-x64.tar.gz'
      ],
      [
        '17-nightly',
        '17.5.0-nightly20220209e43808936a',
        '17.0.0-nightly202110193f11666dc7',
        'https://nodejs.org/download/nightly/v17.5.0-nightly20220209e43808936a/node-v17.5.0-nightly20220209e43808936a-linux-x64.tar.gz'
      ],
      [
        '18.0.0-nightly',
        '18.0.0-nightly20220419bde889bd4e',
        '18.0.0-nightly202204180699150267',
        'https://nodejs.org/download/nightly/v18.0.0-nightly20220419bde889bd4e/node-v18.0.0-nightly20220419bde889bd4e-linux-x64.tar.gz'
      ],
      [
        '18-nightly',
        '18.0.0-nightly20220419bde889bd4e',
        '18.0.0-nightly202204180699150267',
        'https://nodejs.org/download/nightly/v18.0.0-nightly20220419bde889bd4e/node-v18.0.0-nightly20220419bde889bd4e-linux-x64.tar.gz'
      ],
      [
        '20.0.0-nightly',
        '20.0.0-nightly2022101987cdf7d412',
        '20.0.0-nightly2022101987cdf7d411',
        'https://nodejs.org/download/nightly/v20.0.0-nightly2022101987cdf7d412/node-v20.0.0-nightly2022101987cdf7d412-linux-x64.tar.gz'
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
          '17.0.0-nightly202110193f11666dc7',
          '18.0.0-nightly202204180699150267',
          '20.0.0-nightly2022101987cdf7d411'
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
});
