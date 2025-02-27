import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as tc from '@actions/tool-cache';
import * as cache from '@actions/cache';
import * as io from '@actions/io';

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

  let whichSpy: jest.SpyInstance;

  let existsSpy: jest.SpyInstance;

  let getExecOutputSpy: jest.SpyInstance;

  let getNodeVersionFromFileSpy: jest.SpyInstance;
  let cnSpy: jest.SpyInstance;
  let findSpy: jest.SpyInstance;
  let isCacheActionAvailable: jest.SpyInstance;

  let setupNodeJsSpy: jest.SpyInstance;

  beforeEach(() => {
    inputs = {};

    // node
    os = {};
    console.log('::stop-commands::stoptoken');
    process.env['GITHUB_WORKSPACE'] = path.join(__dirname, 'data');
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

    whichSpy = jest.spyOn(io, 'which');

    getExecOutputSpy = jest.spyOn(exec, 'getExecOutput');

    findSpy = jest.spyOn(tc, 'find');

    isCacheActionAvailable = jest.spyOn(cache, 'isFeatureAvailable');

    cnSpy = jest.spyOn(process.stdout, 'write');
    cnSpy.mockImplementation(line => {
      // uncomment to debug
      process.stderr.write('write:' + line + '\n');
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

  describe('getNodeVersionFromFile', () => {
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
      ${'{"volta": {"extends": "./package.json"}}'}| ${'18.0.0'}
      ${'{"engines": {"node": "17.0.0"}}'}         | ${'17.0.0'}
      ${'{}'}                                      | ${null}
    `.it('parses "$contents"', ({contents, expected}) => {
      const existsSpy = jest.spyOn(fs, 'existsSync');
      existsSpy.mockImplementation(() => true);

      const readFileSpy = jest.spyOn(fs, 'readFileSync');
      readFileSpy.mockImplementation(filePath => {
        if (
          typeof filePath === 'string' &&
          path.basename(filePath) === 'package.json'
        ) {
          // Special case for volta.extends
          return '{"volta": {"node": "18.0.0"}}';
        }

        return contents;
      });

      expect(util.getNodeVersionFromFile('file')).toBe(expected);
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

      whichSpy.mockImplementation(cmd => {
        return `some/${cmd}/path`;
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
      delete inputs['node-version'];
      inputs['node-version-file'] = '.nvmrc';

      getNodeVersionFromFileSpy = jest.spyOn(util, 'getNodeVersionFromFile');
    });

    afterEach(() => {
      getNodeVersionFromFileSpy.mockRestore();
    });

    it('does not read node-version-file if node-version is provided', async () => {
      // Arrange
      inputs['node-version'] = '12';

      // Act
      await main.run();

      // Assert
      expect(inputs['node-version']).toBeDefined();
      expect(inputs['node-version-file']).toBeDefined();
      expect(getNodeVersionFromFileSpy).not.toHaveBeenCalled();
      expect(warningSpy).toHaveBeenCalledWith(
        'Both node-version and node-version-file inputs are specified, only node-version will be used'
      );
    });

    it('does not read node-version-file if node-version-file is not provided', async () => {
      // Arrange
      delete inputs['node-version-file'];

      // Act
      await main.run();

      // Assert
      expect(getNodeVersionFromFileSpy).not.toHaveBeenCalled();
    });

    it('reads node-version-file', async () => {
      // Arrange
      const expectedVersionSpec = '14';
      getNodeVersionFromFileSpy.mockImplementation(() => expectedVersionSpec);

      // Act
      await main.run();

      // Assert
      expect(getNodeVersionFromFileSpy).toHaveBeenCalled();
      expect(infoSpy).toHaveBeenCalledWith(
        `Resolved ${inputs['node-version-file']} as ${expectedVersionSpec}`
      );
    }, 10000);

    it('should throw an error if node-version-file is not accessible', async () => {
      // Arrange
      inputs['node-version-file'] = 'non-existing-file';
      const versionFilePath = path.join(
        __dirname,
        'data',
        inputs['node-version-file']
      );

      // Act
      await main.run();

      // Assert
      expect(getNodeVersionFromFileSpy).toHaveBeenCalled();
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
