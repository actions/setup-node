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
function configAuthentication(registryUrl, alwaysAuth) {
    const npmrc = path.resolve(process.env['RUNNER_TEMP'] || process.cwd(), '.npmrc');
    if (!registryUrl.endsWith('/')) {
        registryUrl += '/';
    }
    writeRegistryToFile(registryUrl, npmrc, alwaysAuth);
}
exports.configAuthentication = configAuthentication;
function writeRegistryToFile(registryUrl, fileLocation, alwaysAuth) {
    let scope = core.getInput('scope');
    if (!scope && registryUrl.indexOf('npm.pkg.github.com') > -1) {
        scope = github.context.repo.owner;
    }
    if (scope && scope[0] != '@') {
        scope = '@' + scope;
    }
    if (scope) {
        scope = scope.toLowerCase();
    }
    core.debug(`Setting auth in ${fileLocation}`);
    let newContents = '';
    if (fs.existsSync(fileLocation)) {
        const curContents = fs.readFileSync(fileLocation, 'utf8');
        curContents.split(os.EOL).forEach((line) => {
            // Add current contents unless they are setting the registry
            if (!line.toLowerCase().startsWith('registry')) {
                newContents += line + os.EOL;
            }
        });
    }
    // Remove http: or https: from front of registry.
    const authString = registryUrl.replace(/(^\w+:|^)/, '') + ':_authToken=${NODE_AUTH_TOKEN}';
    const registryString = scope
        ? `${scope}:registry=${registryUrl}`
        : `registry=${registryUrl}`;
    const alwaysAuthString = `always-auth=${alwaysAuth}`;
    newContents += `${authString}${os.EOL}${registryString}${os.EOL}${alwaysAuthString}`;
    fs.writeFileSync(fileLocation, newContents);
    core.exportVariable('NPM_CONFIG_USERCONFIG', fileLocation);
    // Export empty node_auth_token so npm doesn't complain about not being able to find it
    core.exportVariable('NODE_AUTH_TOKEN', 'XXXXX-XXXXX-XXXXX-XXXXX');
}
