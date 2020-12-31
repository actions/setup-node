import * as core from '@actions/core';
import * as installer from './installer';
import * as auth from './authutil';
import * as path from 'path';
import {URL} from 'url';
import os = require('os');
import fs = require('fs');

export async function run() {
  try {
    //
    // Version is optional.  If supplied, install / use from the tool cache
    // If not supplied then task is still used to setup proxy, auth, etc...
    //
    let version = parseNodeVersion();
    let arch = core.getInput('architecture');

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

    const matchersPath = path.join(__dirname, '..', '.github');
    console.log(`##[add-matcher]${path.join(matchersPath, 'tsc.json')}`);
    console.log(
      `##[add-matcher]${path.join(matchersPath, 'eslint-stylish.json')}`
    );
    console.log(
      `##[add-matcher]${path.join(matchersPath, 'eslint-compact.json')}`
    );
  } catch (error) {
    core.setFailed(error.message);
  }
}

function isGhes(): boolean {
  const ghUrl = new URL(
    process.env['GITHUB_SERVER_URL'] || 'https://github.com'
  );
  return ghUrl.hostname.toUpperCase() !== 'GITHUB.COM';
}

function parseNodeVersion(): string {
  let nodeVersion = core.getInput('node-version') || core.getInput('version');

  if (!nodeVersion) {
    if (fs.existsSync('.nvmrc')) {
      // Read from .nvmrc
      nodeVersion = fs.readFileSync('.nvmrc', 'utf8').trim();
      console.log(`Using ${nodeVersion} as input from file .nvmrc`);
    } else if (fs.existsSync('.tool-versions')) {
      // Read from .tool-versions
      const toolVersions = fs.readFileSync('.tool-versions', 'utf8').trim();
      const nodeLine = toolVersions
        .split(/\r?\n/)
        .filter(e => e.match(/^nodejs\s/))[0];
      nodeVersion = nodeLine.match(/^nodejs\s+(.+)$/)![1];
      console.log(`Using ${nodeVersion} as input from file .tool-versions`);
    } else {
      console.log(
        `Version not specified and not found in .nvmrc or .tool-versions`
      );
    }
  }

  return nodeVersion;
}
