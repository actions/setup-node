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

  beforeEach(() => {
    process.env['GITHUB_WORKSPACE'] = path.join(__dirname, 'data');
    debugSpy = jest.spyOn(core, 'debug');
    debugSpy.mockImplementation(msg => {});

    info = jest.spyOn(core, 'info');

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

  it('isCacheFeatureAvailable is false', () => {
    isFeatureAvailable.mockImplementation(() => false);
    process.env['GITHUB_SERVER_URL'] = 'https://www.test.com';

    expect(isCacheFeatureAvailable()).toBe(false);
    expect(info).toHaveBeenCalledWith(
      '[warning]Cache action is only supported on GHES version >= 3.5. If you are on version >=3.5 Please check with GHES admin if Actions cache service is enabled or not.'
    );
  });

  it('isCacheFeatureAvailable is false', () => {
    isFeatureAvailable.mockImplementation(() => false);
    process.env['GITHUB_SERVER_URL'] = '';

    expect(isCacheFeatureAvailable()).toBe(false);
    expect(info).toHaveBeenCalledWith(
      '[warning]An internal error has occurred in cache backend. Please check https://www.githubstatus.com/ for any ongoing issue in actions.'
    );
  });

  it('isCacheFeatureAvailable is true', () => {
    isFeatureAvailable.mockImplementation(() => true);

    expect(isCacheFeatureAvailable()).toBe(true);
    expect(info).not.toHaveBeenCalled();
  });

  afterEach(() => {
    process.env['GITHUB_SERVER_URL'] = '';
    jest.resetAllMocks();
    jest.clearAllMocks();
  });
});
