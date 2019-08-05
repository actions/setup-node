import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as core from '@actions/core';

export function configAuth(registryUrl: string) {
  let npmrc: string = path.resolve(process.cwd(), '.npmrc');
  let yarnrc: string = path.resolve(process.cwd(), '.yarnrc');

  writeRegistryToFile(registryUrl, npmrc, 'NPM_TOKEN');
  writeRegistryToFile(registryUrl, yarnrc, 'YARN_TOKEN');
}

function writeRegistryToFile(
  registryUrl: string,
  fileLocation: string,
  authTokenName: string
) {
  core.debug(`Setting auth in ${fileLocation}`);
  let newContents = '';
  if (fs.existsSync(fileLocation)) {
    const curContents = fs.readFileSync(fileLocation, 'utf8');
    curContents.split(os.EOL).forEach((line: string) => {
      // Add current contents unless they are setting the registry
      if (!line.startsWith('registry')) {
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
    registryUrl.replace(/(^\w+:|^)/, '') +
    ':_authToken=${' +
    authTokenName +
    '}';
  fs.writeFileSync(fileLocation, newContents);
}
