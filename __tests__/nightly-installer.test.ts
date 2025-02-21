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
  let mkdirpSpy: jest.SpyInstance;
  let cpSpy: jest.SpyInstance;
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
    process.env['RUNNER_TEMP'] = '/runner_temp';
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
    cpSpy = jest.spyOn(io, 'cp');

    // @actions/tool-cache
    isCacheActionAvailable = jest.spyOn(cache, 'isFeatureAvailable');

    // disable authentication portion for installer tests
    authSpy = jest.spyOn(auth, 'configAuthentication');
    authSpy.mockImplementation(() => {});

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

    inSpy.mockImplementation(name => inputs[name]);

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
    expect(cnSpy).toHaveBeenCalledWith(`::add-path::${expPath}${osm.EOL}`);
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

    expect(cnSpy).toHaveBeenCalledWith('::error::' + errMsg + osm.EOL);
  });

  it('falls back to a version from node dist', async () => {
    os.platform = 'linux';
    os.arch = 'x64';

    // a version which is not in the manifest but is in node dist
    const versionSpec = '13.13.1-nightly20200415947ddec091';

    inputs['node-version'] = versionSpec;
    inputs['always-auth'] = false;
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
    expect(cnSpy).toHaveBeenCalledWith(`::add-path::${expPath}${osm.EOL}`);
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
    inputs['always-auth'] = false;
    inputs['token'] = 'faketoken';

    // ... but not in the local cache
    findSpy.mockImplementation(() => '');
    findAllVersionsSpy.mockImplementation(() => []);

    dlSpy.mockImplementation(async url => {
      if (workingUrls.includes(url)) {
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

    workingUrls.forEach(url => {
      expect(dlSpy).toHaveBeenCalledWith(url);
    });
    expect(cnSpy).toHaveBeenCalledWith(`::add-path::${toolPath}${osm.EOL}`);
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
    inputs['always-auth'] = false;
    inputs['token'] = 'faketoken';

    // ... but not in the local cache
    findSpy.mockImplementation(() => '');
    findAllVersionsSpy.mockImplementation(() => []);

    dlSpy.mockImplementation(async url => {
      if (workingUrls.includes(url)) {
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

    workingUrls.forEach(url => {
      expect(dlSpy).not.toHaveBeenCalledWith(url);
    });
    expect(cnSpy).toHaveBeenCalledWith(
      `::error::Unexpected HTTP response: 404${osm.EOL}`
    );
  });

  it('does not find a version that does not exist', async () => {
    os.platform = 'linux';
    os.arch = 'x64';

    const versionSpec = '10.13.1-nightly20200415947ddec091';
    inputs['node-version'] = versionSpec;

    findSpy.mockImplementation(() => '');
    findAllVersionsSpy.mockImplementation(() => []);
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
    const versionSpec = '18.0.0-nightly202204180699150267';

    inputs['node-version'] = versionSpec;
    inputs['always-auth'] = false;
    inputs['token'] = 'faketoken';

    findSpy.mockImplementation(() => '');
    findAllVersionsSpy.mockImplementation(() => []);

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
      inputs['always-auth'] = false;
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
        expect(cnSpy).toHaveBeenCalledWith(
          `::add-path::${path.join(toolPath, 'bin')}${osm.EOL}`
        );
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
        expect(cnSpy).toHaveBeenCalledWith(
          `::add-path::${path.join(toolPath, 'bin')}${osm.EOL}`
        );
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
        expect(cnSpy).toHaveBeenCalledWith(
          `::add-path::${path.join(toolPath, 'bin')}${osm.EOL}`
        );
      }
    );
  });
});
