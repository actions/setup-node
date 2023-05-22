import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as cache from '@actions/cache';
import * as glob from '@actions/glob';
import path from 'path';
import fs from 'fs';

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

// for testing purposes
export const npmGetCacheFolderCommand = 'npm config get cache';
export const pnpmGetCacheFolderCommand = 'pnpm store path --silent';
export const yarn1GetCacheFolderCommand = 'yarn cache dir';
export const yarn2GetCacheFolderCommand = 'yarn config get cacheFolder';
export const supportedPackageManagers: SupportedPackageManagers = {
  npm: {
    name: 'npm',
    lockFilePatterns: ['package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock'],
    getCacheFolderPath: () =>
      getCommandOutputGuarded(
        npmGetCacheFolderCommand,
        'Could not get npm cache folder path'
      )
  },
  pnpm: {
    name: 'pnpm',
    lockFilePatterns: ['pnpm-lock.yaml'],
    getCacheFolderPath: () =>
      getCommandOutputGuarded(
        pnpmGetCacheFolderCommand,
        'Could not get pnpm cache folder path'
      )
  },
  yarn: {
    name: 'yarn',
    lockFilePatterns: ['yarn.lock'],
    getCacheFolderPath: async projectDir => {
      const yarnVersion = await getCommandOutputGuarded(
        `yarn --version`,
        'Could not retrieve version of yarn',
        projectDir
      );

      core.debug(
        `Consumed yarn version is ${yarnVersion} (working dir: "${projectDir}")`
      );

      const stdOut = yarnVersion.startsWith('1.')
        ? await getCommandOutput(yarn1GetCacheFolderCommand, projectDir)
        : await getCommandOutput(yarn2GetCacheFolderCommand, projectDir);

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

export const getCommandOutputGuarded = async (
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
 * glob expanding memoized because it involves potentially very deep
 * traversing through the directories tree
 */
export const expandedPatternsMemoized: Record<string, string[]> = {};
/**
 * Wrapper around `glob.create(pattern).glob()` with the memoization
 * @param pattern is expected to be a globed path
 * @return list of files or directories expanded from glob
 */
const globPatternToArray = async (pattern: string): Promise<string[]> => {
  const memoized = expandedPatternsMemoized[pattern];
  if (memoized) return Promise.resolve(memoized);
  const globber = await glob.create(pattern);
  const expanded = await globber.glob();
  expandedPatternsMemoized[pattern] = expanded;
  return expanded;
};

/**
 * Expands (converts) the string input `cache-dependency-path` to list of files' paths
 * First it breaks the input by new lines and then expand glob patterns if any
 * @param cacheDependencyPath - either a single string or multiline string with possible glob patterns
 * @return list of files on which the cache depends
 */
export const expandCacheDependencyPath = async (
  cacheDependencyPath: string
): Promise<string[]> => {
  const multilinePaths = cacheDependencyPath
    .split(/\r?\n/)
    .map(path => path.trim())
    .filter(path => Boolean(path));
  const expandedPathsPromises: Promise<string[]>[] = multilinePaths.map(path =>
    path.includes('*') ? globPatternToArray(path) : Promise.resolve([path])
  );
  const expandedPaths: string[][] = await Promise.all(expandedPathsPromises);
  return expandedPaths.length === 0 ? [''] : expandedPaths.flat();
};

/**
 * Converts dependency file path to the directory it resides in and ensures the directory exists
 * @param cacheDependencyPath - a file name path
 * @return either directory containing the file or null
 */
const cacheDependencyPathToProjectDirectory = (
  cacheDependencyPath: string
): string | null => {
  const projectDirectory = path.dirname(cacheDependencyPath);
  if (
    fs.existsSync(projectDirectory) &&
    fs.lstatSync(projectDirectory).isDirectory()
  ) {
    core.debug(
      `Project directory "${projectDirectory}" derived from cache-dependency-path: "${cacheDependencyPath}"`
    );
    return projectDirectory;
  } else {
    core.debug(
      `No project directory found for cache-dependency-path: "${cacheDependencyPath}", will be skipped`
    );
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
const cacheDependencyPathToProjectsDirectories = async (
  cacheDependencyPath: string
): Promise<string[]> => {
  const cacheDependenciesPaths = await expandCacheDependencyPath(
    cacheDependencyPath
  );

  const existingDirectories: string[] = cacheDependenciesPaths
    .map(cacheDependencyPath =>
      cacheDependencyPathToProjectDirectory(cacheDependencyPath)
    )
    .filter(path => path !== null) as string[];

  // if user explicitly pointed out some file, but it does not exist it is definitely
  // not he wanted, thus we should throw an error not trying to workaround with unexpected
  // result to the whole build
  if (existingDirectories.length === 0)
    throw Error(
      'No existing directories found containing `cache-dependency-path`="${cacheDependencyPath}"'
    );

  // uniq in order to do not traverse the same directories during the further processing
  return existingDirectories.filter(
    (cachePath, i, result) =>
      cachePath != null && result.indexOf(cachePath) === i
  );
};

/**
 * Utility function to be used from within `map`
 * Finds the cache directories configured for the project directory
 * @param packageManagerInfo - an object having getCacheFolderPath method specific to given PM
 * @param projectDirectory - the string pointing out to a project dir (i.e. directory with its own .yarnrc)
 * @return list of directories to be cached according to the project configuration in the directory
 */
const projectDirectoryToCacheFolderPath = async (
  packageManagerInfo: PackageManagerInfo,
  projectDirectory: string
): Promise<string> => {
  const cacheFolderPath = await packageManagerInfo.getCacheFolderPath(
    projectDirectory
  );
  core.debug(
    `${packageManagerInfo.name}'s cache folder "${cacheFolderPath}" configured for the directory "${projectDirectory}"`
  );
  return cacheFolderPath;
};

/**
 * Top-entry function to find the cache directories configured for the repo if cache-dependency-path is not empty
 * @param packageManagerInfo - an object having getCacheFolderPath method specific to given PM
 * @param cacheDependencyPath - either a single string or multiline string with possible glob patterns
 *                              expected to be the result of `core.getInput('cache-dependency-path')`
 * @return list of files on which the cache depends
 */
const cacheDependencyPathToCacheFoldersPaths = async (
  packageManagerInfo: PackageManagerInfo,
  cacheDependencyPath: string
): Promise<string[]> => {
  const projectDirectories = await cacheDependencyPathToProjectsDirectories(
    cacheDependencyPath
  );
  const cacheFoldersPaths = await Promise.all(
    projectDirectories.map(projectDirectory =>
      projectDirectoryToCacheFolderPath(packageManagerInfo, projectDirectory)
    )
  );
  // uniq in order to do not cache the same directories twice
  return cacheFoldersPaths.filter(
    (cachePath, i, result) => result.indexOf(cachePath) === i
  );
};

/**
 * Top-entry function to find the cache directories configured for the repo if cache-dependency-path is empty
 * @param packageManagerInfo - an object having getCacheFolderPath method specific to given PM
 * @return list of files on which the cache depends
 */
const cacheFoldersPathsForRoot = async (
  packageManagerInfo: PackageManagerInfo
): Promise<string[]> => {
  const cacheFolderPath = await packageManagerInfo.getCacheFolderPath();
  core.debug(
    `${packageManagerInfo.name}'s cache folder "${cacheFolderPath}" configured for the root directory`
  );
  return [cacheFolderPath];
};

/**
 * Main function to find the cache directories configured for the repo
 * currently it handles only the case of PM=yarn && cacheDependencyPath is not empty
 * @param packageManagerInfo - an object having getCacheFolderPath method specific to given PM
 * @param cacheDependencyPath - either a single string or multiline string with possible glob patterns
 *                              expected to be the result of `core.getInput('cache-dependency-path')`
 * @return list of files on which the cache depends
 */
export const getCacheDirectoriesPaths = async (
  packageManagerInfo: PackageManagerInfo,
  cacheDependencyPath: string
): Promise<string[]> =>
  // TODO: multiple directories limited to yarn so far
  packageManagerInfo === supportedPackageManagers.yarn
    ? cacheDependencyPathToCacheFoldersPaths(
        packageManagerInfo,
        cacheDependencyPath
      )
    : cacheFoldersPathsForRoot(packageManagerInfo);

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
