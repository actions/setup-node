import * as core from '@actions/core';

import os from 'os';
import fs from 'fs';

import * as auth from './authutil';
import * as path from 'path';
import {restoreCache} from './cache-restore';
import {isCacheFeatureAvailable} from './cache-utils';
import {getNodejsDistribution} from './distributions/installer-factory';
import {getNodeVersionFromFile, printEnvDetailsAndSetOutput} from './util';
import {State} from './constants';

export async function run() {
  try {
    //
    // Version is optional.  If supplied, install / use from the tool cache
    // If not supplied then task is still used to setup proxy, auth, etc...
    //
    const version = resolveVersionInput();

    let arch = core.getInput('architecture');
    const cache = core.getInput('cache');
    const packagemanagercache =
      (core.getInput('package-manager-cache') || 'true').toUpperCase() ===
      'TRUE';

    // if architecture supplied but node-version is not
    // if we don't throw a warning, the already installed x64 node will be used which is not probably what user meant.
    if (arch && !version) {
      core.warning(
        '`architecture` is provided but `node-version` is missing. In this configuration, the version/architecture of Node will not be changed. To fix this, provide `architecture` in combination with `node-version`'
      );
    }

    if (!arch) {
      arch = os.arch();
    }

    if (version) {
      const token = core.getInput('token');
      const auth = !token ? undefined : `token ${token}`;
      const mirror = core.getInput('mirror');
      const mirrorToken = core.getInput('mirror-token');
      const stable =
        (core.getInput('stable') || 'true').toUpperCase() === 'TRUE';
      const checkLatest =
        (core.getInput('check-latest') || 'false').toUpperCase() === 'TRUE';
      const nodejsInfo = {
        versionSpec: version,
        checkLatest,
        auth,
        stable,
        arch,
        mirror,
        mirrorToken
      };
      const nodeDistribution = getNodejsDistribution(nodejsInfo);
      await nodeDistribution.setupNodeJs();
    }

    await printEnvDetailsAndSetOutput();

    const registryUrl: string = core.getInput('registry-url');
    const alwaysAuth: string = core.getInput('always-auth');
    if (registryUrl) {
      auth.configAuthentication(registryUrl, alwaysAuth);
    }

    const resolvedPackageManager = getNameFromPackageManagerField();
    const cacheDependencyPath = core.getInput('cache-dependency-path');

    if (isCacheFeatureAvailable()) {
      // if the cache input is provided, use it for caching.
      if (cache) {
        core.saveState(State.CachePackageManager, cache);
        await restoreCache(cache, cacheDependencyPath);
        // package manager npm is detected from package.json, enable auto-caching for npm.
      } else if (resolvedPackageManager && packagemanagercache) {
        core.info(
          "Detected npm as the package manager from package.json's packageManager field. " +
            'Auto caching has been enabled for npm. If you want to disable it, set package-manager-cache input to false'
        );
        core.saveState(State.CachePackageManager, resolvedPackageManager);
        await restoreCache(resolvedPackageManager, cacheDependencyPath);
      }
    }

    const matchersPath = path.join(__dirname, '../..', '.github');
    core.info(`##[add-matcher]${path.join(matchersPath, 'tsc.json')}`);
    core.info(
      `##[add-matcher]${path.join(matchersPath, 'eslint-stylish.json')}`
    );
    core.info(
      `##[add-matcher]${path.join(matchersPath, 'eslint-compact.json')}`
    );
  } catch (err) {
    core.setFailed((err as Error).message);
  }
}

function resolveVersionInput(): string {
  let version = core.getInput('node-version');
  const versionFileInput = core.getInput('node-version-file');

  if (version && versionFileInput) {
    core.warning(
      'Both node-version and node-version-file inputs are specified, only node-version will be used'
    );
  }

  if (version) {
    return version;
  }

  if (versionFileInput) {
    const versionFilePath = path.join(
      process.env.GITHUB_WORKSPACE!,
      versionFileInput
    );

    const parsedVersion = getNodeVersionFromFile(versionFilePath);

    if (parsedVersion) {
      version = parsedVersion;
    } else {
      core.warning(
        `Could not determine node version from ${versionFilePath}. Falling back`
      );
    }

    core.info(`Resolved ${versionFileInput} as ${version}`);
  }

  return version;
}

export function getNameFromPackageManagerField(): string | undefined {
  // Enable auto-cache for npm
  try {
    const packageJson = JSON.parse(
      fs.readFileSync(
        path.join(process.env.GITHUB_WORKSPACE!, 'package.json'),
        'utf-8'
      )
    );
    const pm = packageJson.packageManager;
    if (typeof pm === 'string') {
      const match = pm.match(/^(?:\^)?(npm)@/);
      return match ? match[1] : undefined;
    }
    return undefined;
  } catch (err) {
    return undefined;
  }
}
