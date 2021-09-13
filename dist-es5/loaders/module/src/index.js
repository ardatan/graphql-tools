import { __awaiter, __generator } from "tslib";
import { isSchema } from 'graphql';
import { existsSync, promises as fsPromises } from 'fs';
var access = fsPromises.access;
var InvalidError = new Error("Imported object was not a string, DocumentNode or GraphQLSchema");
var createLoadError = function (error) {
    return new Error('Unable to load schema from module: ' + ("" + (error.message || /* istanbul ignore next */ error)));
};
// module:node/module#export
function extractData(pointer) {
    var parts = pointer.replace(/^module\:/i, '').split('#');
    if (!parts || parts.length > 2) {
        throw new Error('Schema pointer should match "module:path/to/module#export"');
    }
    return {
        modulePath: parts[0],
        exportName: parts[1],
    };
}
/**
 * * This loader loads documents and type definitions from a Node module
 *
 * ```js
 * const schema = await loadSchema('module:someModuleName#someNamedExport', {
 *   loaders: [new ModuleLoader()],
 * })
 * ```
 */
var ModuleLoader = /** @class */ (function () {
    function ModuleLoader() {
    }
    ModuleLoader.prototype.isExpressionValid = function (pointer) {
        return typeof pointer === 'string' && pointer.toLowerCase().startsWith('module:');
    };
    ModuleLoader.prototype.canLoad = function (pointer) {
        return __awaiter(this, void 0, void 0, function () {
            var modulePath, moduleAbsolutePath, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.isExpressionValid(pointer)) return [3 /*break*/, 4];
                        modulePath = extractData(pointer).modulePath;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        moduleAbsolutePath = require.resolve(modulePath);
                        return [4 /*yield*/, access(moduleAbsolutePath)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, true];
                    case 3:
                        e_1 = _a.sent();
                        return [2 /*return*/, false];
                    case 4: return [2 /*return*/, false];
                }
            });
        });
    };
    ModuleLoader.prototype.canLoadSync = function (pointer) {
        if (this.isExpressionValid(pointer)) {
            var modulePath = extractData(pointer).modulePath;
            try {
                var moduleAbsolutePath = require.resolve(modulePath);
                return existsSync(moduleAbsolutePath);
            }
            catch (e) {
                return false;
            }
        }
        return false;
    };
    ModuleLoader.prototype.load = function (pointer) {
        return __awaiter(this, void 0, void 0, function () {
            var result, _a, _b, error_1;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        _a = this.parse;
                        _b = [pointer];
                        return [4 /*yield*/, this.importModule(pointer)];
                    case 1:
                        result = _a.apply(this, _b.concat([_c.sent()]));
                        if (result) {
                            return [2 /*return*/, [result]];
                        }
                        throw InvalidError;
                    case 2:
                        error_1 = _c.sent();
                        throw createLoadError(error_1);
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    ModuleLoader.prototype.loadSync = function (pointer) {
        try {
            var result = this.parse(pointer, this.importModuleSync(pointer));
            if (result) {
                return [result];
            }
            throw InvalidError;
        }
        catch (error) {
            throw createLoadError(error);
        }
    };
    ModuleLoader.prototype.parse = function (pointer, importedModule) {
        if (isSchema(importedModule)) {
            return {
                schema: importedModule,
                location: pointer,
            };
        }
        else if (typeof importedModule === 'string') {
            return {
                location: pointer,
                rawSDL: importedModule,
            };
        }
        else if (typeof importedModule === 'object' && importedModule.kind === 'Document') {
            return {
                location: pointer,
                document: importedModule,
            };
        }
    };
    ModuleLoader.prototype.extractFromModule = function (mod, modulePath, identifier) {
        var thing = identifier ? mod[identifier] : mod;
        if (!thing) {
            throw new Error('Unable to import an object from module: ' + modulePath);
        }
        return thing;
    };
    // Sync and Async
    ModuleLoader.prototype.importModule = function (pointer) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, modulePath, exportName, imported;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = extractData(pointer), modulePath = _a.modulePath, exportName = _a.exportName;
                        return [4 /*yield*/, import(modulePath)];
                    case 1:
                        imported = _b.sent();
                        return [2 /*return*/, this.extractFromModule(imported, modulePath, exportName || 'default')];
                }
            });
        });
    };
    ModuleLoader.prototype.importModuleSync = function (pointer) {
        var _a = extractData(pointer), modulePath = _a.modulePath, exportName = _a.exportName;
        var imported = require(modulePath);
        return this.extractFromModule(imported, modulePath, exportName);
    };
    return ModuleLoader;
}());
export { ModuleLoader };
