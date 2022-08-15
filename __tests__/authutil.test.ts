import os = require('os');
import * as fs from 'fs';
import * as path from 'path';
import * as core from '@actions/core';
import * as io from '@actions/io';
import * as auth from '../src/authutil';

let rcFile: string;

describe('authutil tests', () => {
  const _runnerDir = path.join(__dirname, 'runner');

  let cnSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;
  let dbgSpy: jest.SpyInstance;

  beforeAll(async () => {
    const randPath = path.join(
      Math.random()
        .toString(36)
        .substring(7)
    );
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
    dbgSpy = jest.spyOn(core, 'debug');
    cnSpy.mockImplementation(line => {
      // uncomment to debug
      // process.stderr.write('write:' + line + '\n');
    });
    logSpy.mockImplementation(line => {
      // uncomment to debug
      // process.stderr.write('log:' + line + '\n');
    });
    dbgSpy.mockImplementation(msg => {
      // uncomment to see debug output
      // process.stderr.write(msg + '\n');
    });
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
    let rc = {};
    let contents = fs.readFileSync(rcFile, {encoding: 'utf8'});
    for (const line of contents.split(os.EOL)) {
      let parts = line.split('=');
      if (parts.length == 2) {
        rc[parts[0].trim()] = parts[1].trim();
      }
    }
    return rc;
  }

  it('Sets up npmrc for npmjs', async () => {
    await auth.configAuthentication('https://registry.npmjs.org/', 'false');

    expect(fs.statSync(rcFile)).toBeDefined();
    let contents = fs.readFileSync(rcFile, {encoding: 'utf8'});
    let rc = readRcFile(rcFile);
    expect(rc['registry']).toBe('https://registry.npmjs.org/');
    expect(rc['always-auth']).toBe('false');
  });

  it('Appends trailing slash to registry', async () => {
    await auth.configAuthentication('https://registry.npmjs.org', 'false');

    expect(fs.statSync(rcFile)).toBeDefined();
    let rc = readRcFile(rcFile);
    expect(rc['registry']).toBe('https://registry.npmjs.org/');
    expect(rc['always-auth']).toBe('false');
  });

  it('Configures scoped npm registries', async () => {
    process.env['INPUT_SCOPE'] = 'myScope';
    await auth.configAuthentication('https://registry.npmjs.org', 'false');

    expect(fs.statSync(rcFile)).toBeDefined();
    let rc = readRcFile(rcFile);
    expect(rc['@myscope:registry']).toBe('https://registry.npmjs.org/');
    expect(rc['always-auth']).toBe('false');
  });

  it('Automatically configures GPR scope', async () => {
    await auth.configAuthentication('npm.pkg.github.com', 'false');

    expect(fs.statSync(rcFile)).toBeDefined();
    let rc = readRcFile(rcFile);
    expect(rc['@ownername:registry']).toBe('npm.pkg.github.com/');
    expect(rc['always-auth']).toBe('false');
  });

  it('Sets up npmrc for always-auth true', async () => {
    await auth.configAuthentication('https://registry.npmjs.org/', 'true');
    expect(fs.statSync(rcFile)).toBeDefined();
    let rc = readRcFile(rcFile);
    expect(rc['registry']).toBe('https://registry.npmjs.org/');
    expect(rc['always-auth']).toBe('true');
  });
  it('It is already set the NODE_AUTH_TOKEN export it ', async () => {
    process.env.NODE_AUTH_TOKEN = 'foobar';
    await auth.configAuthentication('npm.pkg.github.com', 'false');
    expect(fs.statSync(rcFile)).toBeDefined();
    let rc = readRcFile(rcFile);
    expect(rc['@ownername:registry']).toBe('npm.pkg.github.com/');
    expect(rc['always-auth']).toBe('false');
    expect(process.env.NODE_AUTH_TOKEN).toEqual('foobar');
  });
});
