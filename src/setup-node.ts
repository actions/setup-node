import * as core from '@actions/core';
import * as auth from './auth';
import * as installer from './installer';

async function run() {
  try {
    //
    // Version is optional.  If supplied, install / use from the tool cache
    // If not supplied then task is still used to setup proxy, auth, etc...
    //
    const version = core.getInput('version');
    if (version) {
      // TODO: installer doesn't support proxy
      await installer.getNode(version);
    }

    const registryUrl = core.getInput('registryUrl');
    if (registryUrl) {
      const registryToken = core.getInput('registryToken', {required: true});
      const authFile = core.getInput('authFile');
      auth.setNpmrc(registryUrl, registryToken, authFile);
    }

    // TODO: setup proxy from runner proxy config
    // TODO: problem matchers registered
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
