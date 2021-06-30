import * as core from '@actions/core';
import * as io from '@actions/io';
import * as tc from '@actions/tool-cache';
import fs from 'fs';
import cp from 'child_process';
import osm = require('os');
import path from 'path';
import * as main from '../src/main';
import * as im from '../src/installer';
import * as auth from '../src/authutil';

let nodeTestManifest = require('./data/versions-manifest.json');
let nodeTestDist = require('./data/node-dist-index.json');

describe('setup-node', () => {
  let inputs = {} as any;
  let os = {} as any;

  let inSpy: jest.SpyInstance;
  let findSpy: jest.SpyInstance;
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
  let execSpy: jest.SpyInstance;
  let authSpy: jest.SpyInstance;

  beforeEach(() => {
    // @actions/core
    console.log('::stop-commands::stoptoken'); // Disable executing of runner commands when running tests in actions
    process.env['GITHUB_PATH'] = ''; // Stub out ENV file functionality so we can verify it writes to standard out
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
    dlSpy = jest.spyOn(tc, 'downloadTool');
    exSpy = jest.spyOn(tc, 'extractTar');
    cacheSpy = jest.spyOn(tc, 'cacheDir');
    getManifestSpy = jest.spyOn(tc, 'getManifestFromRepo');
    getDistSpy = jest.spyOn(im, 'getVersionsFromDist');

    // io
    whichSpy = jest.spyOn(io, 'which');
    existsSpy = jest.spyOn(fs, 'existsSync');
    mkdirpSpy = jest.spyOn(io, 'mkdirP');

    // disable authentication portion for installer tests
    authSpy = jest.spyOn(auth, 'configAuthentication');
    authSpy.mockImplementation(() => {});

    // gets
    getManifestSpy.mockImplementation(
      () => <tc.IToolRelease[]>nodeTestManifest
    );
    getDistSpy.mockImplementation(() => <im.INodeVersion>nodeTestDist);

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
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
    //jest.restoreAllMocks();
  });

  afterAll(async () => {
    console.log('::stoptoken::'); // Re-enable executing of runner commands when running tests in actions
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
    expect(versions?.length).toBe(6);
  });

  it('can mock dist versions', async () => {
    let versions: im.INodeVersion[] = await im.getVersionsFromDist();
    expect(versions).toBeDefined();
    expect(versions?.length).toBe(23);
  });

  it('can find 12.16.2 from manifest on osx', async () => {
    os.platform = 'darwin';
    os.arch = 'x64';
    let versions: tc.IToolRelease[] | null = await tc.getManifestFromRepo(
      'actions',
      'node-versions',
      'mocktoken'
    );
    expect(versions).toBeDefined();
    let match = await tc.findFromManifest('12.16.2', true, versions);
    expect(match).toBeDefined();
    expect(match?.version).toBe('12.16.2');
    expect((match as any).lts).toBe('Erbium');
  });

  it('can find 12 from manifest on linux', async () => {
    os.platform = 'linux';
    os.arch = 'x64';
    let versions: tc.IToolRelease[] | null = await tc.getManifestFromRepo(
      'actions',
      'node-versions',
      'mocktoken'
    );
    expect(versions).toBeDefined();
    let match = await tc.findFromManifest('12.16.2', true, versions);
    expect(match).toBeDefined();
    expect(match?.version).toBe('12.16.2');
    expect((match as any).lts).toBe('Erbium');
  });

  it('can find 10 from manifest on windows', async () => {
    os.platform = 'win32';
    os.arch = 'x64';
    let versions: tc.IToolRelease[] | null = await tc.getManifestFromRepo(
      'actions',
      'node-versions',
      'mocktoken'
    );
    expect(versions).toBeDefined();
    let match = await tc.findFromManifest('10', true, versions);
    expect(match).toBeDefined();
    expect(match?.version).toBe('10.20.1');
    expect((match as any).lts).toBe('Dubnium');
  });

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
      'https://github.com/actions/node-versions/releases/download/12.16.2-20200423.28/node-12.16.2-linux-x64.tar.gz';

    // ... but not in the local cache
    findSpy.mockImplementation(() => '');

    dlSpy.mockImplementation(async () => '/some/temp/path');
    let toolPath = path.normalize('/cache/node/12.16.2/x64');
    exSpy.mockImplementation(async () => '/some/other/temp/path');
    cacheSpy.mockImplementation(async () => toolPath);

    await main.run();

    let expPath = path.join(toolPath, 'bin');

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
      'https://github.com/actions/node-versions/releases/download/12.16.2-20200423.28/node-12.16.2-linux-x64.tar.gz';

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

  it('Acquires specified architecture of node', async () => {
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
        'https://github.com/actions/node-versions/releases/download/12.16.2-20200423.28/node-12.16.2-linux-x64.tar.gz';

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

  describe('LTS version', () => {
    beforeEach(() => {
      os.platform = 'linux';
      os.arch = 'x64';
      inputs.stable = 'true';
    });

    it('find latest LTS version and resolve it from local cache (lts/erbium)', async () => {
      // arrange
      inputs['node-version'] = 'lts/erbium';

      const toolPath = path.normalize('/cache/node/12.16.2/x64');
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
        `LTS alias 'erbium' for Node version 'lts/erbium'`
      );
      expect(dbgSpy).toHaveBeenCalledWith(
        `Found LTS release '12.16.2' for Node version 'lts/erbium'`
      );
      expect(logSpy).toHaveBeenCalledWith(`Found in cache @ ${toolPath}`);
      expect(cnSpy).toHaveBeenCalledWith(
        `::add-path::${path.join(toolPath, 'bin')}${osm.EOL}`
      );
    });

    it('find latest LTS version and install it from manifest (lts/erbium)', async () => {
      // arrange
      inputs['node-version'] = 'lts/erbium';

      const toolPath = path.normalize('/cache/node/12.16.2/x64');
      findSpy.mockImplementation(() => '');
      dlSpy.mockImplementation(async () => '/some/temp/path');
      exSpy.mockImplementation(async () => '/some/other/temp/path');
      cacheSpy.mockImplementation(async () => toolPath);
      const expectedUrl =
        'https://github.com/actions/node-versions/releases/download/12.16.2-20200423.28/node-12.16.2-linux-x64.tar.gz';

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
        `LTS alias 'erbium' for Node version 'lts/erbium'`
      );
      expect(dbgSpy).toHaveBeenCalledWith(
        `Found LTS release '12.16.2' for Node version 'lts/erbium'`
      );
      expect(logSpy).toHaveBeenCalledWith('Attempting to download 12...');
      expect(logSpy).toHaveBeenCalledWith(
        `Acquiring 12.16.2 - ${os.arch} from ${expectedUrl}`
      );
      expect(logSpy).toHaveBeenCalledWith('Extracting ...');
      expect(logSpy).toHaveBeenCalledWith('Adding to the cache ...');
      expect(cnSpy).toHaveBeenCalledWith(
        `::add-path::${path.join(toolPath, 'bin')}${osm.EOL}`
      );
    });

    it('find latest LTS version and resolve it from local cache (lts/*)', async () => {
      // arrange
      inputs['node-version'] = 'lts/*';

      const toolPath = path.normalize('/cache/node/14.0.0/x64');
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
        `LTS alias '*' for Node version 'lts/*'`
      );
      expect(dbgSpy).toHaveBeenCalledWith(
        `Found LTS release '14.0.0' for Node version 'lts/*'`
      );
      expect(logSpy).toHaveBeenCalledWith(`Found in cache @ ${toolPath}`);
      expect(cnSpy).toHaveBeenCalledWith(
        `::add-path::${path.join(toolPath, 'bin')}${osm.EOL}`
      );
    });

    it('find latest LTS version and install it from manifest (lts/*)', async () => {
      // arrange
      inputs['node-version'] = 'lts/*';

      const toolPath = path.normalize('/cache/node/14.0.0/x64');
      findSpy.mockImplementation(() => '');
      dlSpy.mockImplementation(async () => '/some/temp/path');
      exSpy.mockImplementation(async () => '/some/other/temp/path');
      cacheSpy.mockImplementation(async () => toolPath);
      const expectedUrl =
        'https://github.com/actions/node-versions/releases/download/14.0.0-20200423.30/node-14.0.0-linux-x64.tar.gz';

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
        `LTS alias '*' for Node version 'lts/*'`
      );
      expect(dbgSpy).toHaveBeenCalledWith(
        `Found LTS release '14.0.0' for Node version 'lts/*'`
      );
      expect(logSpy).toHaveBeenCalledWith('Attempting to download 14...');
      expect(logSpy).toHaveBeenCalledWith(
        `Acquiring 14.0.0 - ${os.arch} from ${expectedUrl}`
      );
      expect(logSpy).toHaveBeenCalledWith('Extracting ...');
      expect(logSpy).toHaveBeenCalledWith('Adding to the cache ...');
      expect(cnSpy).toHaveBeenCalledWith(
        `::add-path::${path.join(toolPath, 'bin')}${osm.EOL}`
      );
    });

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
});
