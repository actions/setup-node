import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as core from '@actions/core';
import * as github from '@actions/github';

export function configAuthentication(registryUrl: string, alwaysAuth: string) {
  const npmrc: string = path.resolve(
    process.env['RUNNER_TEMP'] || process.cwd(),
    '.npmrc'
  );
  if (!registryUrl.endsWith('/')) {
    registryUrl += '/';
  }

  writeRegistryToFile(registryUrl, npmrc, alwaysAuth);
}

function writeRegistryToFile(
  registryUrl: string,
  fileLocation: string,
  alwaysAuth: string
) {
  let scope: string = core.getInput('scope');
  if (!scope && registryUrl.indexOf('npm.pkg.github.com') > -1) {
    scope = github.context.repo.owner;
  }
  if (scope && scope[0] != '@') {
    scope = '@' + scope;
  }
  if (scope) {
    scope = scope.toLowerCase();
  }

  core.debug(`Setting auth in ${fileLocation}`);
  let newContents: string = '';
  if (fs.existsSync(fileLocation)) {
    const curContents: string = fs.readFileSync(fileLocation, 'utf8');
    curContents.split(os.EOL).forEach((line: string) => {
      // Add current contents unless they are setting the registry
      if (!line.toLowerCase().startsWith('registry')) {
        newContents += line + os.EOL;
      }
    });
  }
  // Remove http: or https: from front of registry.
  const authString: string =
    registryUrl.replace(/(^\w+:|^)/, '') + ':_authToken=${NODE_AUTH_TOKEN}';
  const registryString: string = scope
    ? `${scope}:registry=${registryUrl}`
    : `registry=${registryUrl}`;
  const alwaysAuthString: string = `always-auth=${alwaysAuth}`;
  newContents += `${authString}${os.EOL}${registryString}${os.EOL}${alwaysAuthString}`;
  fs.writeFileSync(fileLocation, newContents);
  core.exportVariable('NPM_CONFIG_USERCONFIG', fileLocation);
  // Export empty node_auth_token if didn't exist so npm doesn't complain about not being able to find it
  core.exportVariable(
    'NODE_AUTH_TOKEN',
    process.env.NODE_AUTH_TOKEN || 'XXXXX-XXXXX-XXXXX-XXXXX'
  );
}
