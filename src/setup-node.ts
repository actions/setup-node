import * as core from '@actions/core';
import * as io from '@actions/io';
import * as installer from './installer';
import * as auth from './authutil';
import * as path from 'path';
import cp from 'child_process';

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
    const nodePath = await io.which('node');
    const nodeVersion = cp.execSync(`"${nodePath}" --version`);
    console.log(`Node Version: ${nodeVersion}`);

    const npmPath = await io.which('npm');
    // Older versions of Node don't include npm
    if (npmPath) {
      const npmVersion = cp.execSync(`"${npmPath}" --version`);
      console.log(`npm Version: ${npmVersion}`);
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

run();
