import path from 'path';
import fs from 'fs';
import * as ignorescripts from '../src/ignore-scripts';
import {getNpmrcLocation} from '../src/util';

let rcFile: string;

describe('ignore-scripts tests', () => {
  const runnerDir = path.join(__dirname, 'runner');

  beforeEach(async () => {
    rcFile = getNpmrcLocation();
  }, 5000);

  afterEach(async () => {
    fs.unlinkSync(rcFile);
    rcFile = getNpmrcLocation();
  }, 10000);

  it('sets the value to true according to input', async () => {
    ignorescripts.ignoreScriptsInNpmConfig('true');
    const rcContents = fs.readFileSync(rcFile).toString();
    expect(rcContents).toMatch('\nignore-scripts=true\n');
  });

  it('sets the value to false according to input', async () => {
    ignorescripts.ignoreScriptsInNpmConfig('false');
    const rcContents = fs.readFileSync(rcFile).toString();
    expect(rcContents).toMatch('\nignore-scripts=false\n');
  });

  it('defaults to false on empty input', async () => {
    ignorescripts.ignoreScriptsInNpmConfig('');
    const rcContents = fs.readFileSync(rcFile).toString();
    expect(rcContents).toMatch('\nignore-scripts=false\n');
  });

  it('preserves existing npmrc file contents', async () => {
    fs.writeFileSync(getNpmrcLocation(), 'something\nwhatever\nstuff');
    ignorescripts.ignoreScriptsInNpmConfig('true');
    const rcContents = fs.readFileSync(rcFile).toString();
    expect(rcContents).toMatch(
      'something\nwhatever\nstuff\nignore-scripts=true\n'
    );
  });
});
