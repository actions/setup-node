import * as cache from '@actions/cache';
import * as core from '@actions/core';
import * as glob from '@actions/glob';
import path from 'path';
import fs from 'fs';

import {State, Outputs} from './constants';
import {
  getCacheDirectoryPath,
  getPackageManagerInfo,
  PackageManagerInfo
} from './cache-utils';

export const restoreCache = async (
  packageManager: string,
  cacheDependencyPath?: string
) => {
  const packageManagerInfo = await getPackageManagerInfo(packageManager);
  if (!packageManagerInfo) {
    throw new Error(`Caching for '${packageManager}' is not supported`);
  }
  const platform = process.env.RUNNER_OS;

  const cachePath = await getCacheDirectoryPath(
    packageManagerInfo,
    packageManager
  );
  const lockFilePath = cacheDependencyPath
    ? cacheDependencyPath
    : findLockFile(packageManagerInfo);
  const fileHash = await glob.hashFiles(lockFilePath);

  if (!fileHash) {
    throw new Error(
      'Some specified paths were not resolved, unable to cache dependencies.'
    );
  }

  const primaryKey = `node-cache-${platform}-${packageManager}-${fileHash}`;
  core.debug(`primary key is ${primaryKey}`);

  core.saveState(State.CachePrimaryKey, primaryKey);

  const cacheKey = await cache.restoreCache([cachePath], primaryKey);

  if (!cacheKey) {
    core.info(`${packageManager} cache is not found`);
    return;
  }

  core.saveState(State.CacheMatchedKey, cacheKey);
  core.info(`Cache restored from key: ${cacheKey}`);
};

const findLockFile = (packageManager: PackageManagerInfo) => {
  let lockFiles = packageManager.lockFilePatterns;
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
