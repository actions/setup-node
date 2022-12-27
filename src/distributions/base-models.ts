export interface INodejs {
  versionSpec: string;
  arch: string;
  auth?: string;
  checkLatest: boolean;
}

export interface INodeVersionInfo {
  downloadUrl: string;
  resolvedVersion: string;
  arch: string;
  fileName: string;
}

export interface INodeVersion {
  version: string;
  files: string[];
}
