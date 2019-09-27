import io = require('@actions/io');
import fs = require('fs');
import nock = require('nock');
import os = require('os');
import path = require('path');

const toolDir = path.join(
  __dirname,
  'runner',
  path.join(
    Math.random()
      .toString(36)
      .substring(7)
  ),
  'tools'
);
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

process.env['RUNNER_TOOL_CACHE'] = toolDir;
process.env['RUNNER_TEMP'] = tempDir;
import * as installer from '../src/installer';

const IS_WINDOWS = process.platform === 'win32';

describe('installer tests', () => {
  beforeAll(async () => {
    await io.rmRF(toolDir);
    await io.rmRF(tempDir);
  }, 100000);

  beforeEach(() => {
    nock.cleanAll();
  });

  it('Acquires version of node if no matching version is installed', async () => {
    await installer.getNode('10.16.0');
    const nodeDir = path.join(toolDir, 'node', '10.16.0', os.arch());

    expect(fs.existsSync(`${nodeDir}.complete`)).toBe(true);
    if (IS_WINDOWS) {
      expect(fs.existsSync(path.join(nodeDir, 'node.exe'))).toBe(true);
    } else {
      expect(fs.existsSync(path.join(nodeDir, 'bin', 'node'))).toBe(true);
    }
  }, 100000);

  if (IS_WINDOWS) {
    it('Falls back to backup location if first one doesnt contain correct version', async () => {
      await installer.getNode('5.10.1');
      const nodeDir = path.join(toolDir, 'node', '5.10.1', os.arch());

      expect(fs.existsSync(`${nodeDir}.complete`)).toBe(true);
      expect(fs.existsSync(path.join(nodeDir, 'node.exe'))).toBe(true);
    }, 100000);

    it('Falls back to third location if second one doesnt contain correct version', async () => {
      await installer.getNode('0.12.18');
      const nodeDir = path.join(toolDir, 'node', '0.12.18', os.arch());

      expect(fs.existsSync(`${nodeDir}.complete`)).toBe(true);
      expect(fs.existsSync(path.join(nodeDir, 'node.exe'))).toBe(true);
    }, 100000);
  }

  it('Throws if no location contains correct node version', async () => {
    let thrown = false;
    try {
      await installer.getNode('1000');
    } catch {
      thrown = true;
    }
    expect(thrown).toBe(true);
  });

  it('Acquires version of node with long paths', async () => {
    const toolpath = await installer.getNode('8.8.1');
    const nodeDir = path.join(toolDir, 'node', '8.8.1', os.arch());

    expect(fs.existsSync(`${nodeDir}.complete`)).toBe(true);
    if (IS_WINDOWS) {
      expect(fs.existsSync(path.join(nodeDir, 'node.exe'))).toBe(true);
    } else {
      expect(fs.existsSync(path.join(nodeDir, 'bin', 'node'))).toBe(true);
    }
  }, 100000);

  it('Uses version of node installed in cache', async () => {
    const nodeDir: string = path.join(toolDir, 'node', '250.0.0', os.arch());
    await io.mkdirP(nodeDir);
    fs.writeFileSync(`${nodeDir}.complete`, 'hello');
    // This will throw if it doesn't find it in the cache (because no such version exists)
    await installer.getNode('250.0.0');
    return;
  });

  it('Doesnt use version of node that was only partially installed in cache', async () => {
    const nodeDir: string = path.join(toolDir, 'node', '251.0.0', os.arch());
    await io.mkdirP(nodeDir);
    let thrown = false;
    try {
      // This will throw if it doesn't find it in the cache (because no such version exists)
      await installer.getNode('251.0.0');
    } catch {
      thrown = true;
    }
    expect(thrown).toBe(true);
    return;
  });

  it('Resolves semantic versions of node installed in cache', async () => {
    const nodeDir: string = path.join(toolDir, 'node', '252.0.0', os.arch());
    await io.mkdirP(nodeDir);
    fs.writeFileSync(`${nodeDir}.complete`, 'hello');
    // These will throw if it doesn't find it in the cache (because no such version exists)
    await installer.getNode('252.0.0');
    await installer.getNode('252');
    await installer.getNode('252.0');
  });

  it('Acquires specified x86 version of node if no matching version is installed', async () => {
    const arch = 'x86';
    const version = '8.8.0';
    const fileExtension = IS_WINDOWS ? '7z' : 'tar.gz';
    const platform = {
      linux: 'linux',
      darwin: 'darwin',
      win32: 'win'
    }[process.platform];
    const fileName = `node-v${version}-${platform}-${arch}.${fileExtension}`;
    const pathOnNodeJs = `/dist/v${version}/${fileName}`;
    const scope = nock('https://nodejs.org')
      .get(pathOnNodeJs)
      .replyWithFile(
        200,
        path.join(__dirname, '__fixtures__', `mock-${fileName}`)
      );
    await installer.getNode(version, arch);
    const nodeDir = path.join(toolDir, 'node', version, arch);

    expect(scope.isDone()).toBe(true);
    expect(fs.existsSync(`${nodeDir}.complete`)).toBe(true);
    if (IS_WINDOWS) {
      expect(fs.existsSync(path.join(nodeDir, 'node.exe'))).toBe(true);
    } else {
      expect(fs.existsSync(path.join(nodeDir, 'bin', 'node'))).toBe(true);
    }
  }, 100000);

  it('Acquires specified x64 version of node if no matching version is installed', async () => {
    const arch = 'x64';
    const version = '8.9.1';
    const fileExtension = IS_WINDOWS ? '7z' : 'tar.gz';
    const platform = {
      linux: 'linux',
      darwin: 'darwin',
      win32: 'win'
    }[process.platform];
    const fileName = `node-v${version}-${platform}-${arch}.${fileExtension}`;
    const pathOnNodeJs = `/dist/v${version}/${fileName}`;
    const scope = nock('https://nodejs.org')
      .get(pathOnNodeJs)
      .replyWithFile(
        200,
        path.join(__dirname, '__fixtures__', `mock-${fileName}`)
      );
    await installer.getNode(version, arch);
    const nodeDir = path.join(toolDir, 'node', version, arch);

    expect(scope.isDone()).toBe(true);
    expect(fs.existsSync(`${nodeDir}.complete`)).toBe(true);
    if (IS_WINDOWS) {
      expect(fs.existsSync(path.join(nodeDir, 'node.exe'))).toBe(true);
    } else {
      expect(fs.existsSync(path.join(nodeDir, 'bin', 'node'))).toBe(true);
    }
  }, 100000);
});
