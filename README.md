# setup-node

[![build-test](https://github.com/actions/setup-node/actions/workflows/build-test.yml/badge.svg)](https://github.com/actions/setup-node/actions/workflows/build-test.yml)
[![versions](https://github.com/actions/setup-node/actions/workflows/versions.yml/badge.svg)](https://github.com/actions/setup-node/actions/workflows/versions.yml)
[![proxy](https://github.com/actions/setup-node/actions/workflows/proxy.yml/badge.svg)](https://github.com/actions/setup-node/actions/workflows/proxy.yml)

This action provides the following functionality for GitHub Actions users:

- Optionally downloading and caching distribution of the requested Node.js version, and adding it to the PATH
- Optionally caching npm/yarn/pnpm dependencies
- Registering problem matchers for error output
- Configuring authentication for GPR or npm

## Usage

See [action.yml](action.yml)

**Basic:**

```yaml
steps:
- uses: actions/checkout@v3
- uses: actions/setup-node@v3
  with:
    node-version: 16
- run: npm ci
- run: npm test
```

The `node-version` input is optional. If not supplied, the node version from PATH will be used. However, it is recommended to always specify Node.js version and don't rely on the system one.

The action will first check the local cache for a semver match. If unable to find a specific version in the cache, the action will attempt to download a version of Node.js. It will pull LTS versions from [node-versions releases](https://github.com/actions/node-versions/releases) and on miss or failure will fall back to the previous behavior of downloading directly from [node dist](https://nodejs.org/dist/).

For information regarding locally cached versions of Node.js on GitHub hosted runners, check out [GitHub Actions Virtual Environments](https://github.com/actions/virtual-environments).

### Supported version syntax

The `node-version` input supports the Semantic Versioning Specification, for more detailed examples please refer to the [documentation](https://github.com/npm/node-semver).

Examples:

 - Major versions: `14`, `16`, `18`
 - More specific versions: `10.15`, `16.15.1` , `18.4.0`
 - NVM LTS syntax: `lts/erbium`, `lts/fermium`, `lts/*`, `lts/-n`
 - Latest release: `*` or `latest`/`current`/`node`

**Note:** Like the other values, `*` will get the latest [locally-cached Node.js version](https://github.com/actions/virtual-environments/blob/main/images/linux/Ubuntu2004-Readme.md#nodejs), or the latest version from [actions/node-versions](https://github.com/actions/node-versions/blob/main/versions-manifest.json), depending on the [`check-latest`](docs/advanced-usage.md#check-latest-version) input.

`current`/`latest`/`node` always resolve to the latest [dist version](https://nodejs.org/dist/index.json).
That version is then downloaded from actions/node-versions if possible, or directly from Node.js if not.
Since it will not be cached always, there is possibility of hitting rate limit when downloading from dist

### Checking in lockfiles

It's **always** recommended to commit the lockfile of your package manager for security and performance reasons. For more information consult the "Working with lockfiles" section of the [Advanced usage](docs/advanced-usage.md#working-with-lockfiles) guide.

## Caching global packages data

The action has a built-in functionality for caching and restoring dependencies. It uses [actions/cache](https://github.com/actions/cache) under the hood for caching global packages data but requires less configuration settings. Supported package managers are `npm`, `yarn`, `pnpm` (v6.10+). The `cache` input is optional, and caching is turned off by default.

The action defaults to search for the dependency file (`package-lock.json`, `npm-shrinkwrap.json` or `yarn.lock`) in the repository root, and uses its hash as a part of the cache key. Use `cache-dependency-path` for cases when multiple dependency files are used, or they are located in different subdirectories.

**Note:** The action does not cache `node_modules`

See the examples of using cache for `yarn`/`pnpm` and `cache-dependency-path` input in the [Advanced usage](docs/advanced-usage.md#caching-packages-data) guide.

**Caching npm dependencies:**

```yaml
steps:
- uses: actions/checkout@v3
- uses: actions/setup-node@v3
  with:
    node-version: 16
    cache: 'npm'
- run: npm ci
- run: npm test
```

**Caching npm dependencies in monorepos:**

```yaml
steps:
- uses: actions/checkout@v3
- uses: actions/setup-node@v3
  with:
    node-version: 16
    cache: 'npm'
    cache-dependency-path: subdir/package-lock.json
- run: npm ci
- run: npm test
```

## Matrix Testing

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [ 14, 16, 18 ]
    name: Node ${{ matrix.node }} sample
    steps:
      - uses: actions/checkout@v3
      - name: Setup node
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node }}
      - run: npm ci
      - run: npm test
```

## Advanced usage

1. [Check latest version](docs/advanced-usage.md#check-latest-version)
2. [Using a node version file](docs/advanced-usage.md#node-version-file)
3. [Using different architectures](docs/advanced-usage.md#architecture)
4. [Caching packages data](docs/advanced-usage.md#caching-packages-data)
5. [Using multiple operating systems and architectures](docs/advanced-usage.md#multiple-operating-systems-and-architectures)
6. [Publishing to npmjs and GPR with npm](docs/advanced-usage.md#publish-to-npmjs-and-gpr-with-npm)
7. [Publishing to npmjs and GPR with yarn](docs/advanced-usage.md#publish-to-npmjs-and-gpr-with-yarn)
8. [Using private packages](docs/advanced-usage.md#use-private-packages)

## License

The scripts and documentation in this project are released under the [MIT License](LICENSE)

## Contributions

Contributions are welcome! See [Contributor's Guide](docs/contributors.md)

## Code of Conduct

:wave: Be nice. See [our code of conduct](CODE_OF_CONDUCT.md)
