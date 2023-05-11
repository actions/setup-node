import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as cache from '@actions/cache';
import * as glob from '@actions/glob';
import path from 'path';
import fs from 'fs';

export interface PackageManagerInfo {
  label: string;
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
    label: 'npm',
    lockFilePatterns: ['package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock'],
    getCacheFolderPath: () =>
      getCommandOutputGuarded(
        npmGetCacheFolderCommand,
        'Could not get npm cache folder path'
      )
  },
  pnpm: {
    label: 'pnpm',
    lockFilePatterns: ['pnpm-lock.yaml'],
    getCacheFolderPath: () =>
      getCommandOutputGuarded(
        pnpmGetCacheFolderCommand,
        'Could not get pnpm cache folder path'
      )
  },
  yarn: {
    label: 'yarn',
    lockFilePatterns: ['yarn.lock'],
    getCacheFolderPath: async projectDir => {
      const yarnVersion = await getCommandOutputGuarded(
        `yarn --version`,
        'Could not retrieve version of yarn',
        projectDir
      );

      core.debug(`Get yarn cache folder path for directory: ${projectDir}`);
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

const globPatternToArray = async (pattern: string): Promise<string[]> => {
  const globber = await glob.create(pattern);
  return globber.glob();
};

// TODO: handle array
const expandCacheDependencyPath = (
  cacheDependencyPath: string
): Promise<string[]> =>
  cacheDependencyPath.includes('*')
    ? globPatternToArray(cacheDependencyPath)
    : Promise.resolve([cacheDependencyPath]);

const cacheDependencyPathToCacheFolderPath = async (
  packageManagerInfo: PackageManagerInfo,
  cacheDependencyPath: string
): Promise<string> => {
  const cacheDependencyPathDirectory = path.dirname(cacheDependencyPath);
  core.debug(`Get cache folder for the dependency ${cacheDependencyPath}`);
  const cacheFolderPath =
    fs.existsSync(cacheDependencyPathDirectory) &&
    fs.lstatSync(cacheDependencyPathDirectory).isDirectory()
      ? await packageManagerInfo.getCacheFolderPath(
          cacheDependencyPathDirectory
        )
      : await packageManagerInfo.getCacheFolderPath();

  core.debug(
    `${packageManagerInfo.label} path is ${cacheFolderPath} (derived: from ${cacheDependencyPath})`
  );

  return cacheFolderPath;
};
const cacheDependenciesPathsToCacheFoldersPaths = async (
  packageManagerInfo: PackageManagerInfo,
  cacheDependenciesPaths: string[]
): Promise<string[]> => {
  const cacheFoldersPaths = await Promise.all(
    cacheDependenciesPaths.map(cacheDependencyPath =>
      cacheDependencyPathToCacheFolderPath(
        packageManagerInfo,
        cacheDependencyPath
      )
    )
  );
  return cacheFoldersPaths.filter(
    (cachePath, i, result) => result.indexOf(cachePath) === i
  );
};

const cacheDependencyPathToCacheFoldersPaths = async (
  packageManagerInfo: PackageManagerInfo,
  cacheDependencyPath: string
): Promise<string[]> => {
  const cacheDependenciesPaths = await expandCacheDependencyPath(
    cacheDependencyPath
  );
  return cacheDependenciesPathsToCacheFoldersPaths(
    packageManagerInfo,
    cacheDependenciesPaths
  );
};

const cacheFoldersPathsForRoot = async (
  packageManagerInfo: PackageManagerInfo
): Promise<string[]> => {
  const cacheFolderPath = await packageManagerInfo.getCacheFolderPath();
  core.debug(`${packageManagerInfo.label} path is ${cacheFolderPath}`);
  return [cacheFolderPath];
};

export const getCacheDirectoriesPaths = async (
  packageManagerInfo: PackageManagerInfo,
  cacheDependencyPath: string
): Promise<string[]> =>
  // TODO: multiple directories limited to yarn so far
  cacheDependencyPath && packageManagerInfo === supportedPackageManagers.yarn
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
