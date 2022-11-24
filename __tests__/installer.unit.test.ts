import * as core from '@actions/core';
import * as io from '@actions/io';
import * as tc from '@actions/tool-cache';
import * as httpm from '@actions/http-client';
import * as exec from '@actions/exec';
import * as im from '../src/installer';
import * as cache from '@actions/cache';
import fs from 'fs';
import cp from 'child_process';
import osm from 'os';
import path from 'path';
import each from 'jest-each';
import * as main from '../src/main';
import * as auth from '../src/authutil';

const nodeTestManifest = require('./data/versions-manifest.json');
const nodeTestDist = require('./data/node-dist-index.json');
const nodeTestDistNightly = require('./data/node-nightly-index.json');
const nodeTestDistRc = require('./data/node-rc-index.json');
const nodeV8CanaryTestDist = require('./data/v8-canary-dist-index.json');

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
    // @ts-ignore
    getDistSpy = jest.spyOn(im, 'getVersionsFromDist');
    parseNodeVersionSpy = jest.spyOn(im, 'parseNodeVersionFile');

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
    authSpy.mockImplementation(() => {
    });

    // gets
    getManifestSpy.mockImplementation(
      () => <tc.IToolRelease[]>nodeTestManifest
    );

    getDistSpy.mockImplementation(version => {
      const initialUrl = im.getNodejsDistUrl(version);
      if (initialUrl.endsWith('/rc')) {
        return <im.INodeVersion>nodeTestDistRc;
      } else if (initialUrl.endsWith('/nightly')) {
        return <im.INodeVersion>nodeTestDistNightly;
      } else {
        return <im.INodeVersion>nodeTestDist;
      }
    });

    getJsonSpy.mockImplementation(url => {
      let res: any;
      if (url.includes('/rc')) {
        res = <im.INodeVersion>nodeTestDistRc;
      } else if (url.includes('/nightly')) {
        res = <im.INodeVersion>nodeTestDistNightly;
      } else {
        res = <im.INodeVersion>nodeTestDist;
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
  // Manifest find tests
  //--------------------------------------------------
  it('can mock manifest versions', async () => {
    let versions: tc.IToolRelease[] | null = await tc.getManifestFromRepo(
      'actions',
      'node-versions',
      'mocktoken'
    );
    expect(versions).toBeDefined();
    expect(versions?.length).toBe(7);
  });

  it('can mock dist versions', async () => {
    const versionSpec = '1.2.3';
    let versions: im.INodeVersion[] = await im.getVersionsFromDist(versionSpec);
    expect(versions).toBeDefined();
    expect(versions?.length).toBe(23);
  });

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
      let versions: tc.IToolRelease[] | null = await tc.getManifestFromRepo(
        'actions',
        'node-versions',
        'mocktoken'
      );
      expect(versions).toBeDefined();
      let match = await tc.findFromManifest(versionSpec, true, versions);
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

    let toolPath = path.normalize('/cache/node/12.16.1/x64');
    findSpy.mockImplementation(() => toolPath);
    await main.run();

    expect(logSpy).toHaveBeenCalledWith(`Found in cache @ ${toolPath}`);
  });

  it('finds version in cache with stable not supplied', async () => {
    inputs['node-version'] = '12';

    inSpy.mockImplementation(name => inputs[name]);

    let toolPath = path.normalize('/cache/node/12.16.1/x64');
    findSpy.mockImplementation(() => toolPath);
    await main.run();

    expect(logSpy).toHaveBeenCalledWith(`Found in cache @ ${toolPath}`);
  });

  it('finds version in cache and adds it to the path', async () => {
    inputs['node-version'] = '12';

    inSpy.mockImplementation(name => inputs[name]);

    let toolPath = path.normalize('/cache/node/12.16.1/x64');
    findSpy.mockImplementation(() => toolPath);
    await main.run();

    let expPath = path.join(toolPath, 'bin');
    expect(cnSpy).toHaveBeenCalledWith(`::add-path::${expPath}${osm.EOL}`);
  });

  it('handles unhandled find error and reports error', async () => {
    let errMsg = 'unhandled error message';
    inputs['node-version'] = '12';

    findSpy.mockImplementation(() => {
      throw new Error(errMsg);
    });

    await main.run();

    expect(cnSpy).toHaveBeenCalledWith('::error::' + errMsg + osm.EOL);
  });

  //--------------------------------------------------
  // Manifest tests
  //--------------------------------------------------

  it('downloads a version from a manifest match', async () => {
    os.platform = 'linux';
    os.arch = 'x64';

    // a version which is in the manifest
    let versionSpec = '12.16.2';
    let resolvedVersion = versionSpec;

    inputs['node-version'] = versionSpec;
    inputs['always-auth'] = false;
    inputs['token'] = 'faketoken';

    let expectedUrl =
      'https://github.com/actions/node-versions/releases/download/12.16.2-20200507.95/node-12.16.2-linux-x64.tar.gz';

    // ... but not in the local cache
    findSpy.mockImplementation(() => '');

    dlSpy.mockImplementation(async () => '/some/temp/path');
    let toolPath = path.normalize('/cache/node/12.16.2/x64');
    exSpy.mockImplementation(async () => '/some/other/temp/path');
    cacheSpy.mockImplementation(async () => toolPath);

    await main.run();

    let expPath = path.join(toolPath, 'bin');

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
    expect(cnSpy).toHaveBeenCalledWith(`::add-path::${expPath}${osm.EOL}`);
  });

  it('falls back to a version from node dist', async () => {
    os.platform = 'linux';
    os.arch = 'x64';

    // a version which is not in the manifest but is in node dist
    let versionSpec = '11.15.0';
    let resolvedVersion = versionSpec;

    inputs['node-version'] = versionSpec;
    inputs['always-auth'] = false;
    inputs['token'] = 'faketoken';

    let expectedUrl =
      'https://github.com/actions/node-versions/releases/download/12.16.2-20200507.95/node-12.16.2-linux-x64.tar.gz';

    // ... but not in the local cache
    findSpy.mockImplementation(() => '');

    dlSpy.mockImplementation(async () => '/some/temp/path');
    let toolPath = path.normalize('/cache/node/11.11.0/x64');
    exSpy.mockImplementation(async () => '/some/other/temp/path');
    cacheSpy.mockImplementation(async () => toolPath);

    await main.run();

    let expPath = path.join(toolPath, 'bin');

    expect(dlSpy).toHaveBeenCalled();
    expect(exSpy).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(
      'Not found in manifest.  Falling back to download directly from Node'
    );
    expect(logSpy).toHaveBeenCalledWith(
      `Attempting to download ${versionSpec}...`
    );
    expect(cnSpy).toHaveBeenCalledWith(`::add-path::${expPath}${osm.EOL}`);
  });

  it('does not find a version that does not exist', async () => {
    os.platform = 'linux';
    os.arch = 'x64';

    let versionSpec = '9.99.9';
    inputs['node-version'] = versionSpec;

    findSpy.mockImplementation(() => '');
    await main.run();

    expect(logSpy).toHaveBeenCalledWith(
      'Not found in manifest.  Falling back to download directly from Node'
    );
    expect(logSpy).toHaveBeenCalledWith(
      `Attempting to download ${versionSpec}...`
    );
    expect(cnSpy).toHaveBeenCalledWith(
      `::error::Unable to find Node version '${versionSpec}' for platform ${os.platform} and architecture ${os.arch}.${osm.EOL}`
    );
  });

  it('reports a failed download', async () => {
    let errMsg = 'unhandled download message';
    os.platform = 'linux';
    os.arch = 'x64';

    // a version which is in the manifest
    let versionSpec = '12.16.2';
    let resolvedVersion = versionSpec;

    inputs['node-version'] = versionSpec;
    inputs['always-auth'] = false;
    inputs['token'] = 'faketoken';

    findSpy.mockImplementation(() => '');
    dlSpy.mockImplementation(() => {
      throw new Error(errMsg);
    });
    await main.run();

    expect(cnSpy).toHaveBeenCalledWith(`::error::${errMsg}${osm.EOL}`);
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
      inputs['always-auth'] = false;
      inputs['token'] = 'faketoken';

      let expectedUrl =
        arch === 'x64'
          ? `https://github.com/actions/node-versions/releases/download/${version}/node-${version}-${platform}-${arch}.zip`
          : `https://nodejs.org/dist/v${version}/node-v${version}-${platform}-${arch}.${fileExtension}`;

      // ... but not in the local cache
      findSpy.mockImplementation(() => '');

      dlSpy.mockImplementation(async () => '/some/temp/path');
      let toolPath = path.normalize(`/cache/node/${version}/${arch}`);
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
      let versionSpec = '11';

      inputs['node-version'] = versionSpec;
      inputs['check-latest'] = 'true';
      inputs['always-auth'] = false;
      inputs['token'] = 'faketoken';

      // ... but not in the local cache
      findSpy.mockImplementation(() => '');

      dlSpy.mockImplementation(async () => '/some/temp/path');
      let toolPath = path.normalize('/cache/node/11.11.0/x64');
      exSpy.mockImplementation(async () => '/some/other/temp/path');
      cacheSpy.mockImplementation(async () => toolPath);

      await main.run();

      let expPath = path.join(toolPath, 'bin');

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
      expect(cnSpy).toHaveBeenCalledWith(`::add-path::${expPath}${osm.EOL}`);
    });

    it('fallback to dist if manifest is not available', async () => {
      os.platform = 'linux';
      os.arch = 'x64';

      // a version which is not in the manifest but is in node dist
      let versionSpec = '12';

      inputs['node-version'] = versionSpec;
      inputs['check-latest'] = 'true';
      inputs['always-auth'] = false;
      inputs['token'] = 'faketoken';

      // ... but not in the local cache
      findSpy.mockImplementation(() => '');
      getManifestSpy.mockImplementation(() => {
        throw new Error('Unable to download manifest');
      });

      dlSpy.mockImplementation(async () => '/some/temp/path');
      let toolPath = path.normalize('/cache/node/12.11.0/x64');
      exSpy.mockImplementation(async () => '/some/other/temp/path');
      cacheSpy.mockImplementation(async () => toolPath);

      await main.run();

      let expPath = path.join(toolPath, 'bin');

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
      expect(cnSpy).toHaveBeenCalledWith(`::add-path::${expPath}${osm.EOL}`);
    });
  });

  describe('node-version-file flag', () => {
    it('not used if node-version is provided', async () => {
      // Arrange
      inputs['node-version'] = '12';

      // Act
      await main.run();

      // Assert
      expect(parseNodeVersionSpy).toHaveBeenCalledTimes(0);
    });

    it('not used if node-version-file not provided', async () => {
      // Act
      await main.run();

      // Assert
      expect(parseNodeVersionSpy).toHaveBeenCalledTimes(0);
    });

    it('reads node-version-file if provided', async () => {
      // Arrange
      const versionSpec = 'v14';
      const versionFile = '.nvmrc';
      const expectedVersionSpec = '14';
      process.env['GITHUB_WORKSPACE'] = path.join(__dirname, 'data');
      inputs['node-version-file'] = versionFile;

      parseNodeVersionSpy.mockImplementation(() => expectedVersionSpec);
      existsSpy.mockImplementationOnce(
        input => input === path.join(__dirname, 'data', versionFile)
      );

      // Act
      await main.run();

      // Assert
      expect(existsSpy).toHaveBeenCalledTimes(1);
      expect(existsSpy).toHaveReturnedWith(true);
      expect(parseNodeVersionSpy).toHaveBeenCalledWith(versionSpec);
      expect(logSpy).toHaveBeenCalledWith(
        `Resolved ${versionFile} as ${expectedVersionSpec}`
      );
    });

    it('reads package.json as node-version-file if provided', async () => {
      // Arrange
      const versionSpec = fs.readFileSync(
        path.join(__dirname, 'data/package.json'),
        'utf-8'
      );
      const versionFile = 'package.json';
      const expectedVersionSpec = '14';
      process.env['GITHUB_WORKSPACE'] = path.join(__dirname, 'data');
      inputs['node-version-file'] = versionFile;

      parseNodeVersionSpy.mockImplementation(() => expectedVersionSpec);
      existsSpy.mockImplementationOnce(
        input => input === path.join(__dirname, 'data', versionFile)
      );
      // Act
      await main.run();

      // Assert
      expect(existsSpy).toHaveBeenCalledTimes(1);
      expect(existsSpy).toHaveReturnedWith(true);
      expect(parseNodeVersionSpy).toHaveBeenCalledWith(versionSpec);
      expect(logSpy).toHaveBeenCalledWith(
        `Resolved ${versionFile} as ${expectedVersionSpec}`
      );
    });

    it('both node-version-file and node-version are provided', async () => {
      inputs['node-version'] = '12';
      const versionSpec = 'v14';
      const versionFile = '.nvmrc';
      const expectedVersionSpec = '14';
      process.env['GITHUB_WORKSPACE'] = path.join(__dirname, '..');
      inputs['node-version-file'] = versionFile;

      parseNodeVersionSpy.mockImplementation(() => expectedVersionSpec);

      // Act
      await main.run();

      // Assert
      expect(existsSpy).toHaveBeenCalledTimes(0);
      expect(parseNodeVersionSpy).not.toHaveBeenCalled();
      expect(warningSpy).toHaveBeenCalledWith(
        'Both node-version and node-version-file inputs are specified, only node-version will be used'
      );
    });

    it('should throw an error if node-version-file is not found', async () => {
      const versionFile = '.nvmrc';
      const versionFilePath = path.join(__dirname, '..', versionFile);
      inputs['node-version-file'] = versionFile;

      inSpy.mockImplementation(name => inputs[name]);
      existsSpy.mockImplementationOnce(
        input => input === path.join(__dirname, 'data', versionFile)
      );

      // Act
      await main.run();

      // Assert
      expect(existsSpy).toHaveBeenCalled();
      expect(existsSpy).toHaveReturnedWith(false);
      expect(parseNodeVersionSpy).not.toHaveBeenCalled();
      expect(cnSpy).toHaveBeenCalledWith(
        `::error::The specified node version file at: ${versionFilePath} does not exist${osm.EOL}`
      );
    });
  });

  describe('cache on GHES', () => {
    it('Should throw an error, because cache is not supported', async () => {
      inputs['node-version'] = '12';
      inputs['cache'] = 'npm';

      inSpy.mockImplementation(name => inputs[name]);

      let toolPath = path.normalize('/cache/node/12.16.1/x64');
      findSpy.mockImplementation(() => toolPath);

      // expect(logSpy).toHaveBeenCalledWith(`Found in cache @ ${toolPath}`);
      process.env['GITHUB_SERVER_URL'] = 'https://www.test.com';
      isCacheActionAvailable.mockImplementation(() => false);

      await main.run();

      expect(cnSpy).toHaveBeenCalledWith(
        `::error::Cache action is only supported on GHES version >= 3.5. If you are on version >=3.5 Please check with GHES admin if Actions cache service is enabled or not.${osm.EOL}`
      );
    });

    it('Should throw an internal error', async () => {
      inputs['node-version'] = '12';
      inputs['cache'] = 'npm';

      inSpy.mockImplementation(name => inputs[name]);

      let toolPath = path.normalize('/cache/node/12.16.1/x64');
      findSpy.mockImplementation(() => toolPath);

      // expect(logSpy).toHaveBeenCalledWith(`Found in cache @ ${toolPath}`);
      process.env['GITHUB_SERVER_URL'] = '';
      isCacheActionAvailable.mockImplementation(() => false);

      await main.run();

      expect(warningSpy).toHaveBeenCalledWith(
        'The runner was not able to contact the cache service. Caching will be skipped'
      );
    });
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
        expect(cnSpy).toHaveBeenCalledWith(
          `::add-path::${path.join(toolPath, 'bin')}${osm.EOL}`
        );
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
        expect(cnSpy).toHaveBeenCalledWith(
          `::add-path::${path.join(toolPath, 'bin')}${osm.EOL}`
        );
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
      expect(cnSpy).toHaveBeenCalledWith(
        `::error::Unable to parse LTS alias for Node version 'lts/'${osm.EOL}`
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
      expect(cnSpy).toHaveBeenCalledWith(
        `::error::Unable to find LTS release 'unknown' for Node version 'lts/unknown'.${osm.EOL}`
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
      expect(cnSpy).toHaveBeenCalledWith(
        `::error::Unable to download manifest${osm.EOL}`
      );
    });
  });

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
        expect(logSpy).toHaveBeenCalledWith(
          `Attempting to download ${input}...`
        );

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
      ['13.10.1-rc.0', '13.10.1-rc.0'],
      ['14.15.5-rc.1', '14.15.5-rc.1'],
      ['16.17.0-rc.1', '16.17.0-rc.1'],
      ['17.0.0-rc.1', '17.0.0-rc.1']
    ])(
      'finds the %s version in the hostedToolcache',
      async (input, expectedVersion) => {
        const toolPath = path.normalize(`/cache/node/${expectedVersion}/x64`);
        findSpy.mockImplementation((_,version)=>path.normalize(`/cache/node/${version}/x64`))
        findAllVersionsSpy.mockReturnValue([
          '2.2.2-rc.2',
          '1.1.1-rc.1',
          '99.1.1',
          expectedVersion,
          '88.1.1',
          '3.3.3-rc.3',
        ])

        inputs['node-version'] = input;
        os['arch'] = 'x64';
        os['platform'] = 'linux';

        // act
        await main.run();

        // assert
        expect(logSpy).toHaveBeenCalledWith(`Found in cache @ ${toolPath}`);
        expect(cnSpy).toHaveBeenCalledWith(
          `::add-path::${path.join(toolPath, 'bin')}${osm.EOL}`
        );
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
      expect(logSpy).toHaveBeenCalledWith(
        `Attempting to download ${versionSpec}...`
      );
      expect(cnSpy).toHaveBeenCalledWith(
        `::error::Unable to find Node version '${versionSpec}' for platform ${os.platform} and architecture ${os.arch}.${osm.EOL}`
      );
    });
  });

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
          `Attempting to download ${input}...`
        );

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
        expect(logSpy).toHaveBeenCalledWith('Unable to download manifest');

        expect(logSpy).toHaveBeenCalledWith('getting latest node version...');
      }
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
        findSpy.mockReturnValue(toolPath);

        // Act
        await main.run();

        // assert
        expect(logSpy).toHaveBeenCalledWith(`Found in cache @ ${toolPath}`);

        expect(logSpy).toHaveBeenCalledWith('getting latest node version...');
      }
    );
  });

  describe('setup-node v8 canary unit tests', () => {

    it('v20-v8-canary should match any minor and patch version', () => {
      // @ts-ignore
      const matcher = im.evaluateCanaryMatcher('v20-v8-canary');
      expect(matcher('v20.0.0-v8-canary20221103f7e2421e91')).toBeTruthy();
      expect(matcher('v20.0.1-v8-canary20221103f7e2421e91')).toBeTruthy();
      expect(matcher('v20.1.0-v8-canary20221103f7e2421e91')).toBeTruthy();
      expect(matcher('v20.1.1-v8-canary20221103f7e2421e91')).toBeTruthy();
      expect(matcher('v20.0.0-v8-canary202211026bf85d0fb4')).toBeTruthy();
    });

    it('v20-v8-canary should not match v21.x & v19.x', () => {
      // @ts-ignore
      const matcher = im.evaluateCanaryMatcher('v20-v8-canary');
      expect(matcher('v21.0.0-v8-canary20221103f7e2421e91')).toBeFalsy();
      expect(matcher('v21.1.0-v8-canary20221103f7e2421e91')).toBeFalsy();
      expect(matcher('v21.1.1-v8-canary20221103f7e2421e91')).toBeFalsy();
      expect(matcher('v19.0.0-v8-canary20221103f7e2421e91')).toBeFalsy();
      expect(matcher('v19.1.0-v8-canary20221103f7e2421e91')).toBeFalsy();
      expect(matcher('v19.1.-v8-canary20221103f7e2421e91')).toBeFalsy();
    });

    it('v20.1-v8-canary should match any v20.1 patch version and minor above or eq v20.1', () => {
      // @ts-ignore
      const matcher = im.evaluateCanaryMatcher('v20.1-v8-canary');
      expect(matcher('v20.1.0-v8-canary20221103f7e2421e91')).toBeTruthy();
      expect(matcher('v20.1.1-v8-canary20221103f7e2421e91')).toBeTruthy();
      expect(matcher('v20.1.0-v8-canary202211026bf85d0fb4')).toBeTruthy();
      expect(matcher('v20.2.0-v8-canary20221103f7e2421e91')).toBeTruthy();
    });

    it('v20.2-v8-canary should not match v21.x, v19.x, and v20 minor less v20.2', () => {
      // @ts-ignore
      const matcher = im.evaluateCanaryMatcher('v20.2-v8-canary');
      expect(matcher('v20.1.0-v8-canary20221103f7e2421e91')).toBeFalsy();
      expect(matcher('v21.0.0-v8-canary20221103f7e2421e91')).toBeFalsy();
      expect(matcher('v19.0.0-v8-canary20221103f7e2421e91')).toBeFalsy();
    });

    it('v20.1.1-v8-canary should match v20.1.x patch versions above or eq v20.1.1', () => {
      // @ts-ignore
      const matcher = im.evaluateCanaryMatcher('v20.1.1-v8-canary');
      expect(matcher('v20.1.1-v8-canary20221103f7e2421e91')).toBeTruthy();
      expect(matcher('v20.1.2-v8-canary20221103f7e2421e91')).toBeTruthy();
      expect(matcher('v20.2.0-v8-canary20221103f7e2421e91')).toBeTruthy();
    });

    it('v20.1.1-v8-canary should match patch versions with any canary timestamp', () => {
      // @ts-ignore
      const matcher = im.evaluateCanaryMatcher('v20.1.1-v8-canary');
      expect(matcher('v20.1.1-v8-canary20221103f7e2421e91')).toBeTruthy();
      expect(matcher('v20.1.1-v8-canary202211026bf85d0fb4')).toBeTruthy();
    });

    it('v20.1.1-v8-canary should not match any other minor versions and patch versions below v20.1.1', () => {
      // @ts-ignore
      const matcher = im.evaluateCanaryMatcher('v20.1.1-v8-canary');
      expect(matcher('v20.1.0-v8-canary20221103f7e2421e91')).toBeFalsy();
      expect(matcher('v21.0.0-v8-canary20221103f7e2421e91')).toBeFalsy();
      expect(matcher('v19.0.0-v8-canary20221103f7e2421e91')).toBeFalsy();
    });

    it('v20.0.0-v8-canary20221103f7e2421e91 should match only v20.0.0-v8-canary20221103f7e2421e91', () => {
      // @ts-ignore
      const matcher = im.evaluateCanaryMatcher(
        'v20.0.0-v8-canary20221103f7e2421e91'
      );
      expect(matcher('v20.0.0-v8-canary20221103f7e2421e91')).toBeTruthy();
      // see  https://github.com/actions/setup-node/blob/00e1b6691b40cce14b5078cb411dd1ec7dab07f7/__tests__/verify-node.sh#L10
      expect(matcher('v20.0.0-v8-canary202211026bf85d0fb4')).toBeFalsy();
    });

    it('v8 canary evaluateVersions without timestamp', () => {
      const versions = [
        'v20.0.0-v8-canary20221103f7e2421e91',
        'v20.0.1-v8-canary20221103f7e2421e91',
        'v20.1.0-v8-canary20221103f7e2421e91',
        'v20.1.1-v8-canary20221103f7e2421e91',
        'v21.1.0-v8-canary20221103f7e2421e91',
        'v19.1.0-v8-canary20221103f7e2421e91'
      ];
      // @ts-ignore
      const version = im.evaluateVersions(versions, 'v20-v8-canary');
      expect(version).toBe('v20.1.1-v8-canary20221103f7e2421e91');
    });

    it('v8 canary evaluateVersions with timestamp', () => {
      const versions = [
        'v20.0.0-v8-canary20221103f7e2421e91',
        'v20.0.1-v8-canary20221103f7e2421e91',
        'v20.0.1-v8-canary20221103f7e2421e92',
        'v20.0.1-v8-canary20221103f7e2421e93',
        'v20.0.2-v8-canary20221103f7e2421e91'
      ];
      // @ts-ignore
      const version = im.evaluateVersions(
        versions,
        'v20.0.1-v8-canary20221103f7e2421e92'
      );
      expect(version).toBe('v20.0.1-v8-canary20221103f7e2421e92');
    });

    it('v8 canary queryDistForMatch', async () => {
      jest.spyOn(osm, 'platform').mockImplementationOnce(() => 'linux');
      // @ts-ignore
      const version = await im.queryDistForMatch(
        'v20-v8-canary',
        'x64',
        nodeV8CanaryTestDist
      );
      expect(version).toBe('v20.0.0-v8-canary20221103f7e2421e91');
    });
  });

  describe('setup-node v8 canary e2e tests', () => {
    // @actions/http-client
    let getDistIndexJsonSpy: jest.SpyInstance;
    let findAllVersionSpy: jest.SpyInstance;

    beforeEach(() => {
      // @actions/http-client
      getDistIndexJsonSpy = jest.spyOn(httpm.HttpClient.prototype, 'getJson');
      getDistIndexJsonSpy.mockImplementation(() => ({
        result: nodeV8CanaryTestDist
      }));

      // @actions/tool-cache
      findAllVersionSpy = jest.spyOn(tc, 'findAllVersions');
    });

    it('v8 canary setup node flow without cached', async () => {
      let versionSpec = 'v20-v8-canary';

      inputs['node-version'] = versionSpec;
      inputs['always-auth'] = false;
      inputs['token'] = 'faketoken';

      os.platform = 'linux';
      os.arch = 'x64';

      findAllVersionSpy.mockImplementation(() => []);

      findSpy.mockImplementation(() => '');

      dlSpy.mockImplementation(async () => '/some/temp/path');
      let toolPath = path.normalize('/cache/node/12.16.2/x64');
      exSpy.mockImplementation(async () => '/some/other/temp/path');
      cacheSpy.mockImplementation(async () => toolPath);

      await main.run();

      expect(dbgSpy.mock.calls[0][0]).toBe('requested v8 canary distribution');
      expect(dbgSpy.mock.calls[1][0]).toBe('evaluating 17 versions');
      expect(dbgSpy.mock.calls[2][0]).toBe(
        'matched: v20.0.0-v8-canary20221103f7e2421e91'
      );
      expect(logSpy.mock.calls[0][0]).toBe(
        'getting v8-canary node version v20.0.0-v8-canary20221103f7e2421e91...'
      );
      expect(logSpy.mock.calls[1][0]).toBe(
        'Attempt to find existing version in cache...'
      );
      expect(dbgSpy.mock.calls[3][0]).toBe('evaluating 0 versions');
      expect(dbgSpy.mock.calls[4][0]).toBe('match not found');
      expect(logSpy.mock.calls[2][0]).toBe(
        'Attempting to download v20.0.0-v8-canary20221103f7e2421e91...'
      );
      expect(dbgSpy.mock.calls[5][0]).toBe('No manifest cached');
      expect(dbgSpy.mock.calls[6][0]).toBe(
        'Getting manifest from actions/node-versions@main'
      );
      expect(dbgSpy.mock.calls[7][0].slice(0, 6)).toBe('check ');
      expect(dbgSpy.mock.calls[13][0].slice(0, 6)).toBe('check ');
      expect(logSpy.mock.calls[3][0]).toBe(
        'Not found in manifest.  Falling back to download directly from Node'
      );
      expect(dbgSpy.mock.calls[14][0]).toBe('evaluating 17 versions');
      expect(dbgSpy.mock.calls[15][0]).toBe(
        'matched: v20.0.0-v8-canary20221103f7e2421e91'
      );
      expect(dbgSpy.mock.calls[16][0]).toBe('requested v8 canary distribution');
      expect(logSpy.mock.calls[4][0]).toBe(
        'Acquiring 20.0.0-v8-canary20221103f7e2421e91 - x64 from https://nodejs.org/download/v8-canary/v20.0.0-v8-canary20221103f7e2421e91/node-v20.0.0-v8-canary20221103f7e2421e91-linux-x64.tar.gz'
      );

      expect(dlSpy).toHaveBeenCalledTimes(1);
      expect(exSpy).toHaveBeenCalledTimes(1);
      expect(cacheSpy).toHaveBeenCalledTimes(1);
    });

    it('v8 canary setup node flow with cached', async () => {
      let versionSpec = 'v20-v8-canary';

      inputs['node-version'] = versionSpec;
      inputs['always-auth'] = false;
      inputs['token'] = 'faketoken';

      os.platform = 'linux';
      os.arch = 'x64';

      findAllVersionSpy.mockImplementation(() => [
        'v20.0.0-v8-canary20221103f7e2421e91'
      ]);

      await main.run();

      expect(dbgSpy.mock.calls[0][0]).toBe('requested v8 canary distribution');
      expect(dbgSpy.mock.calls[1][0]).toBe('evaluating 17 versions');
      expect(dbgSpy.mock.calls[2][0]).toBe(
        'matched: v20.0.0-v8-canary20221103f7e2421e91'
      );
      expect(logSpy.mock.calls[0][0]).toBe(
        'getting v8-canary node version v20.0.0-v8-canary20221103f7e2421e91...'
      );
      expect(logSpy.mock.calls[1][0]).toBe(
        'Attempt to find existing version in cache...'
      );
      expect(dbgSpy.mock.calls[3][0]).toBe('evaluating 1 versions');
      expect(dbgSpy.mock.calls[4][0]).toBe(
        'matched: v20.0.0-v8-canary20221103f7e2421e91'
      );
      expect(logSpy.mock.calls[2][0]).toBe(
        'Found in cache @ v20.0.0-v8-canary20221103f7e2421e91'
      );
      expect(cnSpy.mock.calls[1][0].trim()).toBe(
        `::add-path::v20.0.0-v8-canary20221103f7e2421e91${path.sep}bin`
      );

      expect(dlSpy).not.toHaveBeenCalled();
      expect(exSpy).not.toHaveBeenCalled();
      expect(cacheSpy).not.toHaveBeenCalled();
    });
  });
});

