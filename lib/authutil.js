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
function configAuth(registryUrl) {
    let npmrc = path.resolve(process.cwd(), '.npmrc');
    let yarnrc = path.resolve(process.cwd(), '.yarnrc');
    writeRegistryToFile(registryUrl, npmrc);
    writeRegistryToFile(registryUrl, yarnrc);
}
exports.configAuth = configAuth;
function writeRegistryToFile(registryUrl, fileLocation) {
    core.debug(`Setting auth in ${fileLocation}`);
    let newContents = '';
    if (fs.existsSync(fileLocation)) {
        const curContents = fs.readFileSync(fileLocation, 'utf8');
        curContents.split(os.EOL).forEach((line) => {
            // Add current contents unless they are setting the registry
            if (!line.startsWith('registry')) {
                newContents += line + os.EOL;
            }
        });
    }
    newContents +=
        'registry=' +
            registryUrl +
            os.EOL +
            'always-auth=true' +
            os.EOL +
            registryUrl.replace(/(^\w+:|^)/, '') +
            ':_authToken=${NODE_AUTH_TOKEN}';
    fs.writeFileSync(fileLocation, newContents);
}
