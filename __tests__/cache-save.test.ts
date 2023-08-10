import * as core from '@actions/core';
import * as cache from '@actions/cache';
import * as glob from '@actions/glob';
import fs from 'fs';
import path from 'path';

import * as utils from '../src/cache-utils';
import {run} from '../src/cache-save';
import {State} from '../src/constants';

describe('run', () => {
  const yarnFileHash =
    'b8a0bae5243251f7c07dd52d1f78ff78281dfefaded700a176261b6b54fa245b';
  const npmFileHash =
    'abf7c9b306a3149dcfba4673e2362755503bcceaab46f0e4e6fee0ade493e20c';
  const pnpmFileHash =
    '26309058093e84713f38869c50cf1cee9b08155ede874ec1b44ce3fca8c68c70';
  const commonPath = '/some/random/path';
  process.env['GITHUB_WORKSPACE'] = path.join(__dirname, 'data');

  const inputs = {} as any;

  let getInputSpy: jest.SpyInstance;
  let infoSpy: jest.SpyInstance;
  let warningSpy: jest.SpyInstance;
  let debugSpy: jest.SpyInstance;
  let setFailedSpy: jest.SpyInstance;
  let getStateSpy: jest.SpyInstance;
  let saveCacheSpy: jest.SpyInstance;
  let getCommandOutputSpy: jest.SpyInstance;
  let hashFilesSpy: jest.SpyInstance;
  let existsSpy: jest.SpyInstance;

  beforeEach(() => {
    getInputSpy = jest.spyOn(core, 'getInput');
    getInputSpy.mockImplementation((name: string) => inputs[name]);

    infoSpy = jest.spyOn(core, 'info');
    infoSpy.mockImplementation(() => undefined);

    warningSpy = jest.spyOn(core, 'warning');
    warningSpy.mockImplementation(() => undefined);

    setFailedSpy = jest.spyOn(core, 'setFailed');
    setFailedSpy.mockImplementation(() => undefined);

    debugSpy = jest.spyOn(core, 'debug');
    debugSpy.mockImplementation(() => undefined);

    getStateSpy = jest.spyOn(core, 'getState');

    // cache
    saveCacheSpy = jest.spyOn(cache, 'saveCache');
    saveCacheSpy.mockImplementation(() => undefined);

    // glob
    hashFilesSpy = jest.spyOn(glob, 'hashFiles');
    hashFilesSpy.mockImplementation((pattern: string) => {
      if (pattern.includes('package-lock.json')) {
        return npmFileHash;
      } else if (pattern.includes('yarn.lock')) {
        return yarnFileHash;
      } else {
        return '';
      }
    });

    existsSpy = jest.spyOn(fs, 'existsSync');
    existsSpy.mockImplementation(() => true);

    // utils
    getCommandOutputSpy = jest.spyOn(utils, 'getCommandOutput');
  });

  afterEach(() => {
    existsSpy.mockRestore();
  });

  describe('Package manager validation', () => {
    it('Package manager is not provided, skip caching', async () => {
      inputs['cache'] = '';

      await run();

      expect(setFailedSpy).not.toHaveBeenCalled();
      expect(infoSpy).not.toHaveBeenCalled();
      expect(saveCacheSpy).not.toHaveBeenCalled();
      expect(debugSpy).toHaveBeenLastCalledWith(
        "Caching for '' is not supported"
      );
    });

    it('Package manager is not valid, skip caching', async () => {
      inputs['cache'] = 'yarn3';
      getStateSpy.mockImplementation(key =>
        key === State.CachePackageManager ? inputs['cache'] : ''
      );

      await run();

      expect(setFailedSpy).not.toHaveBeenCalled();
      expect(infoSpy).not.toHaveBeenCalled();
      expect(saveCacheSpy).not.toHaveBeenCalled();
      expect(debugSpy).toHaveBeenLastCalledWith(
        "Caching for 'yarn3' is not supported"
      );
    });
  });

  describe('Validate unchanged cache is not saved', () => {
    it('should not save cache for yarn1', async () => {
      inputs['cache'] = 'yarn';
      getStateSpy.mockImplementation(key =>
        key === State.CachePackageManager
          ? inputs['cache']
          : key === State.CachePrimaryKey || key === State.CacheMatchedKey
          ? yarnFileHash
          : key === State.CachePaths
          ? '["/foo/bar"]'
          : 'not expected'
      );

      await run();

      expect(getInputSpy).not.toHaveBeenCalled();
      expect(getStateSpy).toHaveBeenCalledTimes(4);
      expect(getCommandOutputSpy).toHaveBeenCalledTimes(0);
      expect(debugSpy).toHaveBeenCalledTimes(0);
      expect(infoSpy).toHaveBeenCalledWith(
        `Cache hit occurred on the primary key ${yarnFileHash}, not saving cache.`
      );
      expect(setFailedSpy).not.toHaveBeenCalled();
    });

    it('should not save cache for yarn2', async () => {
      inputs['cache'] = 'yarn';
      getStateSpy.mockImplementation(key =>
        key === State.CachePackageManager
          ? inputs['cache']
          : key === State.CachePrimaryKey || key === State.CacheMatchedKey
          ? yarnFileHash
          : key === State.CachePaths
          ? '["/foo/bar"]'
          : 'not expected'
      );

      await run();

      expect(getInputSpy).not.toHaveBeenCalled();
      expect(getStateSpy).toHaveBeenCalledTimes(4);
      expect(getCommandOutputSpy).toHaveBeenCalledTimes(0);
      expect(debugSpy).toHaveBeenCalledTimes(0);
      expect(infoSpy).toHaveBeenCalledWith(
        `Cache hit occurred on the primary key ${yarnFileHash}, not saving cache.`
      );
      expect(setFailedSpy).not.toHaveBeenCalled();
    });

    it('should not save cache for npm', async () => {
      inputs['cache'] = 'npm';
      getStateSpy.mockImplementation(key =>
        key === State.CachePackageManager
          ? inputs['cache']
          : key === State.CachePrimaryKey || key === State.CacheMatchedKey
          ? yarnFileHash
          : key === State.CachePaths
          ? '["/foo/bar"]'
          : 'not expected'
      );
      getCommandOutputSpy.mockImplementationOnce(() => `${commonPath}/npm`);

      await run();

      expect(getInputSpy).not.toHaveBeenCalled();
      expect(getStateSpy).toHaveBeenCalledTimes(4);
      expect(getCommandOutputSpy).toHaveBeenCalledTimes(0);
      expect(debugSpy).toHaveBeenCalledTimes(0);
      expect(setFailedSpy).not.toHaveBeenCalled();
    });

    it('should not save cache for pnpm', async () => {
      inputs['cache'] = 'pnpm';
      getStateSpy.mockImplementation(key =>
        key === State.CachePackageManager
          ? inputs['cache']
          : key === State.CachePrimaryKey || key === State.CacheMatchedKey
          ? yarnFileHash
          : key === State.CachePaths
          ? '["/foo/bar"]'
          : 'not expected'
      );

      await run();

      expect(getInputSpy).not.toHaveBeenCalled();
      expect(getStateSpy).toHaveBeenCalledTimes(4);
      expect(getCommandOutputSpy).toHaveBeenCalledTimes(0);
      expect(debugSpy).toHaveBeenCalledTimes(0);
      expect(setFailedSpy).not.toHaveBeenCalled();
    });
  });

  describe('action saves the cache', () => {
    it('saves cache from yarn 1', async () => {
      inputs['cache'] = 'yarn';
      getStateSpy.mockImplementation((key: string) =>
        key === State.CachePackageManager
          ? inputs['cache']
          : key === State.CacheMatchedKey
          ? yarnFileHash
          : key === State.CachePrimaryKey
          ? npmFileHash
          : key === State.CachePaths
          ? '["/foo/bar"]'
          : 'not expected'
      );

      await run();

      expect(getInputSpy).not.toHaveBeenCalled();
      expect(getStateSpy).toHaveBeenCalledTimes(4);
      expect(getCommandOutputSpy).toHaveBeenCalledTimes(0);
      expect(debugSpy).toHaveBeenCalledTimes(0);
      expect(infoSpy).not.toHaveBeenCalledWith(
        `Cache hit occurred on the primary key ${yarnFileHash}, not saving cache.`
      );
      expect(saveCacheSpy).toHaveBeenCalled();
      expect(infoSpy).toHaveBeenLastCalledWith(
        `Cache saved with the key: ${npmFileHash}`
      );
      expect(setFailedSpy).not.toHaveBeenCalled();
    });

    it('saves cache from yarn 2', async () => {
      inputs['cache'] = 'yarn';
      getStateSpy.mockImplementation((key: string) =>
        key === State.CachePackageManager
          ? inputs['cache']
          : key === State.CacheMatchedKey
          ? yarnFileHash
          : key === State.CachePrimaryKey
          ? npmFileHash
          : key === State.CachePaths
          ? '["/foo/bar"]'
          : 'not expected'
      );

      await run();

      expect(getInputSpy).not.toHaveBeenCalled();
      expect(getStateSpy).toHaveBeenCalledTimes(4);
      expect(getCommandOutputSpy).toHaveBeenCalledTimes(0);
      expect(debugSpy).toHaveBeenCalledTimes(0);
      expect(infoSpy).not.toHaveBeenCalledWith(
        `Cache hit occurred on the primary key ${yarnFileHash}, not saving cache.`
      );
      expect(saveCacheSpy).toHaveBeenCalled();
      expect(infoSpy).toHaveBeenLastCalledWith(
        `Cache saved with the key: ${npmFileHash}`
      );
      expect(setFailedSpy).not.toHaveBeenCalled();
    });

    it('saves cache from npm', async () => {
      inputs['cache'] = 'npm';
      getStateSpy.mockImplementation((key: string) =>
        key === State.CachePackageManager
          ? inputs['cache']
          : key === State.CacheMatchedKey
          ? npmFileHash
          : key === State.CachePrimaryKey
          ? yarnFileHash
          : key === State.CachePaths
          ? '["/foo/bar"]'
          : 'not expected'
      );

      await run();

      expect(getInputSpy).not.toHaveBeenCalled();
      expect(getStateSpy).toHaveBeenCalledTimes(4);
      expect(getCommandOutputSpy).toHaveBeenCalledTimes(0);
      expect(debugSpy).toHaveBeenCalledTimes(0);
      expect(infoSpy).not.toHaveBeenCalledWith(
        `Cache hit occurred on the primary key ${npmFileHash}, not saving cache.`
      );
      expect(saveCacheSpy).toHaveBeenCalled();
      expect(infoSpy).toHaveBeenLastCalledWith(
        `Cache saved with the key: ${yarnFileHash}`
      );
      expect(setFailedSpy).not.toHaveBeenCalled();
    });

    it('saves cache from pnpm', async () => {
      inputs['cache'] = 'pnpm';
      getStateSpy.mockImplementation((key: string) =>
        key === State.CachePackageManager
          ? inputs['cache']
          : key === State.CacheMatchedKey
          ? pnpmFileHash
          : key === State.CachePrimaryKey
          ? npmFileHash
          : key === State.CachePaths
          ? '["/foo/bar"]'
          : 'not expected'
      );

      await run();

      expect(getInputSpy).not.toHaveBeenCalled();
      expect(getStateSpy).toHaveBeenCalledTimes(4);
      expect(getCommandOutputSpy).toHaveBeenCalledTimes(0);
      expect(debugSpy).toHaveBeenCalledTimes(0);
      expect(infoSpy).not.toHaveBeenCalledWith(
        `Cache hit occurred on the primary key ${pnpmFileHash}, not saving cache.`
      );
      expect(saveCacheSpy).toHaveBeenCalled();
      expect(infoSpy).toHaveBeenLastCalledWith(
        `Cache saved with the key: ${npmFileHash}`
      );
      expect(setFailedSpy).not.toHaveBeenCalled();
    });

    it('save with -1 cacheId , should not fail workflow', async () => {
      inputs['cache'] = 'npm';
      getStateSpy.mockImplementation((key: string) =>
        key === State.CachePackageManager
          ? inputs['cache']
          : key === State.CacheMatchedKey
          ? npmFileHash
          : key === State.CachePrimaryKey
          ? yarnFileHash
          : key === State.CachePaths
          ? '["/foo/bar"]'
          : 'not expected'
      );
      saveCacheSpy.mockImplementation(() => {
        return -1;
      });

      await run();

      expect(getInputSpy).not.toHaveBeenCalled();
      expect(getStateSpy).toHaveBeenCalledTimes(4);
      expect(getCommandOutputSpy).toHaveBeenCalledTimes(0);
      expect(debugSpy).toHaveBeenCalledTimes(0);
      expect(infoSpy).not.toHaveBeenCalledWith(
        `Cache hit occurred on the primary key ${npmFileHash}, not saving cache.`
      );
      expect(saveCacheSpy).toHaveBeenCalled();
      expect(infoSpy).not.toHaveBeenLastCalledWith(
        `Cache saved with the key: ${yarnFileHash}`
      );
      expect(setFailedSpy).not.toHaveBeenCalled();
    });

    it('saves with error from toolkit, should fail workflow', async () => {
      inputs['cache'] = 'npm';
      getStateSpy.mockImplementation((key: string) =>
        key === State.CachePackageManager
          ? inputs['cache']
          : key === State.CacheMatchedKey
          ? npmFileHash
          : key === State.CachePrimaryKey
          ? yarnFileHash
          : key === State.CachePaths
          ? '["/foo/bar"]'
          : 'not expected'
      );
      saveCacheSpy.mockImplementation(() => {
        throw new cache.ValidationError('Validation failed');
      });

      await run();

      expect(getInputSpy).not.toHaveBeenCalled();
      expect(getStateSpy).toHaveBeenCalledTimes(4);
      expect(getCommandOutputSpy).toHaveBeenCalledTimes(0);
      expect(debugSpy).toHaveBeenCalledTimes(0);
      expect(infoSpy).not.toHaveBeenCalledWith(
        `Cache hit occurred on the primary key ${npmFileHash}, not saving cache.`
      );
      expect(saveCacheSpy).toHaveBeenCalled();
      expect(setFailedSpy).toHaveBeenCalled();
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
  });
});
