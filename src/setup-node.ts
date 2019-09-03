import * as core from '@actions/core';
import * as installer from './installer';
import * as auth from './authutil';
import * as path from 'path';

async function run() {
  try {
    //
    // Version is optional.  If supplied, install / use from the tool cache
    // If not supplied then task is still used to setup proxy, auth, etc...
    //
    let version = core.getInput('version');
    if (!version) {
      version = core.getInput('node-version');
    }
    if (version) {
      // TODO: installer doesn't support proxy
      await installer.getNode(version);
    }

    const registryUrl: string = core.getInput('registry-url');
    const alwaysAuth: string = core.getInput('always-auth');
    if (registryUrl) {
      auth.configAuthentication(registryUrl, alwaysAuth);
    }

    // TODO: setup proxy from runner proxy config
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

run();
