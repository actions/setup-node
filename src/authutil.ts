import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as core from '@actions/core';
import * as github from '@actions/github';

export function configAuthentication(registryUrl: string, alwaysAuth: string) {

  writeRegistryToFile(registryUrl, alwaysAuth, 'NODE_AUTH_TOKEN');
}

function getFileLocation(): string {
  return path.resolve(
    process.env['RUNNER_TEMP'] || process.cwd(),
    '.npmrc'
  );
}

function writeRegistryToFile(
  registryUrl: string,
  alwaysAuth: string,
  tokenEnvVar: string
) {
  const fileLocation: string = getFileLocation();
  if (!registryUrl.endsWith('/')) {
    registryUrl += '/';
  }

  const scope: string = getScope('scope', registryUrl);

  core.debug(`Setting auth in ${fileLocation}`);
  let newContents = '';
  if (fs.existsSync(fileLocation)) {
    const curContents: string = fs.readFileSync(fileLocation, 'utf8');
    curContents.split(os.EOL).forEach((line: string) => {
      // Add current contents unless they are setting the registry
      if (!line.toLowerCase().startsWith(`${scope}registry`)) {
        newContents += line + os.EOL;
      }
    });
  }
  // Remove http: or https: from front of registry.
  const authString: string =
    registryUrl.replace(/(^\w+:|^)/, '') + ':_authToken=${' + tokenEnvVar + '}';
  const registryString = `${scope}registry=${registryUrl}`;
  const alwaysAuthString = `always-auth=${alwaysAuth}`;
  newContents += `${authString}${os.EOL}${registryString}${os.EOL}${alwaysAuthString}`;
  fs.writeFileSync(fileLocation, newContents);
  core.exportVariable('NPM_CONFIG_USERCONFIG', fileLocation);
  // Export empty node_auth_token if didn't exist so npm doesn't complain about not being able to find it
  core.exportVariable(
    tokenEnvVar, process.env[tokenEnvVar] || 'XXXXX-XXXXX-XXXXX-XXXXX'
  );
}
function getScope(scopeKey: string, registryUrl: string) {
  let scope: string = core.getInput(scopeKey);
  if (!scope && registryUrl.indexOf('npm.pkg.github.com') > -1) {
    scope = github.context.repo.owner;
  }
  if (scope && scope[0] != '@') {
    scope = '@' + scope;
  }
  if (scope) {
    scope = scope.toLowerCase() + ':';
  }
  return scope;
}

export function configAuthentication2(registryUrl2: string, alwaysAuth2: string) {

  writeRegistryToFile(registryUrl2, alwaysAuth2, 'NODE_AUTH_TOKEN2');
}
