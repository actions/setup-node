import * as core from '@actions/core';
import * as cache from '@actions/cache';
import * as path from 'path';
import * as glob from '@actions/glob';

import * as utils from '../src/cache-utils';
import {restoreCache} from '../src/cache-restore';

describe('cache-restore', () => {
  process.env['GITHUB_WORKSPACE'] = path.join(__dirname, 'data');
  if (!process.env.RUNNER_OS) {
    process.env.RUNNER_OS = 'Linux';
  }
  const platform = process.env.RUNNER_OS;
  const commonPath = '/some/random/path';
  const npmCachePath = `${commonPath}/npm`;
  const pnpmCachePath = `${commonPath}/pnpm`;
  const yarn1CachePath = `${commonPath}/yarn1`;
  const yarn2CachePath = `${commonPath}/yarn2`;
  const yarnFileHash =
    'b8a0bae5243251f7c07dd52d1f78ff78281dfefaded700a176261b6b54fa245b';
  const npmFileHash =
    'abf7c9b306a3149dcfba4673e2362755503bcceaab46f0e4e6fee0ade493e20c';
  const pnpmFileHash =
    '26309058093e84713f38869c50cf1cee9b08155ede874ec1b44ce3fca8c68c70';
  const cachesObject = {
    [npmCachePath]: npmFileHash,
    [pnpmCachePath]: pnpmFileHash,
    [yarn1CachePath]: yarnFileHash,
    [yarn2CachePath]: yarnFileHash
  };

  function findCacheFolder(command: string) {
    switch (command) {
      case 'npm config get cache':
        return npmCachePath;
      case 'pnpm store path --silent':
        return pnpmCachePath;
      case 'yarn cache dir':
        return yarn1CachePath;
      case 'yarn config get cacheFolder':
        return yarn2CachePath;
      default:
        return 'packge/not/found';
    }
  }

  let saveStateSpy: jest.SpyInstance;
  let infoSpy: jest.SpyInstance;
  let debugSpy: jest.SpyInstance;
  let setOutputSpy: jest.SpyInstance;
  let getCommandOutputSpy: jest.SpyInstance;
  let restoreCacheSpy: jest.SpyInstance;
  let hashFilesSpy: jest.SpyInstance;

  beforeEach(() => {
    // core
    infoSpy = jest.spyOn(core, 'info');
    infoSpy.mockImplementation(() => undefined);

    debugSpy = jest.spyOn(core, 'debug');
    debugSpy.mockImplementation(() => undefined);

    setOutputSpy = jest.spyOn(core, 'setOutput');
    setOutputSpy.mockImplementation(() => undefined);

    saveStateSpy = jest.spyOn(core, 'saveState');
    saveStateSpy.mockImplementation(() => undefined);

    // glob
    hashFilesSpy = jest.spyOn(glob, 'hashFiles');
    hashFilesSpy.mockImplementation((pattern: string) => {
      if (pattern.includes('package-lock.json')) {
        return npmFileHash;
      } else if (pattern.includes('pnpm-lock.yaml')) {
        return pnpmFileHash;
      } else if (pattern.includes('yarn.lock')) {
        return yarnFileHash;
      } else {
        return '';
      }
    });

    // cache
    restoreCacheSpy = jest.spyOn(cache, 'restoreCache');
    restoreCacheSpy.mockImplementation(
      (cachePaths: Array<string>, key: string) => {
        if (!cachePaths || cachePaths.length === 0) {
          return undefined;
        }

        const cachPath = cachePaths[0];
        const fileHash = cachesObject[cachPath];

        if (key.includes(fileHash)) {
          return key;
        }

        return undefined;
      }
    );

    // cache-utils
    getCommandOutputSpy = jest.spyOn(utils, 'getCommandOutput');
  });

  describe('Validate provided package manager', () => {
    it.each([['npm7'], ['npm6'], ['pnpm6'], ['yarn1'], ['yarn2'], ['random']])(
      'Throw an error because %s is not supported',
      async packageManager => {
        await expect(restoreCache(packageManager, '')).rejects.toThrow(
          `Caching for '${packageManager}' is not supported`
        );
      }
    );
  });

  describe('Restore dependencies', () => {
    it.each([
      ['yarn', '2.1.2', yarnFileHash],
      ['yarn', '1.2.3', yarnFileHash],
      ['npm', '', npmFileHash],
      ['pnpm', '', pnpmFileHash]
    ])(
      'restored dependencies for %s',
      async (packageManager, toolVersion, fileHash) => {
        getCommandOutputSpy.mockImplementation((command: string) => {
          if (command.includes('version')) {
            return toolVersion;
          } else {
            return findCacheFolder(command);
          }
        });

        await restoreCache(packageManager, '');
        expect(hashFilesSpy).toHaveBeenCalled();
        expect(infoSpy).toHaveBeenCalledWith(
          `Cache restored from key: node-cache-${platform}-${packageManager}-${fileHash}`
        );
        expect(infoSpy).not.toHaveBeenCalledWith(
          `${packageManager} cache is not found`
        );
        expect(setOutputSpy).toHaveBeenCalledWith('cache-hit', true);
      }
    );
  });

  describe('Dependencies changed', () => {
    it.each([
      ['yarn', '2.1.2', yarnFileHash],
      ['yarn', '1.2.3', yarnFileHash],
      ['npm', '', npmFileHash],
      ['pnpm', '', pnpmFileHash]
    ])(
      'dependencies are changed %s',
      async (packageManager, toolVersion, fileHash) => {
        getCommandOutputSpy.mockImplementation((command: string) => {
          if (command.includes('version')) {
            return toolVersion;
          } else {
            return findCacheFolder(command);
          }
        });

        restoreCacheSpy.mockImplementationOnce(() => undefined);
        await restoreCache(packageManager, '');
        expect(hashFilesSpy).toHaveBeenCalled();
        expect(infoSpy).toHaveBeenCalledWith(
          `${packageManager} cache is not found`
        );
        expect(setOutputSpy).toHaveBeenCalledWith('cache-hit', false);
      }
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
  });
});
