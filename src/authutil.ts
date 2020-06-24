import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as core from '@actions/core';
import * as github from '@actions/github';
import * as hc from '@actions/http-client';
import * as am from '@actions/http-client/auth';

export async function configAuthentication(
  registryUrl: string,
  alwaysAuth: string
) {
  const npmrc: string = path.resolve(
    process.env['RUNNER_TEMP'] || process.cwd(),
    '.npmrc'
  );
  if (!registryUrl.endsWith('/')) {
    registryUrl += '/';
  }

  await writeRegistryToFile(registryUrl, npmrc, alwaysAuth);
}

async function getAuthContents(
  authUrl: string,
  authUser: string,
  authPass: string
) {
  let bh: am.BasicCredentialHandler = new am.BasicCredentialHandler(
    authUser,
    authPass
  );
  let httpClient = new hc.HttpClient('registry-auth', [bh], {
    allowRetries: true,
    maxRetries: 3
  });
  let response: hc.HttpClientResponse = await httpClient.get(authUrl);
  /**
   * constains string _auth = ***OmV5***\nalways-auth = true
   * we will parse it by using indexes
   */
  let body: string = await response.readBody();
  return body;
}

async function writeRegistryToFile(
  registryUrl: string,
  fileLocation: string,
  alwaysAuth: string
) {
  let scope: string = core.getInput('scope');
  console.log(`scope: ${scope}`);
  if (!scope && registryUrl.indexOf('npm.pkg.github.com') > -1) {
    scope = github.context.repo.owner;
  }
  if (scope && scope[0] != '@') {
    scope = '@' + scope;
  }
  if (scope) {
    scope = scope.toLowerCase();
  }

  console.log(`Setting auth in ${fileLocation}`);
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

  let authContents;
  // Check if auth url provided
  const authUrl: string = core.getInput('auth-url');
  if (authUrl) {
    console.log(`authUrl: ${authUrl}`);
    // Check if username and password/token provided
    const authUser: string = core.getInput('auth-user');
    const authPassword: string = core.getInput('auth-password');
    authContents = await getAuthContents(authUrl, authUser, authPassword);
  }

  // Remove http: or https: from front of registry.
  let authString: string = registryUrl.replace(
    /(^\w+:|^)/,
    ''
  ) + "_authToken=${NODE_AUTH_TOKEN}";

  const includeBothRegistries: string = core.getInput('include-both-registries');
  const registryString: string = scope
  ? `${scope}:registry=${registryUrl}`
  : `registry=${registryUrl}`;
  
  const alwaysAuthString: string = `always-auth=${alwaysAuth}`;
  if(scope && includeBothRegistries === "true") {
    const registryStringNoScope = `registry=${registryUrl}`;
    newContents += `${registryStringNoScope}${os.EOL}${registryString}${os.EOL}${alwaysAuthString}${os.EOL}${authContents}`;
  } else {
    newContents += `${authString}${os.EOL}${registryString}${os.EOL}${alwaysAuthString}`;
  }
  
  console.log(newContents);
  fs.writeFileSync(fileLocation, newContents);
  core.exportVariable('NPM_CONFIG_USERCONFIG', fileLocation);

  // Export empty node_auth_token so npm doesn't complain about not being able to find it
  core.exportVariable('NODE_AUTH_TOKEN', 'XXXXX-XXXXX-XXXXX-XXXXX');
}
