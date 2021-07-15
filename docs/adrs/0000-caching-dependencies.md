# 0. Caching dependencies
Date: 2021-05-21

Status: Accepted

# Context
`actions/setup-node` is the 2nd most popular action in GitHub Actions. A lot of customers use it in conjunction with [actions/cache](https://github.com/actions/cache) to speed up dependencies installation.  
See more examples on proper usage in [actions/cache documentation](https://github.com/actions/cache/blob/main/examples.md#node---npm).

# Goals & Anti-Goals
Integration of caching functionality into `actions/setup-node` action will bring the following benefits for action users:
- Decrease the entry threshold for using the cache for Node.js dependencies and simplify initial configuration
- Simplify YAML pipelines because no need additional steps to enable caching
- More users will use cache for Node.js so more customers will have fast builds!

We will add support for NPM and Yarn dependencies caching.  
As the first stage, we won't support custom locations for `package-lock.json`, `yarn.lock` files and action will work only when files are located in repository root. 

We don't pursue the goal to provide wide customization of caching in scope of `actions/setup-node` action. The purpose of this integration is covering ~90% of basic use-cases. If user needs flexible customization, we should advice them to use `actions/cache` directly.

# Decision
- Add `cache` input parameter to `actions/setup-node`. For now, input will accept the following values: 
  - `npm` - enable caching for npm dependencies
  - `yarn` - enable caching for yarn dependencies
  - `''` - disable caching (default value)
- Cache feature will be disabled by default to make sure that we don't break existing customers. We will consider enabling cache by default in next major release (`v3`)
- Action will try to search `package-lock.json` or `yarn.lock` (npm 7.x supports `yarn.lock` files) files in the repository root and throw error if no one is found
- The hash of found file will be used as cache key (the same approach like [actions/cache](https://github.com/actions/cache/blob/main/examples.md#node---npm) recommends)
- The following key cache will be used `${{ runner.os }}-npm-${{ hashFiles('<package-lock-path>') }}`
- Action will cache global cache:
  - Npm (retrieved via `npm config get cache`)
  - Yarn 1 (retrieved via `yarn cache dir`)
  - Yarn 2 (retrieved via `yarn config get cacheFolder`)

# Example of real use-cases
Npm package manager:
```yml
steps:
- uses: actions/checkout@v2
- uses: actions/setup-node@v2
  with:
    node-version: '14'
    cache: npm
```

Yarn package manager:
```yml
steps:
- uses: actions/checkout@v2
- uses: actions/setup-node@v2
  with:
    node-version: '14'
    cache: yarn
```

# Release process

As soon as functionality is implemented, we will release minor update of action. No need to bump major version since there are no breaking changes for existing users.
After that, we will update [starter-workflows](https://github.com/actions/starter-workflows/blob/main/ci/node.js.yml) and [GitHub Action documentation](https://docs.github.com/en/actions/guides/building-and-testing-nodejs#example-caching-dependencies).
