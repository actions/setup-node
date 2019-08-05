"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const exec = __importStar(require("@actions/exec"));
function configAuth(registryUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        let npmrc = path.resolve(process.cwd(), '.npmrc');
        let yarnrc = path.resolve(process.cwd(), '.yarnrc');
        writeRegistryToFile(registryUrl, 'npm', 'NPM_TOKEN');
        writeRegistryToFile(registryUrl, 'yarn', 'YARN_TOKEN');
    });
}
exports.configAuth = configAuth;
function writeRegistryToFile(registryUrl, packageManager, authTokenName) {
    return __awaiter(this, void 0, void 0, function* () {
        yield exec.exec(`${packageManager} config set registry=${registryUrl}`);
        yield exec.exec(`${packageManager} config set always-auth=true`);
        yield exec.exec(packageManager +
            ' config set ' +
            registryUrl.replace(/(^\w+:|^)/, '') +
            ':_authToken ${' +
            authTokenName +
            '}');
    });
}
