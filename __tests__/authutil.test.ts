import {
  jest,
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterAll
} from '@jest/globals';
import {fileURLToPath} from 'url';
import os from 'os';
import fs from 'fs';
import * as path from 'path';
import * as io from '@actions/io';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

jest.unstable_mockModule('@actions/core', () => ({
  info: jest.fn(),
  warning: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
  notice: jest.fn(),
  setFailed: jest.fn(),
  setOutput: jest.fn(),
  getInput: jest.fn((name: string) => {
    const val =
      process.env[`INPUT_${name.replace(/ /g, '_').toUpperCase()}`] || '';
    return val.trim();
  }),
  getBooleanInput: jest.fn(),
  getMultilineInput: jest.fn(),
  addPath: jest.fn(),
  exportVariable: jest.fn(),
  saveState: jest.fn(),
  getState: jest.fn(),
  setSecret: jest.fn(),
  isDebug: jest.fn(() => false),
  startGroup: jest.fn(),
  endGroup: jest.fn(),
  group: jest.fn((_name: string, fn: () => Promise<unknown>) => fn())
}));

// Dynamic imports AFTER mocking so authutil sees the mocked core.
const core = await import('@actions/core');
const auth = await import('../src/authutil.js');

let rcFile: string;

describe('authutil tests', () => {
  const _runnerDir = path.join(__dirname, 'runner');

  let cnSpy: jest.SpiedFunction<typeof process.stdout.write>;
  let logSpy: jest.SpiedFunction<typeof console.log>;

  beforeAll(async () => {
    const randPath = path.join(Math.random().toString(36).substring(7));
    console.log('::stop-commands::stoptoken'); // Disable executing of runner commands when running tests in actions
    process.env['GITHUB_ENV'] = ''; // Stub out Environment file functionality so we can verify it writes to standard out (toolkit is backwards compatible)
    const tempDir = path.join(_runnerDir, randPath, 'temp');
    await io.rmRF(tempDir);
    await io.mkdirP(tempDir);
    process.env['GITHUB_REPOSITORY'] = 'OwnerName/repo';
    process.env['RUNNER_TEMP'] = tempDir;
    rcFile = path.join(tempDir, '.npmrc');
  }, 100000);

  beforeEach(async () => {
    await io.rmRF(rcFile);
    // if (fs.existsSync(rcFile)) {
    //   fs.unlinkSync(rcFile);
    // }
    process.env['INPUT_SCOPE'] = '';

    // writes
    cnSpy = jest.spyOn(process.stdout, 'write');
    logSpy = jest.spyOn(console, 'log');
    cnSpy.mockImplementation(() => true);
    logSpy.mockImplementation(() => {});
  }, 100000);

  function dbg(message: string) {
    process.stderr.write('dbg::' + message + '::\n');
  }

  afterAll(async () => {
    if (_runnerDir) {
      await io.rmRF(_runnerDir);
    }
    console.log('::stoptoken::'); // Re-enable executing of runner commands when running tests in actions
  }, 100000);

  function readRcFile(rcFile: string) {
    const rc = {};
    const contents = fs.readFileSync(rcFile, {encoding: 'utf8'});
    for (const line of contents.split(os.EOL)) {
      const parts = line.split('=');
      if (parts.length == 2) {
        rc[parts[0].trim()] = parts[1].trim();
      }
    }
    return rc;
  }

  it('Sets up npmrc for npmjs', async () => {
    await auth.configAuthentication('https://registry.npmjs.org/');

    expect(fs.statSync(rcFile)).toBeDefined();
    const contents = fs.readFileSync(rcFile, {encoding: 'utf8'});
    const rc = readRcFile(rcFile);
    expect(rc['registry']).toBe('https://registry.npmjs.org/');
  });

  it('Appends trailing slash to registry', async () => {
    await auth.configAuthentication('https://registry.npmjs.org');

    expect(fs.statSync(rcFile)).toBeDefined();
    const rc = readRcFile(rcFile);
    expect(rc['registry']).toBe('https://registry.npmjs.org/');
  });

  it('Configures scoped npm registries', async () => {
    process.env['INPUT_SCOPE'] = 'myScope';
    await auth.configAuthentication('https://registry.npmjs.org');

    expect(fs.statSync(rcFile)).toBeDefined();
    const rc = readRcFile(rcFile);
    expect(rc['@myscope:registry']).toBe('https://registry.npmjs.org/');
  });

  it('Automatically configures GPR scope', async () => {
    await auth.configAuthentication('npm.pkg.github.com');

    expect(fs.statSync(rcFile)).toBeDefined();
    const rc = readRcFile(rcFile);
    expect(rc['@ownername:registry']).toBe('npm.pkg.github.com/');
  });

  it('is already set the NODE_AUTH_TOKEN export it', async () => {
    process.env.NODE_AUTH_TOKEN = 'foobar';
    await auth.configAuthentication('npm.pkg.github.com');
    expect(fs.statSync(rcFile)).toBeDefined();
    const rc = readRcFile(rcFile);
    expect(rc['@ownername:registry']).toBe('npm.pkg.github.com/');
    expect(process.env.NODE_AUTH_TOKEN).toEqual('foobar');
  });

  it('should not export NODE_AUTH_TOKEN if not set in environment', async () => {
    const exportSpy = core.exportVariable as jest.Mock;
    exportSpy.mockClear();
    delete process.env.NODE_AUTH_TOKEN;
    await auth.configAuthentication('https://registry.npmjs.org/');
    expect(fs.statSync(rcFile)).toBeDefined();
    const rc = readRcFile(rcFile);
    expect(rc['registry']).toBe('https://registry.npmjs.org/');
    expect(exportSpy).not.toHaveBeenCalledWith(
      'NODE_AUTH_TOKEN',
      expect.anything()
    );
  });

  it('should export NODE_AUTH_TOKEN if set to empty string', async () => {
    const exportSpy = core.exportVariable as jest.Mock;
    exportSpy.mockClear();
    process.env.NODE_AUTH_TOKEN = '';
    await auth.configAuthentication('https://registry.npmjs.org/');
    expect(fs.statSync(rcFile)).toBeDefined();
    expect(exportSpy).toHaveBeenCalledWith('NODE_AUTH_TOKEN', '');
  });

  it('configAuthentication should overwrite non-scoped with non-scoped', async () => {
    fs.writeFileSync(rcFile, 'registry=NNN');
    await auth.configAuthentication('https://registry.npmjs.org/');
    const contents = fs.readFileSync(rcFile, {encoding: 'utf8'});
    expect(contents).toBe(
      `//registry.npmjs.org/:_authToken=\${NODE_AUTH_TOKEN}${os.EOL}registry=https://registry.npmjs.org/`
    );
  });

  it('configAuthentication should overwrite only non-scoped', async () => {
    fs.writeFileSync(rcFile, `registry=NNN${os.EOL}@myscope:registry=MMM`);
    await auth.configAuthentication('https://registry.npmjs.org/');
    const contents = fs.readFileSync(rcFile, {encoding: 'utf8'});
    expect(contents).toBe(
      `@myscope:registry=MMM${os.EOL}//registry.npmjs.org/:_authToken=\${NODE_AUTH_TOKEN}${os.EOL}registry=https://registry.npmjs.org/`
    );
  });

  it('configAuthentication should add non-scoped to scoped', async () => {
    fs.writeFileSync(rcFile, '@myscope:registry=NNN');
    await auth.configAuthentication('https://registry.npmjs.org/');
    const contents = fs.readFileSync(rcFile, {encoding: 'utf8'});
    expect(contents).toBe(
      `@myscope:registry=NNN${os.EOL}//registry.npmjs.org/:_authToken=\${NODE_AUTH_TOKEN}${os.EOL}registry=https://registry.npmjs.org/`
    );
  });

  it('configAuthentication should overwrite scoped with scoped', async () => {
    process.env['INPUT_SCOPE'] = 'myscope';
    fs.writeFileSync(rcFile, `@myscope:registry=NNN`);
    await auth.configAuthentication('https://registry.npmjs.org/');
    const contents = fs.readFileSync(rcFile, {encoding: 'utf8'});
    expect(contents).toBe(
      `//registry.npmjs.org/:_authToken=\${NODE_AUTH_TOKEN}${os.EOL}@myscope:registry=https://registry.npmjs.org/`
    );
  });

  it('configAuthentication should overwrite only scoped', async () => {
    process.env['INPUT_SCOPE'] = 'myscope';
    fs.writeFileSync(rcFile, `registry=NNN${os.EOL}@myscope:registry=MMM`);
    await auth.configAuthentication('https://registry.npmjs.org/');
    const contents = fs.readFileSync(rcFile, {encoding: 'utf8'});
    expect(contents).toBe(
      `registry=NNN${os.EOL}//registry.npmjs.org/:_authToken=\${NODE_AUTH_TOKEN}${os.EOL}@myscope:registry=https://registry.npmjs.org/`
    );
  });

  it('configAuthentication should add scoped to non-scoped', async () => {
    process.env['INPUT_SCOPE'] = 'myscope';
    fs.writeFileSync(rcFile, `registry=MMM`);
    await auth.configAuthentication('https://registry.npmjs.org/');
    const contents = fs.readFileSync(rcFile, {encoding: 'utf8'});
    expect(contents).toBe(
      `registry=MMM${os.EOL}//registry.npmjs.org/:_authToken=\${NODE_AUTH_TOKEN}${os.EOL}@myscope:registry=https://registry.npmjs.org/`
    );
  });

  it('configAuthentication should overwrite only one scoped', async () => {
    process.env['INPUT_SCOPE'] = 'myscope';
    fs.writeFileSync(
      rcFile,
      `@otherscope:registry=NNN${os.EOL}@myscope:registry=MMM`
    );
    await auth.configAuthentication('https://registry.npmjs.org/');
    const contents = fs.readFileSync(rcFile, {encoding: 'utf8'});
    expect(contents).toBe(
      `@otherscope:registry=NNN${os.EOL}//registry.npmjs.org/:_authToken=\${NODE_AUTH_TOKEN}${os.EOL}@myscope:registry=https://registry.npmjs.org/`
    );
  });

  it('configAuthentication should add scoped to another scoped', async () => {
    process.env['INPUT_SCOPE'] = 'myscope';
    fs.writeFileSync(rcFile, `@otherscope:registry=MMM`);
    await auth.configAuthentication('https://registry.npmjs.org/');
    const contents = fs.readFileSync(rcFile, {encoding: 'utf8'});
    expect(contents).toBe(
      `@otherscope:registry=MMM${os.EOL}//registry.npmjs.org/:_authToken=\${NODE_AUTH_TOKEN}${os.EOL}@myscope:registry=https://registry.npmjs.org/`
    );
  });
});
