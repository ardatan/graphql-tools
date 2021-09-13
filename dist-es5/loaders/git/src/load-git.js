import { __awaiter, __generator } from "tslib";
import { execFile, execFileSync } from 'child_process';
import os from 'os';
var createLoadError = function (error) { return new Error('Unable to load file from git: ' + error); };
var createShowCommand = function (_a) {
    var ref = _a.ref, path = _a.path;
    return ['show', ref + ":" + path];
};
var createTreeError = function (error) { return new Error('Unable to load the file tree from git: ' + error); };
var createTreeCommand = function (_a) {
    var ref = _a.ref;
    return ['ls-tree', '-r', '--name-only', ref];
};
/**
 * @internal
 */
export function readTreeAtRef(ref) {
    return __awaiter(this, void 0, void 0, function () {
        var error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, new Promise(function (resolve, reject) {
                            execFile('git', createTreeCommand({ ref: ref }), { encoding: 'utf-8', maxBuffer: 1024 * 1024 * 1024 }, function (error, stdout) {
                                if (error) {
                                    reject(error);
                                }
                                else {
                                    resolve(stdout.split(os.EOL).map(function (line) { return line.trim(); }));
                                }
                            });
                        })];
                case 1: return [2 /*return*/, _a.sent()];
                case 2:
                    error_1 = _a.sent();
                    throw createTreeError(error_1);
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * @internal
 */
export function readTreeAtRefSync(ref) {
    try {
        return execFileSync('git', createTreeCommand({ ref: ref }), { encoding: 'utf-8' })
            .split(os.EOL)
            .map(function (line) { return line.trim(); });
    }
    catch (error) {
        throw createTreeError(error);
    }
}
/**
 * @internal
 */
export function loadFromGit(input) {
    return __awaiter(this, void 0, void 0, function () {
        var error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, new Promise(function (resolve, reject) {
                            execFile('git', createShowCommand(input), { encoding: 'utf-8', maxBuffer: 1024 * 1024 * 1024 }, function (error, stdout) {
                                if (error) {
                                    reject(error);
                                }
                                else {
                                    resolve(stdout);
                                }
                            });
                        })];
                case 1: return [2 /*return*/, _a.sent()];
                case 2:
                    error_2 = _a.sent();
                    throw createLoadError(error_2);
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * @internal
 */
export function loadFromGitSync(input) {
    try {
        return execFileSync('git', createShowCommand(input), { encoding: 'utf-8' });
    }
    catch (error) {
        throw createLoadError(error);
    }
}
