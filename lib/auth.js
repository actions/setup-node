"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
function setNpmrc(registryUrl, registryToken, authFile) {
    let projectNpmrc = path.resolve(process.cwd(), '.npmrc');
    if (authFile) {
        projectNpmrc = path.resolve(process.cwd(), authFile);
    }
    let newContents = '';
    if (fs.existsSync(projectNpmrc)) {
        const curContents = fs.readFileSync(projectNpmrc, 'utf8');
        curContents.split(os.EOL).forEach(line => {
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
            registryUrl +
            ':_authToken=${NPM_TOKEN}';
    fs.writeFileSync(projectNpmrc, newContents);
    core.exportSecret('NPM_TOKEN', registryToken);
}
exports.setNpmrc = setNpmrc;
