import * as cache from '@actions/cache';
import * as core from '@actions/core';
import * as glob from '@actions/glob';
import path from 'path';
import fs from 'fs';

import {State} from './constants';
import {
  getCacheDirectories,
  getPackageManagerInfo,
  repoHasYarnBerryManagedDependencies,
  PackageManagerInfo
} from './cache-utils';

export const restoreCache = async (
  packageManager: string,
  cacheDependencyPath: string
) => {
  const packageManagerInfo = await getPackageManagerInfo(packageManager);
  if (!packageManagerInfo) {
    throw new Error(`Caching for '${packageManager}' is not supported`);
  }
  const platform = process.env.RUNNER_OS;

  const cachePaths = await getCacheDirectories(
    packageManagerInfo,
    cacheDependencyPath
  );
  core.saveState(State.CachePaths, cachePaths);
  const lockFilePath = cacheDependencyPath
    ? cacheDependencyPath
    : findLockFile(packageManagerInfo);
  const fileHash = await glob.hashFiles(lockFilePath);

  if (!fileHash) {
    throw new Error(
      'Some specified paths were not resolved, unable to cache dependencies.'
    );
  }

  const keyPrefix = `node-cache-${platform}-${packageManager}`;
  const primaryKey = `${keyPrefix}-${fileHash}`;
  core.debug(`primary key is ${primaryKey}`);

  core.saveState(State.CachePrimaryKey, primaryKey);

  const isManagedByYarnBerry = await repoHasYarnBerryManagedDependencies(
    packageManagerInfo,
    cacheDependencyPath
  );
  let cacheKey: string | undefined;
  if (isManagedByYarnBerry) {
    core.info(
      'All dependencies are managed locally by yarn3, the previous cache can be used'
    );
    cacheKey = await cache.restoreCache(cachePaths, primaryKey, [keyPrefix]);
  } else {
    cacheKey = await cache.restoreCache(cachePaths, primaryKey);
  }

  core.setOutput('cache-hit', Boolean(cacheKey));

  if (!cacheKey) {
    core.info(`${packageManager} cache is not found`);
    return;
  }

  core.saveState(State.CacheMatchedKey, cacheKey);
  core.info(`Cache restored from key: ${cacheKey}`);
};

const findLockFile = (packageManager: PackageManagerInfo) => {
  const lockFiles = packageManager.lockFilePatterns;
  const workspace = process.env.GITHUB_WORKSPACE!;

  const rootContent = fs.readdirSync(workspace);

  const lockFile = lockFiles.find(item => rootContent.includes(item));
  if (!lockFile) {
    throw new Error(
      `Dependencies lock file is not found in ${workspace}. Supported file patterns: ${lockFiles.toString()}`
    );
  }

  return path.join(workspace, lockFile);
};
