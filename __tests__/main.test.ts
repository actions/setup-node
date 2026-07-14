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
import path from 'path';
import osm from 'os';

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

jest.unstable_mockModule('@actions/exec', () => ({
  exec: jest.fn(),
  getExecOutput: jest.fn()
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
  findFromManifest: jest.fn()
}));

jest.unstable_mockModule('@actions/cache', () => ({
  saveCache: jest.fn(),
  restoreCache: jest.fn(),
  isFeatureAvailable: jest.fn()
}));

jest.unstable_mockModule('@actions/io', () => ({
  which: jest.fn(),
  mkdirP: jest.fn(),
  rmRF: jest.fn(),
  mv: jest.fn(),
  cp: jest.fn()
}));

// Pre-import real util before mocking so we can spread it
const realUtil = await import('../src/util.js');

jest.unstable_mockModule('../src/util.js', () => ({
  ...realUtil,
  getNodeVersionFromFile: jest.fn(realUtil.getNodeVersionFromFile)
}));

// Dynamic imports after mocking
const core = await import('@actions/core');
const exec = await import('@actions/exec');
const tc = await import('@actions/tool-cache');
const cache = await import('@actions/cache');
const io = await import('@actions/io');
const main = await import('../src/main.js');
const util = await import('../src/util.js');
const {default: OfficialBuilds} =
  await import('../src/distributions/official_builds/official_builds.js');

import each from 'jest-each';

