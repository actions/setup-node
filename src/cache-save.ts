import * as core from '@actions/core';
import * as cache from '@actions/cache';
import fs from 'fs';
import {State} from './constants';
import {getCacheDirectoriesPaths, getPackageManagerInfo} from './cache-utils';

// Catch and log any unhandled exceptions.  These exceptions can leak out of the uploadChunk method in
// @actions/toolkit when a failed upload closes the file descriptor causing any in-process reads to
// throw an uncaught exception.  Instead of failing this action, just warn.
process.on('uncaughtException', e => {
  const warningPrefix = '[warning]';
  core.info(`${warningPrefix}${e.message}`);
});

export async function run() {
  try {
    const cacheLock = core.getInput('cache');
    await cachePackages(cacheLock);
  } catch (error) {
    core.setFailed(error.message);
  }
}

const cachePackages = async (packageManager: string) => {
  const state = core.getState(State.CacheMatchedKey);
  const primaryKey = core.getState(State.CachePrimaryKey);

  const packageManagerInfo = await getPackageManagerInfo(packageManager);
  if (!packageManagerInfo) {
    core.debug(`Caching for '${packageManager}' is not supported`);
    return;
  }

  // TODO: core.getInput has a bug - it can return undefined despite its definition
  //       export declare function getInput(name: string, options?: InputOptions): string;
  const cacheDependencyPath = core.getInput('cache-dependency-path') || '';
  const cachePaths = await getCacheDirectoriesPaths(
    packageManagerInfo,
    cacheDependencyPath
  );

  if (cachePaths.length === 0) {
    throw new Error(
      `Cache folder paths are not retrieved for ${packageManager} with cache-dependency-path = ${cacheDependencyPath}`
    );
  }

  if (primaryKey === state) {
    core.info(
      `Cache hit occurred on the primary key ${primaryKey}, not saving cache.`
    );
    return;
  }

  const cacheId = await cache.saveCache(cachePaths, primaryKey);
  if (cacheId == -1) {
    return;
  }

  core.info(`Cache saved with the key: ${primaryKey}`);
};

run();
