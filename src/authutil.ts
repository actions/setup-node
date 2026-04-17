import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as core from '@actions/core';
import * as github from '@actions/github';

export function configAuthentication(registryUrl: string) {
  const npmrc: string = path.resolve(
    process.env['RUNNER_TEMP'] || process.cwd(),
    '.npmrc'
  );
  if (!registryUrl.endsWith('/')) {
    registryUrl += '/';
  }

  writeRegistryToFile(registryUrl, npmrc);
}

function writeRegistryToFile(registryUrl: string, fileLocation: string) {
  let scope: string = core.getInput('scope');
  if (!scope && registryUrl.indexOf('npm.pkg.github.com') > -1) {
    scope = github.context.repo.owner;
  }
  if (scope && scope[0] != '@') {
    scope = '@' + scope;
  }
  if (scope) {
    scope = scope.toLowerCase() + ':';
  }

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
    registryUrl.replace(/(^\w+:|^)/, '') + ':_authToken=${NODE_AUTH_TOKEN}';
  const registryString = `${scope}registry=${registryUrl}`;
  newContents += `${authString}${os.EOL}${registryString}`;
  fs.writeFileSync(fileLocation, newContents);
  core.exportVariable('NPM_CONFIG_USERCONFIG', fileLocation);
  // Only export NODE_AUTH_TOKEN if explicitly provided by user
  // This is required to support NPM OIDC tokens which need NODE_AUTH_TOKEN to be unset
  // See: https://github.com/actions/setup-node/issues/1440
  if (Object.prototype.hasOwnProperty.call(process.env, 'NODE_AUTH_TOKEN')) {
    core.exportVariable('NODE_AUTH_TOKEN', process.env.NODE_AUTH_TOKEN);
  }
}
