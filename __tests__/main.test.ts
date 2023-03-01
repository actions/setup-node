import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as tc from '@actions/tool-cache';
import * as cache from '@actions/cache';

import fs from 'fs';
import path from 'path';
import osm from 'os';

import each from 'jest-each';

import * as main from '../src/main';
import * as util from '../src/util';
import OfficialBuilds from '../src/distributions/official_builds/official_builds';

describe('main tests', () => {
  let inputs = {} as any;
  let os = {} as any;

  let infoSpy: jest.SpyInstance;
  let warningSpy: jest.SpyInstance;
  let inSpy: jest.SpyInstance;
  let setOutputSpy: jest.SpyInstance;
  let startGroupSpy: jest.SpyInstance;
  let endGroupSpy: jest.SpyInstance;

  let existsSpy: jest.SpyInstance;

  let getExecOutputSpy: jest.SpyInstance;

  let parseNodeVersionSpy: jest.SpyInstance;
  let cnSpy: jest.SpyInstance;
  let findSpy: jest.SpyInstance;
  let isCacheActionAvailable: jest.SpyInstance;

  let setupNodeJsSpy: jest.SpyInstance;

  beforeEach(() => {
    inputs = {};

    // node
    os = {};
    console.log('::stop-commands::stoptoken');
    process.env['GITHUB_PATH'] = ''; // Stub out ENV file functionality so we can verify it writes to standard out
    process.env['GITHUB_OUTPUT'] = ''; // Stub out ENV file functionality so we can verify it writes to standard out
    infoSpy = jest.spyOn(core, 'info');
    infoSpy.mockImplementation(() => {});
    setOutputSpy = jest.spyOn(core, 'setOutput');
    setOutputSpy.mockImplementation(() => {});
    warningSpy = jest.spyOn(core, 'warning');
    warningSpy.mockImplementation(() => {});
    startGroupSpy = jest.spyOn(core, 'startGroup');
    startGroupSpy.mockImplementation(() => {});
    endGroupSpy = jest.spyOn(core, 'endGroup');
    endGroupSpy.mockImplementation(() => {});
    inSpy = jest.spyOn(core, 'getInput');
    inSpy.mockImplementation(name => inputs[name]);

    getExecOutputSpy = jest.spyOn(exec, 'getExecOutput');

    findSpy = jest.spyOn(tc, 'find');

    isCacheActionAvailable = jest.spyOn(cache, 'isFeatureAvailable');

    existsSpy = jest.spyOn(fs, 'existsSync');

    cnSpy = jest.spyOn(process.stdout, 'write');
    cnSpy.mockImplementation(line => {
      // uncomment to debug
      // process.stderr.write('write:' + line + '\n');
    });

    setupNodeJsSpy = jest.spyOn(OfficialBuilds.prototype, 'setupNodeJs');
    setupNodeJsSpy.mockImplementation(() => {});
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
    //jest.restoreAllMocks();
  });

  afterAll(async () => {
    console.log('::stoptoken::');
    jest.restoreAllMocks();
  }, 100000);

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
      ${'  14.1.0  '}                              | ${'14.1.0'}
      ${'{"volta": {"node": ">=14.0.0 <=17.0.0"}}'}| ${'>=14.0.0 <=17.0.0'}
      ${'{"engines": {"node": "17.0.0"}}'}         | ${'17.0.0'}
    `.it('parses "$contents"', ({contents, expected}) => {
      expect(util.parseNodeVersionFile(contents)).toBe(expected);
    });
  });

  describe('printEnvDetailsAndSetOutput', () => {
    it.each([
      [{node: '12.0.2', npm: '6.3.3', yarn: '1.22.11'}],
      [{node: '16.0.2', npm: '7.3.3', yarn: '2.22.11'}],
      [{node: '14.0.1', npm: '8.1.0', yarn: '3.2.1'}],
      [{node: '17.0.2', npm: '6.3.3', yarn: ''}]
    ])('Tools versions %p', async obj => {
      getExecOutputSpy.mockImplementation(async command => {
        if (Reflect.has(obj, command) && !obj[command]) {
          return {
            stdout: '',
            stderr: `${command} does not exist`,
            exitCode: 1
          };
        }

        return {stdout: obj[command], stderr: '', exitCode: 0};
      });

      await util.printEnvDetailsAndSetOutput();

      expect(setOutputSpy).toHaveBeenCalledWith('node-version', obj['node']);
      Object.getOwnPropertyNames(obj).forEach(name => {
        if (!obj[name]) {
          expect(infoSpy).toHaveBeenCalledWith(
            `[warning]${name} does not exist`
          );
        }
        expect(infoSpy).toHaveBeenCalledWith(`${name}: ${obj[name]}`);
      });
    });
  });

  describe('node-version-file flag', () => {
    beforeEach(() => {
      parseNodeVersionSpy = jest.spyOn(util, 'parseNodeVersionFile');
    });

    it('not used if node-version is provided', async () => {
      // Arrange
      inputs['node-version'] = '12';

      // Act
      await main.run();

      // Assert
      expect(parseNodeVersionSpy).toHaveBeenCalledTimes(0);
    }, 10000);

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
      expect(infoSpy).toHaveBeenCalledWith(
        `Resolved ${versionFile} as ${expectedVersionSpec}`
      );
    }, 10000);

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
      expect(infoSpy).toHaveBeenCalledWith(
        `Resolved ${versionFile} as ${expectedVersionSpec}`
      );
    }, 10000);

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

      const toolPath = path.normalize('/cache/node/12.16.1/x64');
      findSpy.mockImplementation(() => toolPath);

      // expect(logSpy).toHaveBeenCalledWith(`Found in cache @ ${toolPath}`);
      process.env['GITHUB_SERVER_URL'] = 'https://www.test.com';
      isCacheActionAvailable.mockImplementation(() => false);

      await main.run();

      expect(warningSpy).toHaveBeenCalledWith(
        `Cache action is only supported on GHES version >= 3.5. If you are on version >=3.5 Please check with GHES admin if Actions cache service is enabled or not.`
      );
    });

    it('Should throw an internal error', async () => {
      inputs['node-version'] = '12';
      inputs['cache'] = 'npm';

      inSpy.mockImplementation(name => inputs[name]);

      const toolPath = path.normalize('/cache/node/12.16.1/x64');
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
});
