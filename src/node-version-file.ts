import * as semvar from 'semver';
import {INodeVersion, getVersionsFromDist} from './node-version';

export async function parseNodeVersionFile(contents: string): Promise<string> {
  contents = contents.trim();

  if (/^v\d/.test(contents)) {
    contents = contents.substring(1);
  }

  const nodeVersions = await getVersionsFromDist();

  let nodeVersion: string;

  if (contents.startsWith('lts/')) {
    nodeVersion = findLatestLts(nodeVersions, contents).version;
  } else if (semvar.valid(contents) || isPartialMatch(contents)) {
    nodeVersion = contents;
  } else {
    throw new Error(`Couldn't resolve node version: '${contents}'`);
  }

  return stripVPrefix(nodeVersion);
}

function findLatestLts(
  nodeVersions: INodeVersion[],
  codename: string
): INodeVersion {
  let nodeVersion: INodeVersion | undefined;

  if (codename === 'lts/*') {
    nodeVersion = nodeVersions.reduce((latest, nodeVersion) => {
      if (!nodeVersion.lts) {
        return latest;
      }

      return semvar.gt(nodeVersion.version, latest.version)
        ? nodeVersion
        : latest;
    });
  } else {
    codename = codename.replace('lts/', '').toLowerCase();

    nodeVersion = nodeVersions.find(
      nodeVersion => `${nodeVersion.lts}`.toLowerCase() === codename
    );
  }

  if (!nodeVersion) {
    throw new Error(
      `Couldn't find matching release for codename: '${codename}'`
    );
  }

  return nodeVersion;
}

function isPartialMatch(version: string): boolean {
  return /^\d+(\.\d+(\.\d+)?)?$/.test(version);
}

function stripVPrefix(version: string): string {
  return /^v\d/.test(version) ? version.substring(1) : version;
}
