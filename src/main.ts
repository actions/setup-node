import * as core from '@actions/core';

import os from 'os';

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
      const stable =
        (core.getInput('stable') || 'true').toUpperCase() === 'TRUE';
      const checkLatest =
        (core.getInput('check-latest') || 'false').toUpperCase() === 'TRUE';
      const nodejsInfo = {
        versionSpec: version,
        checkLatest,
        auth,
        stable,
        arch
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

    if (cache && isCacheFeatureAvailable()) {
      core.saveState(State.CachePackageManager, cache);
      const cacheDependencyPath = core.getInput('cache-dependency-path');
      await restoreCache(cache, cacheDependencyPath);
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
