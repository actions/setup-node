import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as io from '@actions/io';
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
      await installer.getNode(version);
    }

    // Output version of node and npm that are being used
    await exec.exec('node', ['--version']);

    // Older versions of Node don't include npm, so don't let this call fail
    await exec.exec('npm', ['--version'], {
      ignoreReturnCode: true
    });

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

run();
