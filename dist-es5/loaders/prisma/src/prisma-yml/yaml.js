import { __assign, __awaiter, __generator } from "tslib";
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import { Variables } from './Variables';
import { Output } from './Output';
var cache = {};
export function readDefinition(filePath, args, out, envVars, _graceful) {
    if (out === void 0) { out = new Output(); }
    return __awaiter(this, void 0, void 0, function () {
        var file, json, jsonCopy, vars, populatedJson;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    try {
                        fs.accessSync(filePath);
                    }
                    catch (_b) {
                        throw new Error(filePath + " could not be found.");
                    }
                    file = fs.readFileSync(filePath, 'utf-8');
                    json = yaml.load(file);
                    jsonCopy = __assign({}, json);
                    vars = new Variables(filePath, args, out, envVars);
                    return [4 /*yield*/, vars.populateJson(json)];
                case 1:
                    populatedJson = _a.sent();
                    if (populatedJson.custom) {
                        delete populatedJson.custom;
                    }
                    cache[file] = populatedJson;
                    return [2 /*return*/, {
                            definition: populatedJson,
                            rawJson: jsonCopy,
                        }];
            }
        });
    });
}
