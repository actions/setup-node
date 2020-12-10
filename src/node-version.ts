import * as hc from '@actions/http-client';

//
// Node versions interface
// see https://nodejs.org/dist/index.json
//
export interface INodeVersion {
  version: string;
  files: string[];
  lts: boolean | string;
}

export async function getVersionsFromDist(): Promise<INodeVersion[]> {
  let dataUrl = 'https://nodejs.org/dist/index.json';
  let httpClient = new hc.HttpClient('setup-node', [], {
    allowRetries: true,
    maxRetries: 3
  });
  let response = await httpClient.getJson<INodeVersion[]>(dataUrl);
  return response.result || [];
}
