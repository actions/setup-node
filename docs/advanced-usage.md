## Working with lockfiles

All supported package managers recommend that you **always** commit the lockfile, although implementations vary doing so generally provides the following benefits:

- Enables faster installation for CI and production environments, due to being able to skip package resolution.
- Describes a single representation of a dependency tree such that teammates, deployments, and continuous integration are guaranteed to install exactly the same dependencies.
- Provides a facility for users to "time-travel" to previous states of `node_modules` without having to commit the directory itself.
- Facilitates greater visibility of tree changes through readable source control diffs.

In order to get the most out of using your lockfile on continuous integration follow the conventions outlined below for your respective package manager.

### NPM

Ensure that `package-lock.json` is always committed, use `npm ci` instead of `npm install` when installing packages.

**See also:**
- [Documentation of `package-lock.json`](https://docs.npmjs.com/cli/v8/configuring-npm/package-lock-json)
- [Documentation of `npm ci`](https://docs.npmjs.com/cli/v8/commands/npm-ci)

### Yarn

To ensure that `yarn.lock` is always committed, use `yarn install --immutable` when installing packages.

**See also:**
- [Documentation of `yarn.lock`](https://classic.yarnpkg.com/en/docs/yarn-lock)
- [Documentation of `--frozen-lockfile` option](https://classic.yarnpkg.com/en/docs/cli/install#toc-yarn-install-frozen-lockfile)
- [QA - Should lockfiles be committed to the repoistory?](https://yarnpkg.com/getting-started/qa/#should-lockfiles-be-committed-to-the-repository)
- [Documentation of `yarn install`](https://yarnpkg.com/cli/install)

### PNPM

Ensure that `pnpm-lock.yaml` is always committed, when on CI pass `--frozen-lockfile` to `pnpm install` when installing packages.

**See also:**
- [Working with Git - Lockfiles](https://pnpm.io/git#lockfiles)
- [Documentation of `--frozen-lockfile` option](https://pnpm.io/cli/install#--frozen-lockfile)

## Check latest version

The `check-latest` flag defaults to `false`. When set to `false`, the action will first check the local cache for a semver match. If unable to find a specific version in the cache, the action will attempt to download a version of Node.js. It will pull LTS versions from [node-versions releases](https://github.com/actions/node-versions/releases) and on miss or failure will fall back to the previous behavior of downloading directly from [node dist](https://nodejs.org/dist/). Use the default or set `check-latest` to `false` if you prefer stability and if you want to ensure a specific version of Node.js is always used.

If `check-latest` is set to `true`, the action first checks if the cached version is the latest one. If the locally cached version is not the most up-to-date, a version of Node.js will then be downloaded. Set `check-latest` to `true` it you want the most up-to-date version of Node.js to always be used.

> Setting `check-latest` to `true` has performance implications as downloading versions of Node is slower than using cached versions.

```yaml
steps:
- uses: actions/checkout@v3
- uses: actions/setup-node@v3
  with:
    node-version: '14'
    check-latest: true
- run: npm ci
- run: npm test
```

## Node version file

The `node-version-file` input accepts a path to a file containing the version of Node.js to be used by a project, for example `.nvmrc`, `.node-version` or `.tool-versions`. If both the `node-version` and the `node-version-file` inputs are provided then the `node-version` input is used.
See [supported version syntax](https://github.com/actions/setup-node#supported-version-syntax)
> The action will search for the node version file relative to the repository root.

```yaml
steps:
- uses: actions/checkout@v3
- uses: actions/setup-node@v3
  with:
    node-version-file: '.nvmrc'
- run: npm ci
- run: npm test
```

## Architecture

You can use any of the [supported operating systems](https://docs.github.com/en/actions/reference/virtual-environments-for-github-hosted-runners), and the compatible `architecture` can be selected using `architecture`. Values are `x86`, `x64`, `arm64`, `armv6l`, `armv7l`, `ppc64le`, `s390x` (not all of the architectures are available on all platforms).

When using `architecture`, `node-version` must be provided as well.
```yaml
jobs:
  build:
    runs-on: windows-latest
    name: Node sample
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '14'
          architecture: 'x64' # optional, x64 or x86. If not specified, x64 will be used by default
      - run: npm ci
      - run: npm test
```

## Caching packages data
The action follows [actions/cache](https://github.com/actions/cache/blob/main/examples.md#node---npm) guidelines, and caches global cache on the machine instead of `node_modules`, so cache can be reused between different Node.js versions.

**Caching yarn dependencies:**
Yarn caching handles both yarn versions: 1 or 2.
```yaml
steps:
- uses: actions/checkout@v3
- uses: actions/setup-node@v3
  with:
    node-version: '14'
    cache: 'yarn'
- run: yarn install --frozen-lockfile # optional, --immutable
- run: yarn test
```

**Caching pnpm (v6.10+) dependencies:**
```yaml
# This workflow uses actions that are not certified by GitHub.
# They are provided by a third-party and are governed by
# separate terms of service, privacy policy, and support
# documentation.

# NOTE: pnpm caching support requires pnpm version >= 6.10.0

steps:
- uses: actions/checkout@v3
- uses: pnpm/action-setup@v2
  with:
    version: 6.32.9
- uses: actions/setup-node@v3
  with:
    node-version: '14'
    cache: 'pnpm'
- run: pnpm install --frozen-lockfile
- run: pnpm test
```

**Using wildcard patterns to cache dependencies**
```yaml
steps:
- uses: actions/checkout@v3
- uses: actions/setup-node@v3
  with:
    node-version: '14'
    cache: 'npm'
    cache-dependency-path: '**/package-lock.json'
- run: npm ci
- run: npm test
```

**Using a list of file paths to cache dependencies**
```yaml
steps:
- uses: actions/checkout@v3
- uses: actions/setup-node@v3
  with:
    node-version: '14'
    cache: 'npm'
    cache-dependency-path: |
      server/app/package-lock.json
      frontend/app/package-lock.json
- run: npm ci
- run: npm test
```

## Multiple Operating Systems and Architectures

```yaml
jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os:
          - ubuntu-latest
          - macos-latest
          - windows-latest
        node_version:
          - 12
          - 14
          - 16
        architecture:
          - x64
        # an extra windows-x86 run:
        include:
          - os: windows-2016
            node_version: 12
            architecture: x86
    name: Node ${{ matrix.node_version }} - ${{ matrix.architecture }} on ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v3
      - name: Setup node
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node_version }}
          architecture: ${{ matrix.architecture }}
      - run: npm ci
      - run: npm test
```

## Publish to npmjs and GPR with npm
```yaml
steps:
- uses: actions/checkout@v3
- uses: actions/setup-node@v3
  with:
    node-version: '14.x'
    registry-url: 'https://registry.npmjs.org'
- run: npm ci
- run: npm publish
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
- uses: actions/setup-node@v3
  with:
    registry-url: 'https://npm.pkg.github.com'
- run: npm publish
  env:
    NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Publish to npmjs and GPR with yarn
```yaml
steps:
- uses: actions/checkout@v3
- uses: actions/setup-node@v3
  with:
    node-version: '14.x'
    registry-url: <registry url>
- run: yarn install --frozen-lockfile
- run: yarn publish
  env:
    NODE_AUTH_TOKEN: ${{ secrets.YARN_TOKEN }}
- uses: actions/setup-node@v3
  with:
    registry-url: 'https://npm.pkg.github.com'
- run: yarn publish
  env:
    NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Use private packages
```yaml
steps:
- uses: actions/checkout@v3
- uses: actions/setup-node@v3
  with:
    node-version: '14.x'
    registry-url: 'https://registry.npmjs.org'
# Skip post-install scripts here, as a malicious
# script could steal NODE_AUTH_TOKEN.
- run: npm ci --ignore-scripts
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
# `npm rebuild` will run all those post-install scripts for us.
- run: npm rebuild && npm run prepare --if-present
```

NOTE: As per https://github.com/actions/setup-node/issues/49 you cannot use `secrets.GITHUB_TOKEN` to access private GitHub Packages within the same organisation but in a different repository.
