import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as core from '@actions/core';

export function configAuthentication(registryUrl: string) {
  const npmrc: string = path.resolve(process.cwd(), '.npmrc');

  writeRegistryToFile(registryUrl, npmrc);
}

function writeRegistryToFile(registryUrl: string, fileLocation: string) {
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
  newContents +=
    'registry=' +
    registryUrl +
    os.EOL +
    'always-auth=true' +
    os.EOL +
    registryUrl.replace(/(^\w+:|^)/, '') + // Remove http: or https: from front of registry.
    ':_authToken=${NODE_AUTH_TOKEN}';
  fs.writeFileSync(fileLocation, newContents);
}
