import { __awaiter, __generator } from "tslib";
import { pickExportFromModule, pickExportFromModuleSync } from './exports';
/**
 * @internal
 */
export function tryToLoadFromExport(rawFilePath) {
    return __awaiter(this, void 0, void 0, function () {
        var filepath, mod, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    filepath = ensureFilepath(rawFilePath);
                    return [4 /*yield*/, import(filepath)];
                case 1:
                    mod = _a.sent();
                    return [4 /*yield*/, pickExportFromModule({ module: mod, filepath: filepath })];
                case 2: return [2 /*return*/, _a.sent()];
                case 3:
                    e_1 = _a.sent();
                    throw new Error("Unable to load from file \"" + rawFilePath + "\": " + e_1.message);
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * @internal
 */
export function tryToLoadFromExportSync(rawFilePath) {
    try {
        var filepath = ensureFilepath(rawFilePath);
        var mod = require(filepath);
        return pickExportFromModuleSync({ module: mod, filepath: filepath });
    }
    catch (e) {
        throw new Error("Unable to load from file \"" + rawFilePath + "\": " + e.message);
    }
}
/**
 * @internal
 */
function ensureFilepath(filepath) {
    if (typeof require !== 'undefined' && require.cache) {
        filepath = require.resolve(filepath);
        if (require.cache[filepath]) {
            delete require.cache[filepath];
        }
    }
    return filepath;
}
