import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as cache from '@actions/cache';

type SupportedPackageManagers = {
  [prop: string]: PackageManagerInfo;
};

export interface PackageManagerInfo {
  lockFilePatterns: Array<string>;
  getCacheFolderCommand: string;
}

export const supportedPackageManagers: SupportedPackageManagers = {
  npm: {
    lockFilePatterns: ['package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock'],
    getCacheFolderCommand: 'npm config get cache'
  },
  pnpm: {
    lockFilePatterns: ['pnpm-lock.yaml'],
    getCacheFolderCommand: 'pnpm store path --silent'
  },
  yarn1: {
    lockFilePatterns: ['yarn.lock'],
    getCacheFolderCommand: 'yarn cache dir'
  },
  yarn2: {
    lockFilePatterns: ['yarn.lock'],
    getCacheFolderCommand: 'yarn config get cacheFolder'
  }
};

export const getCommandOutput = async (toolCommand: string) => {
  let {stdout, stderr, exitCode} = await exec.getExecOutput(
    toolCommand,
    undefined,
    {ignoreReturnCode: true}
  );

  if (exitCode) {
    stderr = !stderr.trim()
      ? `The '${toolCommand}' command failed with exit code: ${exitCode}`
      : stderr;
    throw new Error(stderr);
  }

  return stdout.trim();
};

const getPackageManagerVersion = async (
  packageManager: string,
  command: string
) => {
  const stdOut = await getCommandOutput(`${packageManager} ${command}`);

  if (!stdOut) {
    throw new Error(`Could not retrieve version of ${packageManager}`);
  }

  return stdOut;
};

export const getPackageManagerInfo = async (packageManager: string) => {
  if (packageManager === 'npm') {
    return supportedPackageManagers.npm;
  } else if (packageManager === 'pnpm') {
    return supportedPackageManagers.pnpm;
  } else if (packageManager === 'yarn') {
    const yarnVersion = await getPackageManagerVersion('yarn', '--version');

    core.debug(`Consumed yarn version is ${yarnVersion}`);

    if (yarnVersion.startsWith('1.')) {
      return supportedPackageManagers.yarn1;
    } else {
      return supportedPackageManagers.yarn2;
    }
  } else {
    return null;
  }
};

export const getCacheDirectoryPath = async (
  packageManagerInfo: PackageManagerInfo,
  packageManager: string
) => {
  const stdOut = await getCommandOutput(
    packageManagerInfo.getCacheFolderCommand
  );

  if (!stdOut) {
    throw new Error(`Could not get cache folder path for ${packageManager}`);
  }

  core.debug(`${packageManager} path is ${stdOut}`);

  return stdOut.trim();
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
