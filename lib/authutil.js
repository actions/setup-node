"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
function configAuthentication(registryUrl) {
    const npmrc = path.resolve(process.env['RUNNER_TEMP'] || process.cwd(), '.npmrc');
    if (!registryUrl.endsWith('/')) {
        registryUrl += '/';
    }
    writeRegistryToFile(registryUrl, npmrc);
}
exports.configAuthentication = configAuthentication;
function writeRegistryToFile(registryUrl, fileLocation) {
    let scope = core.getInput('scope');
    if (!scope && registryUrl.indexOf('npm.pkg.github.com') > -1) {
        scope = github.context.repo.owner;
    }
    if (scope && scope[0] != '@') {
        scope = '@' + scope;
    }
    core.debug(`Setting auth in ${fileLocation}`);
    let newContents = '';
    
    // Remove http: or https: from front of registry.
    const authString = registryUrl.replace(/(^\w+:|^)/, '') + ':_authToken=${NODE_AUTH_TOKEN}';
    const registryString = scope
        ? `${scope}:registry=${registryUrl}`
        : `registry=${registryUrl}`;
    newContents += `${authString}${os.EOL}${registryString}`;
    fs.writeFileSync(fileLocation, newContents);
    core.exportVariable('NPM_CONFIG_USERCONFIG', fileLocation);
    // Export empty node_auth_token so npm doesn't complain about not being able to find it
    core.exportVariable('NODE_AUTH_TOKEN', 'XXXXX-XXXXX-XXXXX-XXXXX');
}
