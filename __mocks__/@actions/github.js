'use strict';

// CJS shim for @actions/github (v9+ is ESM-only, incompatible with Jest's CJS resolver).
// Replicates the Context class behaviour used by this repo: reads GITHUB_* env vars.
const context = {
  get repo() {
    const [owner, repo] = (process.env['GITHUB_REPOSITORY'] || '/').split('/');
    return {owner, repo};
  },
  get eventName() {
    return process.env['GITHUB_EVENT_NAME'] || '';
  },
  get sha() {
    return process.env['GITHUB_SHA'] || '';
  },
  get ref() {
    return process.env['GITHUB_REF'] || '';
  },
  get workflow() {
    return process.env['GITHUB_WORKFLOW'] || '';
  },
  get action() {
    return process.env['GITHUB_ACTION'] || '';
  },
  get actor() {
    return process.env['GITHUB_ACTOR'] || '';
  },
  get job() {
    return process.env['GITHUB_JOB'] || '';
  },
  get runNumber() {
    return parseInt(process.env['GITHUB_RUN_NUMBER'] || '0', 10);
  },
  get runId() {
    return parseInt(process.env['GITHUB_RUN_ID'] || '0', 10);
  },
  get apiUrl() {
    return process.env['GITHUB_API_URL'] || 'https://api.github.com';
  },
  get serverUrl() {
    return process.env['GITHUB_SERVER_URL'] || 'https://github.com';
  },
  get graphqlUrl() {
    return process.env['GITHUB_GRAPHQL_URL'] || 'https://api.github.com/graphql';
  },
  payload: {}
};

module.exports = {context};
