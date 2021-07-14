import * as core from '@actions/core';
import * as exec from '@actions/exec';
import os from 'os';
import path from 'path';

type SupportedPackageManagers = {
  [prop: string]: PackageManagerInfo;
};

export interface PackageManagerInfo {
  lockFilePatterns: Array<string>;
  getCacheFolderCommand: string;
  defaultCacheFolder?: string;
}

export const supportedPackageManagers: SupportedPackageManagers = {
  npm: {
    lockFilePatterns: ['package-lock.json', 'yarn.lock'],
    getCacheFolderCommand: 'npm config get cache'
  },
  pnpm: {
    lockFilePatterns: ['pnpm-lock.yaml'],
    getCacheFolderCommand: 'pnpm get store',
    defaultCacheFolder: path.join(os.homedir(), '.pnpm-store')
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
  const {stdout, stderr, exitCode} = await exec.getExecOutput(toolCommand);

  if (stderr) {
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
  let stdOut = await getCommandOutput(packageManagerInfo.getCacheFolderCommand);

  // pnpm returns 'undefined' if no custom store path is set
  if (stdOut === 'undefined') {
    stdOut = '';
  }

  if (!stdOut && packageManagerInfo.defaultCacheFolder) {
    stdOut = packageManagerInfo.defaultCacheFolder;
  }

  if (!stdOut) {
    throw new Error(`Could not get cache folder path for ${packageManager}`);
  }

  core.debug(`${packageManager} path is ${stdOut}`);

  return stdOut;
};
