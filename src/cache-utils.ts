import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as cache from '@actions/cache';
import * as glob from '@actions/glob';
import path from 'path';
import fs from 'fs';
import {unique} from './util';

export interface PackageManagerInfo {
  name: string;
  lockFilePatterns: Array<string>;
  getCacheFolderPath: (projectDir?: string) => Promise<string>;
}

interface SupportedPackageManagers {
  npm: PackageManagerInfo;
  pnpm: PackageManagerInfo;
  yarn: PackageManagerInfo;
}
export const supportedPackageManagers: SupportedPackageManagers = {
  npm: {
    name: 'npm',
    lockFilePatterns: ['package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock'],
    getCacheFolderPath: () =>
      getCommandOutputNotEmpty(
        'npm config get cache',
        'Could not get npm cache folder path'
      )
  },
  pnpm: {
    name: 'pnpm',
    lockFilePatterns: ['pnpm-lock.yaml'],
    getCacheFolderPath: () =>
      getCommandOutputNotEmpty(
        'pnpm store path --silent',
        'Could not get pnpm cache folder path'
      )
  },
  yarn: {
    name: 'yarn',
    lockFilePatterns: ['yarn.lock'],
    getCacheFolderPath: async projectDir => {
      const yarnVersion = await getCommandOutputNotEmpty(
        `yarn --version`,
        'Could not retrieve version of yarn',
        projectDir
      );

      core.debug(
        `Consumed yarn version is ${yarnVersion} (working dir: "${
          projectDir || ''
        }")`
      );

      const stdOut = yarnVersion.startsWith('1.')
        ? await getCommandOutput('yarn cache dir', projectDir)
        : await getCommandOutput('yarn config get cacheFolder', projectDir);

      if (!stdOut) {
        throw new Error(
          `Could not get yarn cache folder path for ${projectDir}`
        );
      }
      return stdOut;
    }
  }
};

export const getCommandOutput = async (
  toolCommand: string,
  cwd?: string
): Promise<string> => {
  let {stdout, stderr, exitCode} = await exec.getExecOutput(
    toolCommand,
    undefined,
    {ignoreReturnCode: true, ...(cwd && {cwd})}
  );

  if (exitCode) {
    stderr = !stderr.trim()
      ? `The '${toolCommand}' command failed with exit code: ${exitCode}`
      : stderr;
    throw new Error(stderr);
  }

  return stdout.trim();
};

export const getCommandOutputNotEmpty = async (
  toolCommand: string,
  error: string,
  cwd?: string
): Promise<string> => {
  const stdOut = getCommandOutput(toolCommand, cwd);
  if (!stdOut) {
    throw new Error(error);
  }
  return stdOut;
};

export const getPackageManagerInfo = async (packageManager: string) => {
  if (packageManager === 'npm') {
    return supportedPackageManagers.npm;
  } else if (packageManager === 'pnpm') {
    return supportedPackageManagers.pnpm;
  } else if (packageManager === 'yarn') {
    return supportedPackageManagers.yarn;
  } else {
    return null;
  }
};

/**
 * Expands (converts) the string input `cache-dependency-path` to list of directories that
 * may be project roots
 * @param cacheDependencyPath - either a single string or multiline string with possible glob patterns
 *                              expected to be the result of `core.getInput('cache-dependency-path')`
 * @return list of directories and possible
 */
const getProjectDirectoriesFromCacheDependencyPath = async (
  cacheDependencyPath: string
): Promise<string[]> => {
  const globber = await glob.create(cacheDependencyPath);
  const cacheDependenciesPaths = await globber.glob();

  const existingDirectories: string[] = cacheDependenciesPaths
    .map(path.dirname)
    .filter(unique())
    .filter(directory => fs.lstatSync(directory).isDirectory());

  if (!existingDirectories.length)
    core.warning(
      `No existing directories found containing cache-dependency-path="${cacheDependencyPath}"`
    );

  return existingDirectories;
};

/**
 * Finds the cache directories configured for the repo if cache-dependency-path is not empty
 * @param packageManagerInfo - an object having getCacheFolderPath method specific to given PM
 * @param cacheDependencyPath - either a single string or multiline string with possible glob patterns
 *                              expected to be the result of `core.getInput('cache-dependency-path')`
 * @return list of files on which the cache depends
 */
const getCacheDirectoriesFromCacheDependencyPath = async (
  packageManagerInfo: PackageManagerInfo,
  cacheDependencyPath: string
): Promise<string[]> => {
  const projectDirectories = await getProjectDirectoriesFromCacheDependencyPath(
    cacheDependencyPath
  );
  const cacheFoldersPaths = await Promise.all(
    projectDirectories.map(async projectDirectory => {
      const cacheFolderPath =
        packageManagerInfo.getCacheFolderPath(projectDirectory);
      core.debug(
        `${packageManagerInfo.name}'s cache folder "${cacheFolderPath}" configured for the directory "${projectDirectory}"`
      );
      return cacheFolderPath;
    })
  );
  // uniq in order to do not cache the same directories twice
  return cacheFoldersPaths.filter(unique());
};

/**
 * Finds the cache directories configured for the repo ignoring cache-dependency-path
 * @param packageManagerInfo - an object having getCacheFolderPath method specific to given PM
 * @return list of files on which the cache depends
 */
const getCacheDirectoriesForRootProject = async (
  packageManagerInfo: PackageManagerInfo
): Promise<string[]> => {
  const cacheFolderPath = await packageManagerInfo.getCacheFolderPath();
  core.debug(
    `${packageManagerInfo.name}'s cache folder "${cacheFolderPath}" configured for the root directory`
  );
  return [cacheFolderPath];
};

/**
 * A function to find the cache directories configured for the repo
 * currently it handles only the case of PM=yarn && cacheDependencyPath is not empty
 * @param packageManagerInfo - an object having getCacheFolderPath method specific to given PM
 * @param cacheDependencyPath - either a single string or multiline string with possible glob patterns
 *                              expected to be the result of `core.getInput('cache-dependency-path')`
 * @return list of files on which the cache depends
 */
export const getCacheDirectories = async (
  packageManagerInfo: PackageManagerInfo,
  cacheDependencyPath: string
): Promise<string[]> => {
  // For yarn, if cacheDependencyPath is set, ask information about cache folders in each project
  // folder satisfied by cacheDependencyPath https://github.com/actions/setup-node/issues/488
  if (packageManagerInfo.name === 'yarn' && cacheDependencyPath) {
    return getCacheDirectoriesFromCacheDependencyPath(
      packageManagerInfo,
      cacheDependencyPath
    );
  }
  return getCacheDirectoriesForRootProject(packageManagerInfo);
};

export function isGhes(): boolean {
  const ghUrl = new URL(
    process.env['GITHUB_SERVER_URL'] || 'https://github.com'
  );
  return ghUrl.hostname.toUpperCase() !== 'GITHUB.COM';
}

export function isCacheFeatureAvailable(): boolean {
  if (cache.isFeatureAvailable()) return true;

  if (isGhes()) {
    core.warning(
      'Cache action is only supported on GHES version >= 3.5. If you are on version >=3.5 Please check with GHES admin if Actions cache service is enabled or not.'
    );
    return false;
  }

  core.warning(
    'The runner was not able to contact the cache service. Caching will be skipped'
  );

  return false;
}
