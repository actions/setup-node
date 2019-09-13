import * as io from '@actions/io';
import * as fs from 'fs';
import * as path from'path';

const runnerDir = path.join(__dirname, 'runner');
const randomizer = () =>
  Math.random()
    .toString(36)
    .substring(7);
const tempDir = path.join(runnerDir, randomizer(), 'temp');
const rcFile = path.join(tempDir, '.npmrc');

process.env['GITHUB_REPOSITORY'] = 'OwnerName/repo';
process.env['RUNNER_TEMP'] = tempDir;
import * as auth from '../src/authutil';

describe('auth tests', () => {
  beforeAll(async () => {
    await io.rmRF(tempDir);
    await io.mkdirP(tempDir);
  }, 100000);

  beforeEach(() => {
    if (fs.existsSync(rcFile)) {
      fs.unlinkSync(rcFile);
    }
    process.env['INPUT_SCOPE'] = '';
  });

  it('Sets up npmrc for npmjs', () => {
    auth.configAuthentication('https://registry.npmjs.org/', 'false');
    expect(fs.existsSync(rcFile)).toBe(true);
    expect(fs.readFileSync(rcFile, {encoding: 'utf8'})).toMatchSnapshot();
  });

  it('Appends trailing slash to registry', () => {
    auth.configAuthentication('https://registry.npmjs.org', 'false');

    expect(fs.existsSync(rcFile)).toBe(true);
    expect(fs.readFileSync(rcFile, {encoding: 'utf8'})).toMatchSnapshot();
  });

  it('Configures scoped npm registries', () => {
    process.env['INPUT_SCOPE'] = 'myScope';
    auth.configAuthentication('https://registry.npmjs.org', 'false');

    expect(fs.existsSync(rcFile)).toBe(true);
    expect(fs.readFileSync(rcFile, {encoding: 'utf8'})).toMatchSnapshot();
  });

  it('Automatically configures GPR scope', () => {
    auth.configAuthentication('npm.pkg.github.com', 'false');

    expect(fs.existsSync(rcFile)).toBe(true);
    expect(fs.readFileSync(rcFile, {encoding: 'utf8'})).toMatchSnapshot();
  });

  it('Sets up npmrc for always-auth true', () => {
    auth.configAuthentication('https://registry.npmjs.org/', 'true');
    expect(fs.existsSync(rcFile)).toBe(true);
    expect(fs.readFileSync(rcFile, {encoding: 'utf8'})).toMatchSnapshot();
  });
});
