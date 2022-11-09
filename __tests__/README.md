Files located in data directory are used only for testing purposes. 


## Here the list of files in the data directory
 - `.nvmrc`, `.tools-versions` and `package.json` are used to test node-version-file logic
 - `package-lock.json`, `pnpm-lock.yaml` and `yarn.lock` are used to test cache logic 
 - `versions-manifest.json` is used for unit testing to check downloading Node.js versions from the node-versions repository.
 - `node-dist-index.json` is used for unit testing to check downloading Node.js versions from the official site. The file was constructed from https://nodejs.org/dist/index.json
 - `node-rc-index.json` is used for unit testing to check downloading Node.js rc versions from the official site. The file was constructed from https://nodejs.org/download/rc/index.json
 - `node-nightly-index.json` is used for unit testing to check downloading Node.js nightly builds from the official site. The file was constructed from https://nodejs.org/download/nightly/index.json