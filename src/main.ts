import * as core from '@actions/core';
import * as installer from './installer';
import * as auth from './authutil';
import * as path from 'path';
import {URL} from 'url';

export async function run() {
  try {
    //
    // Version is optional.  If supplied, install / use from the tool cache
    // If not supplied then task is still used to setup proxy, auth, etc...
    //
    let version = core.getInput('node-version');
    if (!version) {
      version = core.getInput('version');
    }

    console.log(`version: ${version}`);
    if (version) {
      let token = core.getInput('token');
      let auth = !token || isGhes() ? undefined : `token ${token}`;
      let stable = (core.getInput('stable') || 'true').toUpperCase() === 'TRUE';
      await installer.getNode(version, stable, auth);
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