describe('helper methods', () => {
  it('is not LTS alias', async () => {
    const versionSpec = 'v99.0.0-v8-canary';
    // @ts-ignore
    const isLtsAlias = im.isLtsAlias(versionSpec);
    expect(isLtsAlias).toBeFalsy();
  });

  it('is not isLatestSyntax', async () => {
    const versionSpec = 'v99.0.0-v8-canary';
    // @ts-ignore
    const isLatestSyntax = im.isLatestSyntax(versionSpec);
    expect(isLatestSyntax).toBeFalsy();
  });

  describe('getNodejsDistUrl', () => {
    it('dist url to be https://nodejs.org/download/v8-canary for input versionSpec', () => {
      const versionSpec = 'v99.0.0-v8-canary';
      // @ts-ignore
      const url = im.getNodejsDistUrl(versionSpec);
      expect(url).toBe('https://nodejs.org/download/v8-canary');
    });

    it('dist url to be https://nodejs.org/download/v8-canary for full versionSpec', () => {
      const versionSpec = 'v20.0.0-v8-canary20221103f7e2421e91';
      // @ts-ignore
      const url = im.getNodejsDistUrl(versionSpec);
      expect(url).toBe('https://nodejs.org/download/v8-canary');
    });
  });

  describe('parseNodeVersionFile', () => {
    each`
      contents                                     | expected
      ${'12'}                                      | ${'12'}
      ${'12.3'}                                    | ${'12.3'}
      ${'12.3.4'}                                  | ${'12.3.4'}
      ${'v12.3.4'}                                 | ${'12.3.4'}
      ${'lts/erbium'}                              | ${'lts/erbium'}
      ${'lts/*'}                                   | ${'lts/*'}
      ${'nodejs 12.3.4'}                           | ${'12.3.4'}
      ${'ruby 2.3.4\nnodejs 12.3.4\npython 3.4.5'} | ${'12.3.4'}
      ${''}                                        | ${''}
      ${'unknown format'}                          | ${'unknown format'}
    `.it('parses "$contents"', ({contents, expected}) => {
      expect(im.parseNodeVersionFile(contents)).toBe(expected);
    });
  });
});
