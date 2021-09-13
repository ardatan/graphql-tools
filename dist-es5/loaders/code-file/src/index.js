import { __assign, __awaiter, __generator, __read, __spreadArray, __values } from "tslib";
import { isSchema, parse } from 'graphql';
import { asArray, isValidPath, parseGraphQLSDL, isDocumentNode, AggregateError, } from '@graphql-tools/utils';
import { gqlPluckFromCodeString, gqlPluckFromCodeStringSync, } from '@graphql-tools/graphql-tag-pluck';
import globby from 'globby';
import unixify from 'unixify';
import { tryToLoadFromExport, tryToLoadFromExportSync } from './load-from-module';
import { isAbsolute, resolve } from 'path';
import { cwd, env } from 'process';
import { readFileSync, promises as fsPromises, existsSync } from 'fs';
import { createRequire } from 'module';
var readFile = fsPromises.readFile, access = fsPromises.access;
var FILE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.vue'];
function createGlobbyOptions(options) {
    return __assign(__assign({ absolute: true }, options), { ignore: [] });
}
var buildIgnoreGlob = function (path) { return "!" + path; };
/**
 * This loader loads GraphQL documents and type definitions from code files
 * using `graphql-tag-pluck`.
 *
 * ```js
 * const documents = await loadDocuments('queries/*.js', {
 *   loaders: [
 *     new CodeFileLoader()
 *   ]
 * });
 * ```
 *
 * Supported extensions include: `.ts`, `.tsx`, `.js`, `.jsx`, `.vue`
 */
