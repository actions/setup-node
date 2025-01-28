import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';

import os from 'os';

import * as auth from './authutil';
import * as semver from 'semver';
import * as path from 'path';
import {restoreCache} from './cache-restore';
import {isCacheFeatureAvailable} from './cache-utils';
import {getNodejsDistribution} from './distributions/installer-factory';
import {getNodeVersionFromFile, printEnvDetailsAndSetOutput} from './util';
import {State} from './constants';
import {HttpClient} from '@actions/http-client';

export async function run() {
  try {
    const mirrorUrl = core.getInput('mirror-url');
    const versionSpec = core.getInput('node-version');

    if (mirrorUrl && versionSpec) {
      const nodePath = await downloadNodeFromMirror(versionSpec, mirrorUrl);
      core.addPath(nodePath);
      await printEnvDetailsAndSetOutput();
      core.info(
        `Node.js version ${versionSpec} has been downloaded and added to PATH from mirror URL: ${mirrorUrl}`
      );

      return;
    }

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

async function downloadNodeFromMirror(
  versionSpec: string,
  mirrorUrl: string
): Promise<string> {
  const osPlat = process.platform;
  const osArch = translateArchToDistUrl(process.arch);
  // Resolve the version to the latest matching version
  const resolvedVersion = await resolveVersionFromMirror(
    versionSpec,
    mirrorUrl
  );

  if (!resolvedVersion) {
    throw new Error(`Invalid Node.js version: ${versionSpec}`);
  }
  const cleanVersion = semver.clean(resolvedVersion) || resolvedVersion;
  const fileName =
    osPlat === 'win32'
      ? `node-v${cleanVersion}-win-${osArch}`
      : `node-v${cleanVersion}-${osPlat}-${osArch}`;
  const urlFileName =
    osPlat === 'win32' ? `${fileName}.zip` : `${fileName}.tar.gz`;
  const downloadUrl = `${mirrorUrl}/v${cleanVersion}/${urlFileName}`;

  core.info(`Attempting to download Node.js from mirror URL: ${downloadUrl}`);
  const downloadPath = await tc.downloadTool(downloadUrl);
  core.info('Extracting ...');

  // Check the file extension and extract accordingly
  let extractedPath: string;
  if (downloadUrl.endsWith('.tar.gz')) {
    extractedPath = await tc.extractTar(downloadPath);
  } else if (downloadUrl.endsWith('.zip')) {
    extractedPath = await tc.extractZip(downloadPath);
  } else {
    throw new Error('Unsupported file format');
  }

  // Ensure the correct path is added to the system PATH
  const toolPath = path.join(extractedPath);
  core.addPath(toolPath);

  return toolPath;
}
async function resolveVersionFromMirror(
  versionSpec: string,
  mirrorUrl: string
): Promise<string | null> {
  const dataUrl = `${mirrorUrl}/index.json`;
  const httpClient = new HttpClient('setup-node');
  const response = await httpClient.getJson<any[]>(dataUrl);
  const versions = response.result || [];

  const matchingVersions = versions
    .map(version => version.version)
    .filter(version => semver.satisfies(version, versionSpec))
    .sort(semver.rcompare);

  return matchingVersions.length > 0 ? matchingVersions[0] : null;
}
function translateArchToDistUrl(arch: string): string {
  switch (arch) {
    case 'arm':
      return 'armv7l';
    default:
      return arch;
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
