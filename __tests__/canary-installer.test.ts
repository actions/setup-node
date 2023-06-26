import * as core from '@actions/core';
import * as io from '@actions/io';
import * as tc from '@actions/tool-cache';
import * as httpm from '@actions/http-client';
import * as exec from '@actions/exec';
import * as cache from '@actions/cache';
import fs from 'fs';
import cp from 'child_process';
import osm from 'os';
import path from 'path';
import * as main from '../src/main';
import * as auth from '../src/authutil';
import {INodeVersion} from '../src/distributions/base-models';

import nodeTestManifest from './data/versions-manifest.json';
import nodeTestDist from './data/node-dist-index.json';
import nodeTestDistNightly from './data/node-nightly-index.json';
import nodeTestDistRc from './data/node-rc-index.json';
import nodeV8CanaryTestDist from './data/v8-canary-dist-index.json';

describe('setup-node', () => {
  let inputs = {} as any;
  let os = {} as any;

  let inSpy: jest.SpyInstance;
  let findSpy: jest.SpyInstance;
  let findAllVersionsSpy: jest.SpyInstance;
  let cnSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;
  let warningSpy: jest.SpyInstance;
  let getManifestSpy: jest.SpyInstance;
  let getDistSpy: jest.SpyInstance;
  let platSpy: jest.SpyInstance;
  let archSpy: jest.SpyInstance;
  let dlSpy: jest.SpyInstance;
  let exSpy: jest.SpyInstance;
  let cacheSpy: jest.SpyInstance;
  let dbgSpy: jest.SpyInstance;
  let whichSpy: jest.SpyInstance;
  let existsSpy: jest.SpyInstance;
  let readFileSyncSpy: jest.SpyInstance;
  let mkdirpSpy: jest.SpyInstance;
  let execSpy: jest.SpyInstance;
  let authSpy: jest.SpyInstance;
  let parseNodeVersionSpy: jest.SpyInstance;
  let isCacheActionAvailable: jest.SpyInstance;
  let getExecOutputSpy: jest.SpyInstance;
  let getJsonSpy: jest.SpyInstance;

  beforeEach(() => {
    // @actions/core
    console.log('::stop-commands::stoptoken'); // Disable executing of runner commands when running tests in actions
    process.env['GITHUB_PATH'] = ''; // Stub out ENV file functionality so we can verify it writes to standard out
    process.env['GITHUB_OUTPUT'] = ''; // Stub out ENV file functionality so we can verify it writes to standard out
    inputs = {};
    inSpy = jest.spyOn(core, 'getInput');
    inSpy.mockImplementation(name => inputs[name]);

    // node
    os = {};
    platSpy = jest.spyOn(osm, 'platform');
    platSpy.mockImplementation(() => os['platform']);
    archSpy = jest.spyOn(osm, 'arch');
    archSpy.mockImplementation(() => os['arch']);
    execSpy = jest.spyOn(cp, 'execSync');

    // @actions/tool-cache
    findSpy = jest.spyOn(tc, 'find');
    findAllVersionsSpy = jest.spyOn(tc, 'findAllVersions');
    dlSpy = jest.spyOn(tc, 'downloadTool');
    exSpy = jest.spyOn(tc, 'extractTar');
    cacheSpy = jest.spyOn(tc, 'cacheDir');
    getManifestSpy = jest.spyOn(tc, 'getManifestFromRepo');

    // http-client
    getJsonSpy = jest.spyOn(httpm.HttpClient.prototype, 'getJson');

    // io
    whichSpy = jest.spyOn(io, 'which');
    existsSpy = jest.spyOn(fs, 'existsSync');
    mkdirpSpy = jest.spyOn(io, 'mkdirP');

    // @actions/tool-cache
    isCacheActionAvailable = jest.spyOn(cache, 'isFeatureAvailable');

    // disable authentication portion for installer tests
    authSpy = jest.spyOn(auth, 'configAuthentication');
    authSpy.mockImplementation(() => {});

    // gets
    getManifestSpy.mockImplementation(
      () => <tc.IToolRelease[]>nodeTestManifest
    );

    getJsonSpy.mockImplementation(url => {
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
    logSpy = jest.spyOn(core, 'info');
    dbgSpy = jest.spyOn(core, 'debug');
    warningSpy = jest.spyOn(core, 'warning');
    cnSpy.mockImplementation(line => {
      // uncomment to debug
      // process.stderr.write('write:' + line + '\n');
    });
    logSpy.mockImplementation(line => {
      // uncomment to debug
      // process.stderr.write('log:' + line + '\n');
    });
    dbgSpy.mockImplementation(msg => {
      // uncomment to see debug output
      // process.stderr.write(msg + '\n');
    });
    warningSpy.mockImplementation(msg => {
      // uncomment to debug
      // process.stderr.write('log:' + msg + '\n');
    });

    // @actions/exec
    getExecOutputSpy = jest.spyOn(exec, 'getExecOutput');
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

    inSpy.mockImplementation(name => inputs[name]);

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
    expect(cnSpy).toHaveBeenCalledWith(`::add-path::${expPath}${osm.EOL}`);
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

    expect(cnSpy).toHaveBeenCalledWith('::error::' + errMsg + osm.EOL);
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
    inputs['always-auth'] = false;
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
    expect(cnSpy).toHaveBeenCalledWith(`::add-path::${expPath}${osm.EOL}`);
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

    expect(cnSpy).toHaveBeenCalledWith(
      `::error::Unable to find Node version '${versionSpec}' for platform ${os.platform} and architecture ${os.arch}.${osm.EOL}`
    );
  });

  it('reports a failed download', async () => {
    const errMsg = 'unhandled download message';
    os.platform = 'linux';
    os.arch = 'x64';

    // a version which is in the manifest
    const versionSpec = '19.0.0-v8-canary';

    inputs['node-version'] = versionSpec;
    inputs['always-auth'] = false;
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

    expect(cnSpy).toHaveBeenCalledWith(`::error::${errMsg}${osm.EOL}`);
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
      inputs['always-auth'] = false;
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
        expect(cnSpy).toHaveBeenCalledWith(
          `::add-path::${path.join(toolPath, 'bin')}${osm.EOL}`
        );
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
        expect(cnSpy).toHaveBeenCalledWith(
          `::add-path::${path.join(toolPath, 'bin')}${osm.EOL}`
        );
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
        expect(cnSpy).toHaveBeenCalledWith(
          `::add-path::${path.join(toolPath, 'bin')}${osm.EOL}`
        );
      }
    );
  });

  describe('setup-node v8 canary tests', () => {
    it('v8 canary setup node flow with cached', async () => {
      const versionSpec = 'v20-v8-canary';

      inputs['node-version'] = versionSpec;
      inputs['always-auth'] = false;
      inputs['token'] = 'faketoken';

      os.platform = 'linux';
      os.arch = 'x64';

      const versionExpected = 'v20.0.0-v8-canary20221103f7e2421e91';
      findAllVersionsSpy.mockImplementation(() => [versionExpected]);

      const toolPath = path.normalize(`/cache/node/${versionExpected}/x64`);
      findSpy.mockImplementation(version => toolPath);

      await main.run();

      expect(cnSpy).toHaveBeenCalledWith(
        `::add-path::${toolPath}${path.sep}bin${osm.EOL}`
      );

      expect(dlSpy).not.toHaveBeenCalled();
      expect(exSpy).not.toHaveBeenCalled();
      expect(cacheSpy).not.toHaveBeenCalled();
    });
  });
});
