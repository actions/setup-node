import * as core from '@actions/core';
import * as cache from '@actions/cache';
import path from 'path';
import * as utils from '../src/cache-utils';
import {PackageManagerInfo, isCacheFeatureAvailable} from '../src/cache-utils';

describe('cache-utils', () => {
  const versionYarn1 = '1.2.3';

  let debugSpy: jest.SpyInstance;
  let getCommandOutputSpy: jest.SpyInstance;
  let isFeatureAvailable: jest.SpyInstance;
  let info: jest.SpyInstance;
  let warningSpy: jest.SpyInstance;

  beforeEach(() => {
    process.env['GITHUB_WORKSPACE'] = path.join(__dirname, 'data');
    debugSpy = jest.spyOn(core, 'debug');
    debugSpy.mockImplementation(msg => {});

    info = jest.spyOn(core, 'info');
    warningSpy = jest.spyOn(core, 'warning');

    isFeatureAvailable = jest.spyOn(cache, 'isFeatureAvailable');

    getCommandOutputSpy = jest.spyOn(utils, 'getCommandOutput');
  });

  describe('getPackageManagerInfo', () => {
    it.each<[string, PackageManagerInfo | null]>([
      ['npm', utils.supportedPackageManagers.npm],
      ['pnpm', utils.supportedPackageManagers.pnpm],
      ['yarn', utils.supportedPackageManagers.yarn1],
      ['yarn1', null],
      ['yarn2', null],
      ['npm7', null]
    ])('getPackageManagerInfo for %s is %o', async (packageManager, result) => {
      getCommandOutputSpy.mockImplementationOnce(() => versionYarn1);
      await expect(utils.getPackageManagerInfo(packageManager)).resolves.toBe(
        result
      );
    });
  });

  it('isCacheFeatureAvailable for GHES is false', () => {
    isFeatureAvailable.mockImplementation(() => false);
    process.env['GITHUB_SERVER_URL'] = 'https://www.test.com';

    expect(isCacheFeatureAvailable()).toBeFalsy();
    expect(warningSpy).toHaveBeenCalledWith(
      'Cache action is only supported on GHES version >= 3.5. If you are on version >=3.5 Please check with GHES admin if Actions cache service is enabled or not.'
    );
  });

  it('isCacheFeatureAvailable for GHES has an interhal error', () => {
    isFeatureAvailable.mockImplementation(() => false);
    process.env['GITHUB_SERVER_URL'] = '';
    isCacheFeatureAvailable();
    expect(warningSpy).toHaveBeenCalledWith(
      'The runner was not able to contact the cache service. Caching will be skipped'
    );
  });

  it('isCacheFeatureAvailable for GHES is available', () => {
    isFeatureAvailable.mockImplementation(() => true);

    expect(isCacheFeatureAvailable()).toStrictEqual(true);
  });

  afterEach(() => {
    process.env['GITHUB_SERVER_URL'] = '';
    jest.resetAllMocks();
    jest.clearAllMocks();
  });
});