describe('main tests', () => {
  let inputs = {} as any;
  let os = {} as any;

  let infoSpy: jest.Mock;
  let warningSpy: jest.Mock;
  let saveStateSpy: jest.Mock;
  let inSpy: jest.Mock;
  let setOutputSpy: jest.Mock;
  let startGroupSpy: jest.Mock;
  let endGroupSpy: jest.Mock;

  let whichSpy: jest.Mock;

  let existsSpy: jest.Mock;

  let getExecOutputSpy: jest.Mock;

  let getNodeVersionFromFileSpy: jest.Mock;
  let cnSpy: jest.SpiedFunction<typeof process.stdout.write>;
  let findSpy: jest.Mock;
  let isCacheActionAvailable: jest.Mock;

  let setupNodeJsSpy: jest.SpiedFunction<
    typeof OfficialBuilds.prototype.setupNodeJs
  >;

  beforeEach(() => {
    inputs = {};

    // node
    os = {};
    console.log('::stop-commands::stoptoken');
    process.env['GITHUB_WORKSPACE'] = path.join(__dirname, 'data');
    process.env['GITHUB_PATH'] = ''; // Stub out ENV file functionality so we can verify it writes to standard out
    process.env['GITHUB_OUTPUT'] = ''; // Stub out ENV file functionality so we can verify it writes to standard out
    infoSpy = core.info as jest.Mock;
    infoSpy.mockImplementation(() => {});
    setOutputSpy = core.setOutput as jest.Mock;
    setOutputSpy.mockImplementation(() => {});
    warningSpy = core.warning as jest.Mock;
    warningSpy.mockImplementation(() => {});
    saveStateSpy = core.saveState as jest.Mock;
    saveStateSpy.mockImplementation(() => {});
    startGroupSpy = core.startGroup as jest.Mock;
    startGroupSpy.mockImplementation(() => {});
    endGroupSpy = core.endGroup as jest.Mock;
    endGroupSpy.mockImplementation(() => {});
    inSpy = core.getInput as jest.Mock;
    inSpy.mockImplementation((name: any) => inputs[name]);

    whichSpy = io.which as jest.Mock;

    getExecOutputSpy = exec.getExecOutput as jest.Mock;

    findSpy = tc.find as jest.Mock;

    isCacheActionAvailable = cache.isFeatureAvailable as jest.Mock;

    cnSpy = jest.spyOn(process.stdout, 'write');
    cnSpy.mockImplementation(() => true);

    setupNodeJsSpy = jest.spyOn(OfficialBuilds.prototype, 'setupNodeJs');
    setupNodeJsSpy.mockImplementation(async () => {});
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
    beforeEach(() => {
      (util.getNodeVersionFromFile as jest.Mock).mockImplementation(
        realUtil.getNodeVersionFromFile as any
      );
    });

    each`
      contents                                                                                   | expected
      ${'12'}                                                                                    | ${'12'}
      ${'12.3'}                                                                                  | ${'12.3'}
      ${'12.3.4'}                                                                                | ${'12.3.4'}
      ${'v12.3.4'}                                                                               | ${'12.3.4'}
      ${'lts/erbium'}                                                                            | ${'lts/erbium'}
      ${'lts/*'}                                                                                 | ${'lts/*'}
      ${'nodejs 12.3.4'}                                                                         | ${'12.3.4'}
      ${'ruby 2.3.4\nnodejs 12.3.4\npython 3.4.5'}                                               | ${'12.3.4'}
      ${''}                                                                                      | ${''}
      ${'unknown format'}                                                                        | ${'unknown format'}
      ${'  14.1.0  '}                                                                            | ${'14.1.0'}
      ${'{}'}                                                                                    | ${null}
      ${'{"volta": {"node": ">=14.0.0 <=17.0.0"}}'}                                              | ${'>=14.0.0 <=17.0.0'}
      ${'{"volta": {"extends": "./package.json"}}'}                                              | ${'18.0.0'}
      ${'{"engines": {"node": "17.0.0"}}'}                                                       | ${'17.0.0'}
      ${'{"devEngines": {"runtime": {"name": "node", "version": "22.0.0"}}}'}                    | ${'22.0.0'}
      ${'{"devEngines": {"runtime": [{"name": "bun"}, {"name": "node", "version": "22.0.0"}]}}'} | ${'22.0.0'}
    `.it('parses "$contents"', ({contents, expected}: any) => {
      const existsSpy = jest.spyOn(fs, 'existsSync');
      existsSpy.mockImplementation(() => true);

      const readFileSpy = jest.spyOn(fs, 'readFileSync');
      readFileSpy.mockImplementation((filePath: any) => {
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
    ])('Tools versions %p', async (obj: any) => {
      (
        getExecOutputSpy as jest.Mock<typeof exec.getExecOutput>
      ).mockImplementation(async (command: string) => {
        if (Reflect.has(obj, command) && !obj[command]) {
          return {
            stdout: '',
            stderr: `${command} does not exist`,
            exitCode: 1
          };
        }

        return {stdout: obj[command], stderr: '', exitCode: 0};
      });

      whichSpy.mockImplementation((cmd: any) => {
        return `some/${cmd}/path`;
      });

      await util.printEnvDetailsAndSetOutput();

      expect(setOutputSpy).toHaveBeenCalledWith('node-version', obj['node']);
      Object.getOwnPropertyNames(obj).forEach((name: any) => {
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

      getNodeVersionFromFileSpy = util.getNodeVersionFromFile as jest.Mock;
      getNodeVersionFromFileSpy.mockImplementation(
        realUtil.getNodeVersionFromFile as any
      );
    });

    afterEach(() => {
      getNodeVersionFromFileSpy.mockImplementation(
        realUtil.getNodeVersionFromFile as any
      );
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
      expect(core.setFailed as jest.Mock).toHaveBeenCalledWith(
        `The specified node version file at: ${versionFilePath} does not exist`
      );
    });
  });

  describe('cache on GHES', () => {
    it('Should throw an error, because cache is not supported', async () => {
      inputs['node-version'] = '12';
      inputs['cache'] = 'npm';

      inSpy.mockImplementation((name: any) => inputs[name]);

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

      inSpy.mockImplementation((name: any) => inputs[name]);

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

  describe('cache feature tests', () => {
    it('Should enable caching when packageManager is npm and cache input is not provided', async () => {
      inputs['package-manager-cache'] = 'true';
      inputs['cache'] = '';
      isCacheActionAvailable.mockImplementation(() => true);

      inSpy.mockImplementation((name: any) => inputs[name]);
      const readFileSpy = jest.spyOn(fs, 'readFileSync');
      readFileSpy.mockImplementation(() =>
        JSON.stringify({
          packageManager: 'npm@10.8.2'
        })
      );

      await main.run();

      expect(saveStateSpy).toHaveBeenCalledWith(expect.anything(), 'npm');
    });

    it('Should enable caching when devEngines.packageManager.name is "npm" and cache input is not provided', async () => {
      inputs['package-manager-cache'] = 'true';
      inputs['cache'] = '';
      isCacheActionAvailable.mockImplementation(() => true);

      inSpy.mockImplementation((name: any) => inputs[name]);
      const readFileSpy = jest.spyOn(fs, 'readFileSync');
      readFileSpy.mockImplementation(() =>
        JSON.stringify({
          devEngines: {
            packageManager: {name: 'npm'}
          }
        })
      );

      await main.run();

      expect(saveStateSpy).toHaveBeenCalledWith(expect.anything(), 'npm');
    });

    it('Should enable caching when devEngines.packageManager is array and one entry has name "npm"', async () => {
      inputs['package-manager-cache'] = 'true';
      inputs['cache'] = '';
      isCacheActionAvailable.mockImplementation(() => true);

      inSpy.mockImplementation((name: any) => inputs[name]);
      const readFileSpy = jest.spyOn(fs, 'readFileSync');
      readFileSpy.mockImplementation(() =>
        JSON.stringify({
          devEngines: {
            packageManager: [{name: 'pnpm'}, {name: 'npm'}]
          }
        })
      );

      await main.run();

      expect(saveStateSpy).toHaveBeenCalledWith(expect.anything(), 'npm');
    });

    it('Should not enable caching if packageManager is "pnpm@8.0.0" and cache input is not provided', async () => {
      inputs['package-manager-cache'] = 'true';
      inputs['cache'] = '';
      inSpy.mockImplementation((name: any) => inputs[name]);
      const readFileSpy = jest.spyOn(fs, 'readFileSync');
      readFileSpy.mockImplementation(() =>
        JSON.stringify({
          packageManager: 'pnpm@8.0.0'
        })
      );

      await main.run();

      expect(saveStateSpy).not.toHaveBeenCalled();
    });

    it('Should not enable caching if devEngines.packageManager.name is "pnpm"', async () => {
      inputs['package-manager-cache'] = 'true';
      inputs['cache'] = '';
      inSpy.mockImplementation((name: any) => inputs[name]);
      const readFileSpy = jest.spyOn(fs, 'readFileSync');
      readFileSpy.mockImplementation(() =>
        JSON.stringify({
          devEngines: {
            packageManager: {name: 'pnpm'}
          }
        })
      );

      await main.run();

      expect(saveStateSpy).not.toHaveBeenCalled();
    });

    it('Should not enable caching if devEngines.packageManager is array without "npm"', async () => {
      inputs['package-manager-cache'] = 'true';
      inputs['cache'] = '';
      inSpy.mockImplementation((name: any) => inputs[name]);
      const readFileSpy = jest.spyOn(fs, 'readFileSync');
      readFileSpy.mockImplementation(() =>
        JSON.stringify({
          devEngines: {
            packageManager: [{name: 'pnpm'}, {name: 'yarn'}]
          }
        })
      );

      await main.run();

      expect(saveStateSpy).not.toHaveBeenCalled();
    });

    it('Should not enable caching if packageManager field is missing in package.json and cache input is not provided', async () => {
      inputs['package-manager-cache'] = 'true';
      inputs['cache'] = '';
      inSpy.mockImplementation((name: any) => inputs[name]);
      const readFileSpy = jest.spyOn(fs, 'readFileSync');
      readFileSpy.mockImplementation(() =>
        JSON.stringify({
          // packageManager field is not present
        })
      );

      await main.run();

      expect(saveStateSpy).not.toHaveBeenCalled();
    });

    it('Should skip caching when package-manager-cache is false', async () => {
      inputs['package-manager-cache'] = 'false';
      inputs['cache'] = '';
      inSpy.mockImplementation((name: any) => inputs[name]);
      await main.run();
      expect(saveStateSpy).not.toHaveBeenCalled();
    });

    it('Should enable caching with cache input explicitly provided', async () => {
      inputs['package-manager-cache'] = 'true';
      inputs['cache'] = 'npm';
      inSpy.mockImplementation((name: any) => inputs[name]);
      isCacheActionAvailable.mockImplementation(() => true);
      await main.run();
      expect(saveStateSpy).toHaveBeenCalledWith(expect.anything(), 'npm');
    });
  });
});
