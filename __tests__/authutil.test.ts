import io = require('@actions/io');
import fs = require('fs');
import path = require('path');

const tempDir = path.join(
  __dirname,
  'runner',
  path.join(
    Math.random()
      .toString(36)
      .substring(7)
  ),
  'temp'
);

const rcFile = path.join(tempDir, '.npmrc');

process.env['GITHUB_REPOSITORY'] = 'OwnerName/repo';
process.env['RUNNER_TEMP'] = tempDir;
import * as auth from '../src/authutil';

describe('installer tests', () => {
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

  it('Sets up npmrc for npmjs', async () => {
    await auth.configAuthentication('https://registry.npmjs.org/', 'false');
    expect(fs.existsSync(rcFile)).toBe(true);
    expect(fs.readFileSync(rcFile, {encoding: 'utf8'})).toMatchSnapshot();
  });

  it('Appends trailing slash to registry', async () => {
    await auth.configAuthentication('https://registry.npmjs.org', 'false');

    expect(fs.existsSync(rcFile)).toBe(true);
    expect(fs.readFileSync(rcFile, {encoding: 'utf8'})).toMatchSnapshot();
  });

  it('Configures scoped npm registries', async () => {
    process.env['INPUT_SCOPE'] = 'myScope';
    await auth.configAuthentication('https://registry.npmjs.org', 'false');

    expect(fs.existsSync(rcFile)).toBe(true);
    expect(fs.readFileSync(rcFile, {encoding: 'utf8'})).toMatchSnapshot();
  });

  it('Automatically configures GPR scope', async () => {
    await auth.configAuthentication('npm.pkg.github.com', 'false');

    expect(fs.existsSync(rcFile)).toBe(true);
    expect(fs.readFileSync(rcFile, {encoding: 'utf8'})).toMatchSnapshot();
  });

  it('Sets up npmrc for always-auth true', async () => {
    await auth.configAuthentication('https://registry.npmjs.org/', 'true');
    expect(fs.existsSync(rcFile)).toBe(true);
    expect(fs.readFileSync(rcFile, {encoding: 'utf8'})).toMatchSnapshot();
  });
});
