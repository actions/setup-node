# 0. Support caching dependencies for mono repos
Date: 2021-07-13

Status: Proposed

## Context
Currently, `actions/setup-node` supports caching dependencies for Npm and Yarn package managers.  
For the first iteration, we have decided to not support cases where `package-lock.json` / `yarn.lock` are located outside of repository root.  
Current implementation searches the following file patterns in the repository root: `package-lock.json`, `yarn.lock` (in order of resolving priorities)

Obviously, it made build-in caching unusable for mono-repos and repos with complex structure.  
We would like to revisit this decision and add customization for dependencies lock file location.

## Proposal
We have the following options:
1. Allow to specify  directory where `package-lock.json` or `yarn.lock` are located
2. Allow to specify path to the dependencies lock file (including directory path and filename)

The second option looks more generic because it allows to:
- specify multiple dependencies files using file patterns like `**/package-lock.json` ([one of recommended approaches in actions/cache](https://github.com/actions/cache/blob/main/examples.md#macos-and-ubuntu))
- specify custom dependencies files like `src/npm-shrinkwrap.json`
- change default resolving priority if both `yarn.lock` and `package-lock.json` exist in repository

## Decision

Add `cache-dependency-path` input that will accept path (relative to repository root) to dependencies lock file.  
If provided path contains wildcards, the action will search all maching files and calculate common hash like `${{ hashFiles('**/package-lock.json') }}` YAML construction does.  
The hash of provided matched files will be used as a part of cache key.

Yaml examples:
```yml
steps:
- uses: actions/checkout@v2
- uses: actions/setup-node@v2
  with:
    node-version: 14
    cache: npm
    cache-dependency-path: 'sub-project/package-lock.json'
```
```yml
steps:
- uses: actions/checkout@v2
- uses: actions/setup-node@v2
  with:
    node-version: 14
    cache: yarn
    cache-dependency-path: 'sub-project/**/yarn.lock'
```
