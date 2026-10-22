import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as io from '@actions/io';
import {parse} from 'smol-toml';

import fs from 'fs';
import path from 'path';

const VOLTA_EXTENDS_CYCLE_ERROR_NAME = 'VoltaExtendsCycleError';

export function getNodeVersionFromFile(versionFilePath: string): string | null {
  return getNodeVersionFromFileWithStack(versionFilePath, []);
}

function getNodeVersionFromFileWithStack(
  versionFilePath: string,
  resolutionStack: string[]
): string | null {
  const resolvedFilePath = path.resolve(versionFilePath);
  const normalizedFilePath =
    process.platform === 'win32'
      ? resolvedFilePath.toLowerCase()
      : resolvedFilePath;
  const cycleStart = resolutionStack.findIndex(filePath =>
    process.platform === 'win32'
      ? filePath.toLowerCase() === normalizedFilePath
      : filePath === normalizedFilePath
  );

  if (cycleStart !== -1) {
    const cycle = [...resolutionStack.slice(cycleStart), resolvedFilePath];
    const error = new Error(
      `Circular Volta extends reference detected: ${cycle.join(' -> ')}`
    );
    error.name = VOLTA_EXTENDS_CYCLE_ERROR_NAME;
    throw error;
  }

  if (!fs.existsSync(versionFilePath)) {
    throw new Error(
      `The specified node version file at: ${versionFilePath} does not exist`
    );
  }

  const contents = fs.readFileSync(versionFilePath, 'utf8');
  const currentResolutionStack = [...resolutionStack, resolvedFilePath];

  // Try parsing the file as an NPM `package.json` file.
  try {
    const manifest = JSON.parse(contents);

    // Presume package.json file.
    if (typeof manifest === 'object' && !!manifest) {
      // Support Volta.
      // See https://docs.volta.sh/guide/understanding#managing-your-project
      if (manifest.volta?.node) {
        return manifest.volta.node;
      }

      // support devEngines from npm 11
      if (manifest.devEngines?.runtime) {
        // find an entry with name set to node and having set a version.
        // the devEngines.runtime can either be an object or an array of objects
        const nodeEntry = [manifest.devEngines.runtime]
          .flat()
          .find(({name, version}) => name?.toLowerCase() === 'node' && version);
        if (nodeEntry) {
          return nodeEntry.version;
        }
      }

      if (manifest.engines?.node) {
        return manifest.engines.node;
      }

      // Support Volta workspaces.
      // See https://docs.volta.sh/advanced/workspaces
      if (manifest.volta?.extends) {
        const extendedFilePath = path.resolve(
          path.dirname(versionFilePath),
          manifest.volta.extends
        );
        core.info('Resolving node version from ' + extendedFilePath);
        return getNodeVersionFromFileWithStack(
          extendedFilePath,
          currentResolutionStack
        );
      }

      // If contents are an object, we parsed JSON
      // this can happen if node-version-file is a package.json
      // yet contains no volta.node or engines.node
      //
      // If node-version file is _not_ JSON, control flow
      // will not have reached these lines.
      //
      // And because we've reached here, we know the contents
      // *are* JSON, so no further string parsing makes sense.
      return null;
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === VOLTA_EXTENDS_CYCLE_ERROR_NAME
    ) {
      throw error;
    }
    core.info('Node version file is not JSON file');
  }

  // Try parsing the file as a mise `mise.toml` file.
  try {
    const manifest: Record<string, any> = parse(contents);
    if (manifest?.tools?.node) {
      const node = manifest.tools.node;

      if (typeof node === 'object' && node?.version) {
        return node.version;
      }

      if (typeof node === 'string') {
        return node;
      }

      return null;
    }
  } catch {
    core.info('Node version file is not TOML file');
  }

  const found = contents.match(/^(?:node(js)?\s+)?v?(?<version>[^\s]+)$/m);
  return found?.groups?.version ?? contents.trim();
}

export async function printEnvDetailsAndSetOutput() {
  core.startGroup('Environment details');
  const promises = ['node', 'npm', 'yarn'].map(async tool => {
    const pathTool = await io.which(tool, false);
    const output = pathTool ? await getToolVersion(tool, ['--version']) : '';

    return {tool, output};
  });

  const tools = await Promise.all(promises);
  tools.forEach(({tool, output}) => {
    if (tool === 'node') {
      core.setOutput(`${tool}-version`, output);
    }
    core.info(`${tool}: ${output}`);
  });

  core.endGroup();
}

async function getToolVersion(tool: string, options: string[]) {
  try {
    const {stdout, stderr, exitCode} = await exec.getExecOutput(tool, options, {
      ignoreReturnCode: true,
      silent: true
    });

    if (exitCode > 0) {
      core.info(`[warning]${stderr}`);
      return '';
    }

    return stdout.trim();
  } catch {
    return '';
  }
}

export const unique = () => {
  const encountered = new Set();
  return (value: unknown): boolean => {
    if (encountered.has(value)) return false;
    encountered.add(value);
    return true;
  };
};
