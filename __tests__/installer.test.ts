import * as io from '@actions/io';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as semver from 'semver';
import * as restm from 'typed-rest-client/RestClient';

const IS_WINDOWS = process.platform === 'win32';
const osArch = os.arch();
const runnerDir = path.join(__dirname, 'runner');
const randomizer = () =>
  Math.random()
    .toString(36)
    .substring(7);
const toolDir = path.join(runnerDir, randomizer(), 'tools');
const tempDir = path.join(runnerDir, randomizer(), 'temp');

process.env['RUNNER_TOOL_CACHE'] = toolDir;
process.env['RUNNER_TEMP'] = tempDir;
import * as installer from '../src/installer';

describe('installer tests', () => {
  beforeAll(async () => {
    await io.rmRF(toolDir);
    await io.rmRF(tempDir);
  }, 100000);

  if (IS_WINDOWS) {
    it(`Falls back to backup location if first one doesn't contain correct version`, async () => {
      await installer.getNode('5.10.1');
      const nodeDir = path.join(toolDir, 'node', '5.10.1', osArch);

      expect(fs.existsSync(`${nodeDir}.complete`)).toBe(true);
      expect(fs.existsSync(path.join(nodeDir, 'node.exe'))).toBe(true);
    }, 100000);

    it(`Falls back to third location if second one doesn't contain correct version`, async () => {
      await installer.getNode('0.12.18');
      const nodeDir = path.join(toolDir, 'node', '0.12.18', osArch);

      expect(fs.existsSync(`${nodeDir}.complete`)).toBe(true);
      expect(fs.existsSync(path.join(nodeDir, 'node.exe'))).toBe(true);
    }, 100000);
  }

  it('Uses version of node installed in cache', async () => {
    const nodeDir: string = path.join(toolDir, 'node', '250.0.0', osArch);
    await io.mkdirP(nodeDir);
    fs.writeFileSync(`${nodeDir}.complete`, 'hello');
    // This will throw if it doesn't find it in the cache (because no such version exists)
    await installer.getNode('250.0.0');
  });

  it(`Doesn't use version of node that was only partially installed in cache`, async () => {
    const nodeDir: string = path.join(toolDir, 'node', '251.0.0', osArch);
    await io.mkdirP(nodeDir);
    try {
      // This will throw if it doesn't find it in the cache (because no such version exists)
      await installer.getNode('251.0.0');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
    }
  });

  describe('Throws', () => {
    it('on unknown node version codename', async () => {
      try {
        await installer.getNode('potterium');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('if no location contains correct node version', async () => {
      try {
        await installer.getNode('1000');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe(`Acquires version of node if no matching version is installed of pattern`, () => {
    it(`'x'`, async () => {
      await installer.getNode('6');
      const nodeDir = path.join(toolDir, 'node', '6.17.1', osArch);

      expect(fs.existsSync(`${nodeDir}.complete`)).toBe(true);
      if (IS_WINDOWS) {
        expect(fs.existsSync(path.join(nodeDir, 'node.exe'))).toBe(true);
      } else {
        expect(fs.existsSync(path.join(nodeDir, 'bin', 'node'))).toBe(true);
      }
    }, 100000);

    it(`'x.x'`, async () => {
      await installer.getNode('6.x');
      const nodeDir = path.join(toolDir, 'node', '6.17.1', osArch);

      expect(fs.existsSync(`${nodeDir}.complete`)).toBe(true);
      if (IS_WINDOWS) {
        expect(fs.existsSync(path.join(nodeDir, 'node.exe'))).toBe(true);
      } else {
        expect(fs.existsSync(path.join(nodeDir, 'bin', 'node'))).toBe(true);
      }
    }, 100000);

    it(`'x.x.x'`, async () => {
      await installer.getNode('6.17.1');
      const nodeDir = path.join(toolDir, 'node', '6.17.1', osArch);

      expect(fs.existsSync(`${nodeDir}.complete`)).toBe(true);
      if (IS_WINDOWS) {
        expect(fs.existsSync(path.join(nodeDir, 'node.exe'))).toBe(true);
      } else {
        expect(fs.existsSync(path.join(nodeDir, 'bin', 'node'))).toBe(true);
      }
    }, 100000);
  });

  describe(`Resolves`, () => {
    let getLatestNodeVersionOf: (
      predicator: (...args: any[]) => boolean
    ) => string;

    beforeAll(async () => {
      const restClient = new restm.RestClient('setup-node');
      const request = await restClient.get<installer.INodeVersion[]>(
        'https://nodejs.org/dist/index.json'
      );
      const nodeVersions = request.result || [];
      const osPlat = IS_WINDOWS
        ? 'win'
        : process.platform === 'darwin'
        ? 'osx'
        : 'linux';

      getLatestNodeVersionOf = (predicator: (...args: any[]) => boolean) => {
        const osPlatArchRegExp = new RegExp(
          `^${osPlat}-${osArch}-?(?:7z|tar)?`
        );
        const version = nodeVersions
          .filter((version: installer.INodeVersion) =>
            version.files.some((file: string) => osPlatArchRegExp.test(file))
          )
          .filter(predicator)
          .sort((a: installer.INodeVersion, b: installer.INodeVersion) =>
            semver.gt(b.version, a.version) ? 1 : -1
          )[0].version;
        return semver.clean(version) || '';
      };
    });

    it('semantic versions of node installed in cache', async () => {
      const nodeDir: string = path.join(toolDir, 'node', '252.0.0', osArch);
      await io.mkdirP(nodeDir);
      fs.writeFileSync(`${nodeDir}.complete`, 'hello');
      // These will throw if it doesn't find it in the cache (because no such version exists)
      await installer.getNode('252.0.0');
      await installer.getNode('252');
      await installer.getNode('252.0');
    });

    it(`'latest' to latest node version`, async () => {
      await installer.getNode('latest');
      const nodeDir = path.join(
        toolDir,
        'node',
        getLatestNodeVersionOf(
          (nv: installer.INodeVersion) => typeof nv.lts !== 'string'
        ),
        osArch
      );
      expect(fs.existsSync(`${nodeDir}.complete`)).toBe(true);
    }, 100000);

    it(`'current' to current node version`, async () => {
      await installer.getNode('current');
      const nodeDir = path.join(
        toolDir,
        'node',
        getLatestNodeVersionOf(
          (nv: installer.INodeVersion) => typeof nv.lts !== 'string'
        ),
        osArch
      );
      expect(fs.existsSync(`${nodeDir}.complete`)).toBe(true);
    }, 100000);

    it(`'lts' to latest LTS node version`, async () => {
      await installer.getNode('lts');
      const nodeDir = path.join(
        toolDir,
        'node',
        getLatestNodeVersionOf(
          (nv: installer.INodeVersion) => typeof nv.lts === 'string'
        ),
        osArch
      );
      expect(fs.existsSync(`${nodeDir}.complete`)).toBe(true);
    }, 100000);

    it(`'argon' to latest node version 4`, async () => {
      await installer.getNode('argon');
      const nodeDir = path.join(
        toolDir,
        'node',
        getLatestNodeVersionOf((nv: installer.INodeVersion) =>
          /v4.\d+.\d+/.test(nv.version)
        ),
        osArch
      );
      expect(fs.existsSync(`${nodeDir}.complete`)).toBe(true);
    }, 100000);

    it(`'boron' to latest node version 6`, async () => {
      await installer.getNode('boron');
      const nodeDir = path.join(
        toolDir,
        'node',
        getLatestNodeVersionOf((nv: installer.INodeVersion) =>
          /v6.\d+.\d+/.test(nv.version)
        ),
        osArch
      );
      expect(fs.existsSync(`${nodeDir}.complete`)).toBe(true);
    }, 100000);

    it(`'carbon' to latest node version 8`, async () => {
      await installer.getNode('carbon');
      const nodeDir = path.join(
        toolDir,
        'node',
        getLatestNodeVersionOf((nv: installer.INodeVersion) =>
          /v8.\d+.\d+/.test(nv.version)
        ),
        osArch
      );
      expect(fs.existsSync(`${nodeDir}.complete`)).toBe(true);
    }, 100000);

    it(`'dubnium' to latest node version 10`, async () => {
      await installer.getNode('dubnium');
      const nodeDir = path.join(
        toolDir,
        'node',
        getLatestNodeVersionOf((nv: installer.INodeVersion) =>
          /v10.\d+.\d+/.test(nv.version)
        ),
        osArch
      );
      expect(fs.existsSync(`${nodeDir}.complete`)).toBe(true);
    }, 100000);
  });
});
