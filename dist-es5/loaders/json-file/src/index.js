import { __assign, __awaiter, __generator, __read, __spreadArray, __values } from "tslib";
import { isValidPath, asArray, parseGraphQLJSON, AggregateError, } from '@graphql-tools/utils';
import { isAbsolute, resolve } from 'path';
import { readFileSync, promises as fsPromises, existsSync } from 'fs';
import { cwd as processCwd, env } from 'process';
import globby from 'globby';
import unixify from 'unixify';
var readFile = fsPromises.readFile, access = fsPromises.access;
var FILE_EXTENSIONS = ['.json'];
function createGlobbyOptions(options) {
    return __assign(__assign({ absolute: true }, options), { ignore: [] });
}
var buildIgnoreGlob = function (path) { return "!" + path; };
/**
 * This loader loads documents and type definitions from JSON files.
 *
 * The JSON file can be the result of an introspection query made against a schema:
 *
 * ```js
 * const schema = await loadSchema('schema-introspection.json', {
 *   loaders: [
 *     new JsonFileLoader()
 *   ]
 * });
 * ```
 *
 * Or it can be a `DocumentNode` object representing a GraphQL document or type definitions:
 *
 * ```js
 * const documents = await loadDocuments('queries/*.json', {
 *   loaders: [
 *     new GraphQLFileLoader()
 *   ]
 * });
 * ```
 */
var JsonFileLoader = /** @class */ (function () {
    function JsonFileLoader() {
    }
    JsonFileLoader.prototype.canLoad = function (pointer, options) {
        return __awaiter(this, void 0, void 0, function () {
            var normalizedFilePath, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!isValidPath(pointer)) return [3 /*break*/, 4];
                        if (!FILE_EXTENSIONS.find(function (extension) { return pointer.endsWith(extension); })) return [3 /*break*/, 4];
                        normalizedFilePath = isAbsolute(pointer) ? pointer : resolve(options.cwd || processCwd(), pointer);
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, access(normalizedFilePath)];
                    case 2:
                        _b.sent();
                        return [2 /*return*/, true];
                    case 3:
                        _a = _b.sent();
                        return [2 /*return*/, false];
                    case 4: return [2 /*return*/, false];
                }
            });
        });
    };
    JsonFileLoader.prototype.canLoadSync = function (pointer, options) {
        if (isValidPath(pointer)) {
            if (FILE_EXTENSIONS.find(function (extension) { return pointer.endsWith(extension); })) {
                var normalizedFilePath = isAbsolute(pointer) ? pointer : resolve(options.cwd || processCwd(), pointer);
                return existsSync(normalizedFilePath);
            }
        }
        return false;
    };
    JsonFileLoader.prototype._buildGlobs = function (glob, options) {
        var ignores = asArray(options.ignore || []);
        var globs = __spreadArray([unixify(glob)], __read(ignores.map(function (v) { return buildIgnoreGlob(unixify(v)); })), false);
        return globs;
    };
    JsonFileLoader.prototype.resolveGlobs = function (glob, options) {
        return __awaiter(this, void 0, void 0, function () {
            var globs, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        globs = this._buildGlobs(glob, options);
                        return [4 /*yield*/, globby(globs, createGlobbyOptions(options))];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result];
                }
            });
        });
    };
    JsonFileLoader.prototype.resolveGlobsSync = function (glob, options) {
        var globs = this._buildGlobs(glob, options);
        var result = globby.sync(globs, createGlobbyOptions(options));
        return result;
    };
    JsonFileLoader.prototype.load = function (pointer, options) {
        return __awaiter(this, void 0, void 0, function () {
            var resolvedPaths, finalResult, errors;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.resolveGlobs(pointer, options)];
                    case 1:
                        resolvedPaths = _a.sent();
                        finalResult = [];
                        errors = [];
                        return [4 /*yield*/, Promise.all(resolvedPaths.map(function (path) { return __awaiter(_this, void 0, void 0, function () {
                                var normalizedFilePath, rawSDL, e_1;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, this.canLoad(path, options)];
                                        case 1:
                                            if (!_a.sent()) return [3 /*break*/, 5];
                                            _a.label = 2;
                                        case 2:
                                            _a.trys.push([2, 4, , 5]);
                                            normalizedFilePath = isAbsolute(path) ? path : resolve(options.cwd || processCwd(), path);
                                            return [4 /*yield*/, readFile(normalizedFilePath, { encoding: 'utf8' })];
                                        case 3:
                                            rawSDL = _a.sent();
                                            finalResult.push(this.handleFileContent(normalizedFilePath, rawSDL, options));
                                            return [3 /*break*/, 5];
                                        case 4:
                                            e_1 = _a.sent();
                                            if (env['DEBUG']) {
                                                console.error(e_1);
                                            }
                                            errors.push(e_1);
                                            return [3 /*break*/, 5];
                                        case 5: return [2 /*return*/];
                                    }
                                });
                            }); }))];
                    case 2:
                        _a.sent();
                        if (finalResult.length === 0 && errors.length > 0) {
                            if (errors.length === 1) {
                                throw errors[0];
                            }
                            throw new AggregateError(errors);
                        }
                        return [2 /*return*/, finalResult];
                }
            });
        });
    };
    JsonFileLoader.prototype.loadSync = function (pointer, options) {
        var e_2, _a;
        var resolvedPaths = this.resolveGlobsSync(pointer, options);
        var finalResult = [];
        var errors = [];
        try {
            for (var resolvedPaths_1 = __values(resolvedPaths), resolvedPaths_1_1 = resolvedPaths_1.next(); !resolvedPaths_1_1.done; resolvedPaths_1_1 = resolvedPaths_1.next()) {
                var path = resolvedPaths_1_1.value;
                if (this.canLoadSync(path, options)) {
                    try {
                        var normalizedFilePath = isAbsolute(path) ? path : resolve(options.cwd || processCwd(), path);
                        var rawSDL = readFileSync(normalizedFilePath, { encoding: 'utf8' });
                        finalResult.push(this.handleFileContent(normalizedFilePath, rawSDL, options));
                    }
                    catch (e) {
                        if (env['DEBUG']) {
                            console.error(e);
                        }
                        errors.push(e);
                    }
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (resolvedPaths_1_1 && !resolvedPaths_1_1.done && (_a = resolvedPaths_1.return)) _a.call(resolvedPaths_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
        if (finalResult.length === 0 && errors.length > 0) {
            if (errors.length === 1) {
                throw errors[0];
            }
            throw new AggregateError(errors);
        }
        return finalResult;
    };
    JsonFileLoader.prototype.handleFileContent = function (normalizedFilePath, rawSDL, options) {
        try {
            return parseGraphQLJSON(normalizedFilePath, rawSDL, options);
        }
        catch (e) {
            throw new Error("Unable to read JSON file: " + normalizedFilePath + ": " + (e.message || /* istanbul ignore next */ e));
        }
    };
    return JsonFileLoader;
}());
export { JsonFileLoader };
