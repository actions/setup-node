# setup-node

[![basic-validation](https://github.com/actions/setup-node/actions/workflows/basic-validation.yml/badge.svg)](https://github.com/actions/setup-node/actions/workflows/basic-validation.yml)
[![versions](https://github.com/actions/setup-node/actions/workflows/versions.yml/badge.svg)](https://github.com/actions/setup-node/actions/workflows/versions.yml)
[![e2e-cache](https://github.com/actions/setup-node/actions/workflows/e2e-cache.yml/badge.svg?branch=main)](https://github.com/actions/setup-node/actions/workflows/e2e-cache.yml)
[![proxy](https://github.com/actions/setup-node/actions/workflows/proxy.yml/badge.svg)](https://github.com/actions/setup-node/actions/workflows/proxy.yml)

This action provides the following functionality for GitHub Actions users:

- Optionally downloading and caching distribution of the requested Node.js version, and adding it to the PATH
- Optionally caching npm/yarn/pnpm dependencies
- Registering problem matchers for error output
- Configuring authentication for GPR or npm

## Usage

See [action.yml](action.yml)

<!-- start usage -->
```yaml
- uses: actions/setup-node@v4
  with:
    # Version Spec of the version to use in SemVer notation.
    # It also emits such aliases as lts, latest, nightly and canary builds
    # Examples: 12.x, 10.15.1, >=10.15.0, lts/Hydrogen, 16-nightly, latest, node
    node-version: ''

    # File containing the version Spec of the version to use.  Examples: package.json, .nvmrc, .node-version, .tool-versions.
    # If node-version and node-version-file are both provided the action will use version from node-version. 
    node-version-file: ''

    # Set this option if you want the action to check for the latest available version 
    # that satisfies the version spec.
    # It will only get affect for lts Nodejs versions (12.x, >=10.15.0, lts/Hydrogen). 
    # Default: false
    check-latest: false

    # Target architecture for Node to use. Examples: x86, x64. Will use system architecture by default.
    # Default: ''. The action use system architecture by default 
    architecture: ''

    # Used to pull node distributions from https://github.com/actions/node-versions. 
    # Since there's a default, this is typically not supplied by the user. 
    # When running this action on github.com, the default value is sufficient. 
    # When running on GHES, you can pass a personal access token for github.com if you are experiencing rate limiting.
    #
    # We recommend using a service account with the least permissions necessary. Also
    # when generating a new PAT, select the least scopes necessary.
    #
    # [Learn more about creating and using encrypted secrets](https://help.github.com/en/actions/automating-your-workflow-with-github-actions/creating-and-using-encrypted-secrets)
    #
    # Default: ${{ github.server_url == 'https://github.com' && github.token || '' }}
    token: ''

    # Used to specify a package manager for caching in the default directory. Supported values: npm, yarn, pnpm.
    # Package manager should be pre-installed
    # Default: ''
    cache: ''

    # Used to specify the path to a dependency file: package-lock.json, yarn.lock, etc. 
    # It will generate hash from the target file for primary key. It works only If cache is specified.  
    # Supports wildcards or a list of file names for caching multiple dependencies.
    # Default: ''
    cache-dependency-path: ''

    # Optional registry to set up for auth. Will set the registry in a project level .npmrc and .yarnrc file, 
    # and set up auth to read in from env.NODE_AUTH_TOKEN.
    # Default: ''
    registry-url: ''

    # Optional scope for authenticating against scoped registries. 
    # Will fall back to the repository owner when using the GitHub Packages registry (https://npm.pkg.github.com/).
    # Default: ''
    scope: ''

    # Set always-auth option in npmrc file.
    # Default: ''
    always-auth: ''
```
<!-- end usage -->

**Basic:**

```yaml
steps:
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
  with:
    node-version: 18
- run: npm ci
- run: npm test
```

The `node-version` input is optional. If not supplied, the node version from PATH will be used. However, it is recommended to always specify Node.js version and don't rely on the system one.

The action will first check the local cache for a semver match. If unable to find a specific version in the cache, the action will attempt to download a version of Node.js. It will pull LTS versions from [node-versions releases](https://github.com/actions/node-versions/releases) and on miss or failure will fall back to the previous behavior of downloading directly from [node dist](https://nodejs.org/dist/).

For information regarding locally cached versions of Node.js on GitHub hosted runners, check out [GitHub Actions Runner Images](https://github.com/actions/runner-images).

### Supported version syntax

The `node-version` input supports the Semantic Versioning Specification, for more detailed examples please refer to [the semver package documentation](https://github.com/npm/node-semver).

Examples:

 - Major versions: `16`, `18`, `20`
 - More specific versions: `10.15`, `16.15.1` , `18.4.0`
 - NVM LTS syntax: `lts/erbium`, `lts/fermium`, `lts/*`, `lts/-n`
 - Latest release: `*` or `latest`/`current`/`node`

**Note:** Like the other values, `*` will get the latest [locally-cached Node.js version](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2204-Readme.md#nodejs), or the latest version from [actions/node-versions](https://github.com/actions/node-versions/blob/main/versions-manifest.json), depending on the [`check-latest`](docs/advanced-usage.md#check-latest-version) input.

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
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
  with:
    node-version: 16
    cache: 'npm'
- run: npm ci
- run: npm test
```

**Caching npm dependencies in monorepos:**

```yaml
steps:
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
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
      - uses: actions/checkout@v4
      - name: Setup node
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
      - run: npm ci
      - run: npm test
```

## Using `setup-node` on GHES

`setup-node` comes pre-installed on the appliance with GHES if Actions is enabled. When dynamically downloading Nodejs distributions, `setup-node` downloads distributions from [`actions/node-versions`](https://github.com/actions/node-versions) on github.com (outside of the appliance). These calls to `actions/node-versions` are made via unauthenticated requests, which are limited to [60 requests per hour per IP](https://docs.github.com/en/rest/overview/resources-in-the-rest-api#rate-limiting). If more requests are made within the time frame, then you will start to see rate-limit errors during downloading that looks like: `##[error]API rate limit exceeded for...`. After that error the action will try to download versions directly from the official site, but it also can have rate limit so it's better to put token.

To get a higher rate limit, you can [generate a personal access token on github.com](https://github.com/settings/tokens/new) and pass it as the `token` input for the action:

```yaml
uses: actions/setup-node@v4
with:
  token: ${{ secrets.GH_DOTCOM_TOKEN }}
  node-version: 16
```

If the runner is not able to access github.com, any Nodejs versions requested during a workflow run must come from the runner's tool cache. See "[Setting up the tool cache on self-hosted runners without internet access](https://docs.github.com/en/enterprise-server@3.2/admin/github-actions/managing-access-to-actions-from-githubcom/setting-up-the-tool-cache-on-self-hosted-runners-without-internet-access)" for more information.

## Advanced usage

 - [Check latest version](docs/advanced-usage.md#check-latest-version)
 - [Using a node version file](docs/advanced-usage.md#node-version-file)
 - [Using different architectures](docs/advanced-usage.md#architecture)
 - [Using v8 canary versions](docs/advanced-usage.md#v8-canary-versions)
 - [Using nightly versions](docs/advanced-usage.md#nightly-versions)
 - [Using rc versions](docs/advanced-usage.md#rc-versions)
 - [Caching packages data](docs/advanced-usage.md#caching-packages-data)
 - [Using multiple operating systems and architectures](docs/advanced-usage.md#multiple-operating-systems-and-architectures)
 - [Publishing to npmjs and GPR with npm](docs/advanced-usage.md#publish-to-npmjs-and-gpr-with-npm)
 - [Publishing to npmjs and GPR with yarn](docs/advanced-usage.md#publish-to-npmjs-and-gpr-with-yarn)
 - [Using private packages](docs/advanced-usage.md#use-private-packages)

## License

The scripts and documentation in this project are released under the [MIT License](LICENSE)

## Contributions

Contributions are welcome! See [Contributor's Guide](docs/contributors.md)

## Code of Conduct

:wave: Be nice. See [our code of conduct](CODE_OF_CONDUCT.md)
