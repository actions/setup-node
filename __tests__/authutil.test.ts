import * as io from '@actions/io';
import * as fs from 'fs';
import * as path from 'path';
import * as auth from '../src/authutil';

let rcFile: string;

describe('installer tests', () => {
  beforeAll(async () => {
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
    await io.rmRF(tempDir);
    await io.mkdirP(tempDir);
    process.env['GITHUB_REPOSITORY'] = 'OwnerName/repo';
    process.env['RUNNER_TEMP'] = tempDir;
    rcFile = path.join(tempDir, '.npmrc');
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
