import {writeFileSync} from 'fs';
import {defaultIfEmpty, getNpmrcLocation} from './util';

export const ignoreScriptsInNpmConfig = (ignore: string): void => {
  const nonEmptyInput: string = defaultIfEmpty(ignore, 'false');
  const ignored: boolean = JSON.parse(nonEmptyInput);
  appendToNpmrc(ignored);
};

const appendToNpmrc = (ignoreScripts: boolean): void => {
  const npmrc = getNpmrcLocation();
  writeFileSync(npmrc, `\nignore-scripts=${ignoreScripts}\n`, {flag: 'a'});
};
