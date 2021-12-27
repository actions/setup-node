import * as core from '@actions/core';
import * as installer from './installer';
import fs from 'fs';
import * as auth from './authutil';
import * as path from 'path';
import {restoreCache} from './cache-restore';
import {URL} from 'url';
import os = require('os');

export async function run() {
  try {
    //
    // Version is optional.  If supplied, install / use from the tool cache
    // If not supplied then task is still used to setup proxy, auth, etc...
    //
    let version = resolveVersionInput();

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
      let token = core.getInput('token');
      let auth = !token || isGhes() ? undefined : `token ${token}`;
      let stable = (core.getInput('stable') || 'true').toUpperCase() === 'TRUE';
      const checkLatest =
        (core.getInput('check-latest') || 'false').toUpperCase() === 'TRUE';
      await installer.getNode(version, stable, checkLatest, auth, arch);
    }

    const registryUrl: string = core.getInput('registry-url');
    const alwaysAuth: string = core.getInput('always-auth');
    if (registryUrl) {
      auth.configAuthentication(registryUrl, alwaysAuth);
    }

    if (cache) {
      if (isGhes()) {
        throw new Error('Caching is not supported on GHES');
      }
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
    core.setFailed(err.message);
  }
}

function isGhes(): boolean {
  const ghUrl = new URL(
    process.env['GITHUB_SERVER_URL'] || 'https://github.com'
  );
  return ghUrl.hostname.toUpperCase() !== 'GITHUB.COM';
}

function resolveVersionInput(): string {
  let version = core.getInput('node-version') || core.getInput('version');
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
    if (!fs.existsSync(versionFilePath)) {
      throw new Error(
        `The specified node version file at: ${versionFilePath} does not exist`
      );
    }
    version = installer.parseNodeVersionFile(
      fs.readFileSync(versionFilePath, 'utf8')
    );
    core.info(`Resolved ${versionFileInput} as ${version}`);
  }

  return version;
}