var CodeFileLoader = /** @class */ (function () {
    function CodeFileLoader(config) {
        this.config = config !== null && config !== void 0 ? config : {};
    }
    CodeFileLoader.prototype.getMergedOptions = function (options) {
        return __assign(__assign({}, this.config), options);
    };
    CodeFileLoader.prototype.canLoad = function (pointer, options) {
        return __awaiter(this, void 0, void 0, function () {
            var normalizedFilePath, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        options = this.getMergedOptions(options);
                        if (!isValidPath(pointer)) return [3 /*break*/, 4];
                        if (!FILE_EXTENSIONS.find(function (extension) { return pointer.endsWith(extension); })) return [3 /*break*/, 4];
                        normalizedFilePath = isAbsolute(pointer) ? pointer : resolve(options.cwd || cwd(), pointer);
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
    CodeFileLoader.prototype.canLoadSync = function (pointer, options) {
        options = this.getMergedOptions(options);
        if (isValidPath(pointer)) {
            if (FILE_EXTENSIONS.find(function (extension) { return pointer.endsWith(extension); })) {
                var normalizedFilePath = isAbsolute(pointer) ? pointer : resolve(options.cwd || cwd(), pointer);
                return existsSync(normalizedFilePath);
            }
        }
        return false;
    };
    CodeFileLoader.prototype._buildGlobs = function (glob, options) {
        var ignores = asArray(options.ignore || []);
        var globs = __spreadArray([unixify(glob)], __read(ignores.map(function (v) { return buildIgnoreGlob(unixify(v)); })), false);
        return globs;
    };
    CodeFileLoader.prototype.resolveGlobs = function (glob, options) {
        return __awaiter(this, void 0, void 0, function () {
            var globs;
            return __generator(this, function (_a) {
                options = this.getMergedOptions(options);
                globs = this._buildGlobs(glob, options);
                return [2 /*return*/, globby(globs, createGlobbyOptions(options))];
            });
        });
    };
    CodeFileLoader.prototype.resolveGlobsSync = function (glob, options) {
        options = this.getMergedOptions(options);
        var globs = this._buildGlobs(glob, options);
        return globby.sync(globs, createGlobbyOptions(options));
    };
    CodeFileLoader.prototype.load = function (pointer, options) {
        return __awaiter(this, void 0, void 0, function () {
            var resolvedPaths, finalResult, errors;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        options = this.getMergedOptions(options);
                        return [4 /*yield*/, this.resolveGlobs(pointer, options)];
                    case 1:
                        resolvedPaths = _a.sent();
                        finalResult = [];
                        errors = [];
                        return [4 /*yield*/, Promise.all(resolvedPaths.map(function (path) { return __awaiter(_this, void 0, void 0, function () {
                                var result, e_1;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            _a.trys.push([0, 2, , 3]);
                                            return [4 /*yield*/, this.handleSinglePath(path, options)];
                                        case 1:
                                            result = _a.sent();
                                            result === null || result === void 0 ? void 0 : result.forEach(function (result) { return finalResult.push(result); });
                                            return [3 /*break*/, 3];
                                        case 2:
                                            e_1 = _a.sent();
                                            if (env['DEBUG']) {
                                                console.error(e_1);
                                            }
                                            errors.push(e_1);
                                            return [3 /*break*/, 3];
                                        case 3: return [2 /*return*/];
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
    CodeFileLoader.prototype.loadSync = function (pointer, options) {
        var e_2, _a;
        options = this.getMergedOptions(options);
        var resolvedPaths = this.resolveGlobsSync(pointer, options);
        var finalResult = [];
        var errors = [];
        try {
            for (var resolvedPaths_1 = __values(resolvedPaths), resolvedPaths_1_1 = resolvedPaths_1.next(); !resolvedPaths_1_1.done; resolvedPaths_1_1 = resolvedPaths_1.next()) {
                var path = resolvedPaths_1_1.value;
                if (this.canLoadSync(path, options)) {
                    try {
                        var result = this.handleSinglePathSync(path, options);
                        result === null || result === void 0 ? void 0 : result.forEach(function (result) { return finalResult.push(result); });
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
    CodeFileLoader.prototype.handleSinglePath = function (location, options) {
        return __awaiter(this, void 0, void 0, function () {
            var normalizedFilePath, errors, content, sources, e_3, loaded, sources, e_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.canLoad(location, options)];
                    case 1:
                        if (!(_a.sent())) {
                            return [2 /*return*/, []];
                        }
                        options = this.getMergedOptions(options);
                        normalizedFilePath = ensureAbsolutePath(location, options);
                        errors = [];
                        if (!!options.noPluck) return [3 /*break*/, 6];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 5, , 6]);
                        return [4 /*yield*/, readFile(normalizedFilePath, { encoding: 'utf-8' })];
                    case 3:
                        content = _a.sent();
                        return [4 /*yield*/, gqlPluckFromCodeString(normalizedFilePath, content, options.pluckConfig)];
                    case 4:
                        sources = _a.sent();
                        if (sources.length) {
                            return [2 /*return*/, sources.map(function (source) { return ({
                                    rawSDL: source.body,
                                    document: parse(source),
                                    location: location,
                                }); })];
                        }
                        return [3 /*break*/, 6];
                    case 5:
                        e_3 = _a.sent();
                        if (env['DEBUG']) {
                            console.error("Failed to load schema from code file \"" + normalizedFilePath + "\": " + e_3.message);
                        }
                        errors.push(e_3);
                        return [3 /*break*/, 6];
                    case 6:
                        if (!!options.noRequire) return [3 /*break*/, 12];
                        _a.label = 7;
                    case 7:
                        _a.trys.push([7, 11, , 12]);
                        if (!(options && options.require)) return [3 /*break*/, 9];
                        return [4 /*yield*/, Promise.all(asArray(options.require).map(function (m) { return import(m); }))];
                    case 8:
                        _a.sent();
                        _a.label = 9;
                    case 9: return [4 /*yield*/, tryToLoadFromExport(normalizedFilePath)];
                    case 10:
                        loaded = _a.sent();
                        sources = asArray(loaded)
                            .map(function (value) { return resolveSource(location, value, options); })
                            .filter(Boolean);
                        if (sources.length) {
                            return [2 /*return*/, sources];
                        }
                        return [3 /*break*/, 12];
                    case 11:
                        e_4 = _a.sent();
                        errors.push(e_4);
                        return [3 /*break*/, 12];
                    case 12:
                        if (errors.length > 0) {
                            throw errors[0];
                        }
                        return [2 /*return*/, []];
                }
            });
        });
    };
    CodeFileLoader.prototype.handleSinglePathSync = function (location, options) {
        var e_5, _a;
        if (!this.canLoadSync(location, options)) {
            return [];
        }
        options = this.getMergedOptions(options);
        var normalizedFilePath = ensureAbsolutePath(location, options);
        var errors = [];
        if (!options.noPluck) {
            try {
                var content = readFileSync(normalizedFilePath, { encoding: 'utf-8' });
                var sources = gqlPluckFromCodeStringSync(normalizedFilePath, content, options.pluckConfig);
                if (sources.length) {
                    return sources.map(function (source) { return ({
                        rawSDL: source.body,
                        document: parse(source),
                        location: location,
                    }); });
                }
            }
            catch (e) {
                if (env['DEBUG']) {
                    console.error("Failed to load schema from code file \"" + normalizedFilePath + "\": " + e.message);
                }
                errors.push(e);
            }
        }
        if (!options.noRequire) {
            try {
                if (options && options.require) {
                    var cwdRequire = createRequire(options.cwd || cwd());
                    try {
                        for (var _b = __values(asArray(options.require)), _c = _b.next(); !_c.done; _c = _b.next()) {
                            var m = _c.value;
                            cwdRequire(m);
                        }
                    }
                    catch (e_5_1) { e_5 = { error: e_5_1 }; }
                    finally {
                        try {
                            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                        }
                        finally { if (e_5) throw e_5.error; }
                    }
                }
                var loaded = tryToLoadFromExportSync(normalizedFilePath);
                var sources = asArray(loaded)
                    .map(function (value) { return resolveSource(location, value, options); })
                    .filter(Boolean);
                if (sources.length) {
                    return sources;
                }
            }
            catch (e) {
                errors.push(e);
            }
        }
        if (errors.length > 0) {
            throw errors[0];
        }
        return null;
    };
    return CodeFileLoader;
}());
export { CodeFileLoader };
function resolveSource(pointer, value, options) {
    if (typeof value === 'string') {
        return parseGraphQLSDL(pointer, value, options);
    }
    else if (isSchema(value)) {
        return {
            location: pointer,
            schema: value,
        };
    }
    else if (isDocumentNode(value)) {
        return {
            location: pointer,
            document: value,
        };
    }
    return null;
}
function ensureAbsolutePath(pointer, options) {
    return isAbsolute(pointer) ? pointer : resolve(options.cwd || cwd(), pointer);
}
