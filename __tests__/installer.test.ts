import installer = require('../src/installer');
import io = require('@actions/io');
import fs = require('fs');
import os = require('os');
import path = require('path');

const toolDir = path.join(__dirname, 'runner', 'tools');

const tempDir = path.join(__dirname, 'runner', 'temp');

describe('installer tests', () => {
  beforeAll(() => {});
  beforeAll(async () => {
    // TODO - these should eventually be changed to match new method of loading dir
    process.env['Runner.ToolsDirectory'] = toolDir;
    process.env['Runner.TempDirectory'] = tempDir;
    await io.rmRF(toolDir);
    await io.rmRF(tempDir);
  });

  it('Acquires version of node if no matching version is installed', async () => {
    await installer.getNode('10.16.0');
    const nodeDir = path.join(toolDir, 'node', '10.16.0', os.arch());

    expect(fs.existsSync(`${nodeDir}.complete`)).toBe(true);
    expect(fs.existsSync(path.join(nodeDir, 'node.exe'))).toBe(true);
  }, 100000);

  if (process.platform === 'win32') {
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
    expect(fs.existsSync(path.join(nodeDir, 'node.exe'))).toBe(true);
  }, 100000);

  it('Uses version of node installed in cache', async () => {
    const nodeDir: string = path.join(toolDir, '250.0.0', os.arch());
    await io.mkdirP(nodeDir);
    fs.writeFileSync(`${nodeDir}.complete`, 'hello');
    // This will throw if it doesn't find it in the cache (because no such version exists)
    await installer.getNode('250.0.0');
    return;
  });

  it('Doesnt use version of node that was only partially installed in cache', async () => {
    const nodeDir: string = path.join(toolDir, '250.0.0', os.arch());
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
    const nodeDir: string = path.join(toolDir, '250.0.0', os.arch());
    await io.mkdirP(nodeDir);
    fs.writeFileSync(`${nodeDir}.complete`, 'hello');
    // These will throw if it doesn't find it in the cache (because no such version exists)
    await installer.getNode('250.0.0');
    await installer.getNode('250');
    await installer.getNode('250.0');
  });
});
