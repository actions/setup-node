import * as core from '@actions/core';
import * as exec from '@actions/exec';

export function parseNodeVersionFile(contents: string): string | null {
  let nodeVersion: string | undefined;

  // Try parsing the file as an NPM `package.json` file.
  try {
    const manifest = JSON.parse(contents);

    // JSON can parse numbers, but that's handled later
    if (typeof manifest === 'object') {
      nodeVersion = manifest.volta?.node;
      if (!nodeVersion) nodeVersion = manifest.engines?.node;

      // if contents are an object, we parsed JSON
      // this can happen if node-version-file is a package.json
      // yet contains no volta.node or engines.node
      //
      // if node-version file is _not_ json, control flow
      // will not have reached these lines.
      //
      // And because we've reached here, we know the contents
      // *are* JSON, so no further string parsing makes sense.
      if (!nodeVersion) {
        return null;
      }
    }
  } catch {
    core.info('Node version file is not JSON file');
  }

  if (!nodeVersion) {
    const found = contents.match(/^(?:node(js)?\s+)?v?(?<version>[^\s]+)$/m);
    nodeVersion = found?.groups?.version;
  }

  // In the case of an unknown format,
  // return as is and evaluate the version separately.
  if (!nodeVersion) nodeVersion = contents.trim();

  return nodeVersion as string;
}

export async function printEnvDetailsAndSetOutput() {
  core.startGroup('Environment details');

  const promises = ['node', 'npm', 'yarn'].map(async tool => {
    const output = await getToolVersion(tool, ['--version']);

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
  } catch (err) {
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
