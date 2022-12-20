import * as core from '@actions/core';
import * as exec from '@actions/exec';

import fs from 'fs';
import os from 'os';

import * as auth from './authutil';
import * as path from 'path';
import {restoreCache} from './cache-restore';
import {isCacheFeatureAvailable} from './cache-utils';
import {getNodejsDistribution} from './distibutions/installer-factory';

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
      const checkLatest =
        (core.getInput('check-latest') || 'false').toUpperCase() === 'TRUE';
      const nodejsInfo = {
        versionSpec: version,
        checkLatest: checkLatest,
        auth,
        arch: arch
      };
      const nodeDistribution = getNodejsDistribution(nodejsInfo);
      if (nodeDistribution) {
        await nodeDistribution?.getNodeJsInfo();
      } else {
        throw new Error(`Could not resolve version: ${version} for build`);
      }
    }

    await printEnvDetailsAndSetOutput();

    const registryUrl: string = core.getInput('registry-url');
    const alwaysAuth: string = core.getInput('always-auth');
    if (registryUrl) {
      auth.configAuthentication(registryUrl, alwaysAuth);
    }

    if (cache && isCacheFeatureAvailable()) {
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

    if (!fs.existsSync(versionFilePath)) {
      throw new Error(
        `The specified node version file at: ${versionFilePath} does not exist`
      );
    }

    version = parseNodeVersionFile(fs.readFileSync(versionFilePath, 'utf8'));

    core.info(`Resolved ${versionFileInput} as ${version}`);
  }

  return version;
}

export function parseNodeVersionFile(contents: string): string {
  let nodeVersion: string | undefined;

  // Try parsing the file as an NPM `package.json` file.
  try {
    nodeVersion = JSON.parse(contents).volta?.node;
    if (!nodeVersion) nodeVersion = JSON.parse(contents).engines?.node;
  } catch {
    core.info('Node version file is not JSON file');
  }

  if (!nodeVersion) {
    const found = contents.match(/^(?:nodejs\s+)?v?(?<version>[^\s]+)$/m);
    nodeVersion = found?.groups?.version;
  }

  // In the case of an unknown format,
  // return as is and evaluate the version separately.
  if (!nodeVersion) nodeVersion = contents.trim();

  return nodeVersion as string;
}

export async function printEnvDetailsAndSetOutput() {
  core.startGroup('Environment details');

  const promises = ['node', 'npm', 'yarn'].map(async tool => {
    const output = await getToolVersion(tool, ['--version']);

    if (tool === 'node') {
      core.setOutput(`${tool}-version`, output);
    }

    core.info(`${tool}: ${output}`);
  });

  await Promise.all(promises);

  core.endGroup();
}

async function getToolVersion(tool: string, options: string[]) {
  try {
    const {stdout, stderr, exitCode} = await exec.getExecOutput(tool, options, {
      ignoreReturnCode: true,
      silent: true
    });

    if (exitCode > 0) {
      core.warning(`[warning]${stderr}`);
      return '';
    }

    return stdout.trim();
  } catch (err) {
    return '';
  }
}
