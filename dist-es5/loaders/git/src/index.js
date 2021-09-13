import { __awaiter, __generator, __read, __spreadArray, __values } from "tslib";
import { gqlPluckFromCodeString, gqlPluckFromCodeStringSync, } from '@graphql-tools/graphql-tag-pluck';
import micromatch from 'micromatch';
import unixify from 'unixify';
import { loadFromGit, loadFromGitSync, readTreeAtRef, readTreeAtRefSync } from './load-git';
import { parse as handleStuff } from './parse';
import { parse } from 'graphql';
import { asArray, AggregateError } from '@graphql-tools/utils';
import isGlob from 'is-glob';
import { env } from 'process';
// git:branch:path/to/file
function extractData(pointer) {
    var parts = pointer.replace(/^git\:/i, '').split(':');
    if (!parts || parts.length !== 2) {
        return null;
    }
    return {
        ref: parts[0],
        path: parts[1],
    };
}
/**
 * This loader loads a file from git.
 *
 * ```js
 * const typeDefs = await loadTypedefs('git:someBranch:some/path/to/file.js', {
 *   loaders: [new GitLoader()],
 * })
 * ```
 */
var GitLoader = /** @class */ (function () {
    function GitLoader() {
    }
    GitLoader.prototype.canLoad = function (pointer) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.canLoadSync(pointer)];
            });
        });
    };
    GitLoader.prototype.canLoadSync = function (pointer) {
        return typeof pointer === 'string' && pointer.toLowerCase().startsWith('git:');
    };
    GitLoader.prototype.resolveGlobs = function (glob, ignores) {
        return __awaiter(this, void 0, void 0, function () {
            var data, refsForPaths, ref, path, ignores_1, ignores_1_1, ignore, data_1, ref_1, path_1, resolved;
            var e_1, _a;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        data = extractData(glob);
                        if (data === null) {
                            return [2 /*return*/, []];
                        }
                        refsForPaths = new Map();
                        ref = data.ref, path = data.path;
                        if (!refsForPaths.has(ref)) {
                            refsForPaths.set(ref, []);
                        }
                        refsForPaths.get(ref).push(unixify(path));
                        try {
                            for (ignores_1 = __values(ignores), ignores_1_1 = ignores_1.next(); !ignores_1_1.done; ignores_1_1 = ignores_1.next()) {
                                ignore = ignores_1_1.value;
                                data_1 = extractData(ignore);
                                if (data_1 === null) {
                                    continue;
                                }
                                ref_1 = data_1.ref, path_1 = data_1.path;
                                if (!refsForPaths.has(ref_1)) {
                                    refsForPaths.set(ref_1, []);
                                }
                                refsForPaths.get(ref_1).push("!" + unixify(path_1));
                            }
                        }
                        catch (e_1_1) { e_1 = { error: e_1_1 }; }
                        finally {
                            try {
                                if (ignores_1_1 && !ignores_1_1.done && (_a = ignores_1.return)) _a.call(ignores_1);
                            }
                            finally { if (e_1) throw e_1.error; }
                        }
                        resolved = [];
                        return [4 /*yield*/, Promise.all(__spreadArray([], __read(refsForPaths.entries()), false).map(function (_a) {
                                var _b = __read(_a, 2), ref = _b[0], paths = _b[1];
                                return __awaiter(_this, void 0, void 0, function () {
                                    var _c, _d, _e, _f, _g;
                                    return __generator(this, function (_h) {
                                        switch (_h.label) {
                                            case 0:
                                                _d = (_c = resolved.push).apply;
                                                _e = [resolved];
                                                _f = [[]];
                                                _g = micromatch;
                                                return [4 /*yield*/, readTreeAtRef(ref)];
                                            case 1:
                                                _d.apply(_c, _e.concat([__spreadArray.apply(void 0, _f.concat([__read.apply(void 0, [_g.apply(void 0, [_h.sent(), paths]).map(function (filePath) { return "git:" + ref + ":" + filePath; })]), false]))]));
                                                return [2 /*return*/];
                                        }
                                    });
                                });
                            }))];
                    case 1:
                        _b.sent();
                        return [2 /*return*/, resolved];
                }
            });
        });
    };
    GitLoader.prototype.resolveGlobsSync = function (glob, ignores) {
        var e_2, _a, e_3, _b;
        var data = extractData(glob);
        if (data === null) {
            return [];
        }
        var ref = data.ref, path = data.path;
        var refsForPaths = new Map();
        if (!refsForPaths.has(ref)) {
            refsForPaths.set(ref, []);
        }
        refsForPaths.get(ref).push(unixify(path));
        try {
            for (var ignores_2 = __values(ignores), ignores_2_1 = ignores_2.next(); !ignores_2_1.done; ignores_2_1 = ignores_2.next()) {
                var ignore = ignores_2_1.value;
                var data_2 = extractData(ignore);
                if (data_2 === null) {
                    continue;
                }
                var ref_2 = data_2.ref, path_2 = data_2.path;
                if (!refsForPaths.has(ref_2)) {
                    refsForPaths.set(ref_2, []);
                }
                refsForPaths.get(ref_2).push("!" + unixify(path_2));
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (ignores_2_1 && !ignores_2_1.done && (_a = ignores_2.return)) _a.call(ignores_2);
            }
            finally { if (e_2) throw e_2.error; }
        }
        var resolved = [];
        var _loop_1 = function (ref_3, paths) {
            resolved.push.apply(resolved, __spreadArray([], __read(micromatch(readTreeAtRefSync(ref_3), paths).map(function (filePath) { return "git:" + ref_3 + ":" + filePath; })), false));
        };
        try {
            for (var _c = __values(refsForPaths.entries()), _d = _c.next(); !_d.done; _d = _c.next()) {
                var _e = __read(_d.value, 2), ref_3 = _e[0], paths = _e[1];
                _loop_1(ref_3, paths);
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_b = _c.return)) _b.call(_c);
            }
            finally { if (e_3) throw e_3.error; }
        }
        return resolved;
    };
    GitLoader.prototype.handleSingularPointerAsync = function (pointer, options) {
        return __awaiter(this, void 0, void 0, function () {
            var result, ref, path, content, parsed, sources;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        result = extractData(pointer);
                        if (result === null) {
                            return [2 /*return*/, []];
                        }
                        ref = result.ref, path = result.path;
                        return [4 /*yield*/, loadFromGit({ ref: ref, path: path })];
                    case 1:
                        content = _a.sent();
                        parsed = handleStuff({ path: path, options: options, pointer: pointer, content: content });
                        if (parsed) {
                            return [2 /*return*/, [parsed]];
                        }
                        return [4 /*yield*/, gqlPluckFromCodeString(pointer, content, options.pluckConfig)];
                    case 2:
                        sources = _a.sent();
                        return [2 /*return*/, sources.map(function (source) { return ({
                                location: pointer,
                                document: parse(source, options),
                            }); })];
                }
            });
        });
    };
    GitLoader.prototype.load = function (pointer, options) {
        return __awaiter(this, void 0, void 0, function () {
            var result, path, finalResult, errors, resolvedPaths, results, error_1, _a, _b, errorElement;
            var e_4, _c;
            var _this = this;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        result = extractData(pointer);
                        if (result === null) {
                            return [2 /*return*/, []];
                        }
                        path = result.path;
                        finalResult = [];
                        errors = [];
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 8, , 9]);
                        if (!isGlob(path)) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.resolveGlobs(pointer, asArray(options.ignore || []))];
                    case 2:
                        resolvedPaths = _d.sent();
                        return [4 /*yield*/, Promise.all(resolvedPaths.map(function (path) { return __awaiter(_this, void 0, void 0, function () {
                                var results;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, this.load(path, options)];
                                        case 1:
                                            results = _a.sent();
                                            results === null || results === void 0 ? void 0 : results.forEach(function (result) { return finalResult.push(result); });
                                            return [2 /*return*/];
                                    }
                                });
                            }); }))];
                    case 3:
                        _d.sent();
                        return [3 /*break*/, 7];
                    case 4: return [4 /*yield*/, this.canLoad(pointer)];
                    case 5:
                        if (!_d.sent()) return [3 /*break*/, 7];
                        return [4 /*yield*/, this.handleSingularPointerAsync(pointer, options)];
                    case 6:
                        results = _d.sent();
                        results === null || results === void 0 ? void 0 : results.forEach(function (result) { return finalResult.push(result); });
                        _d.label = 7;
                    case 7: return [3 /*break*/, 9];
                    case 8:
                        error_1 = _d.sent();
                        if (env['DEBUG']) {
                            console.error(error_1);
                        }
                        if (error_1 instanceof AggregateError) {
                            try {
                                for (_a = __values(error_1.errors), _b = _a.next(); !_b.done; _b = _a.next()) {
                                    errorElement = _b.value;
                                    errors.push(errorElement);
                                }
                            }
                            catch (e_4_1) { e_4 = { error: e_4_1 }; }
                            finally {
                                try {
                                    if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                                }
                                finally { if (e_4) throw e_4.error; }
                            }
                        }
                        else {
                            errors.push(error_1);
                        }
                        return [3 /*break*/, 9];
                    case 9:
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
    GitLoader.prototype.handleSingularPointerSync = function (pointer, options) {
        var result = extractData(pointer);
        if (result === null) {
            return [];
        }
        var ref = result.ref, path = result.path;
        var content = loadFromGitSync({ ref: ref, path: path });
        var parsed = handleStuff({ path: path, options: options, pointer: pointer, content: content });
        if (parsed) {
            return [parsed];
        }
        var sources = gqlPluckFromCodeStringSync(pointer, content, options.pluckConfig);
        return sources.map(function (source) { return ({
            location: pointer,
            document: parse(source, options),
        }); });
    };
    GitLoader.prototype.loadSync = function (pointer, options) {
        var e_5, _a, e_6, _b, e_7, _c, e_8, _d;
        var result = extractData(pointer);
        if (result === null) {
            return [];
        }
        var path = result.path;
        var finalResult = [];
        var errors = [];
        try {
            if (isGlob(path)) {
                var resolvedPaths = this.resolveGlobsSync(pointer, asArray(options.ignore || []));
                var finalResult_1 = [];
                try {
                    for (var resolvedPaths_1 = __values(resolvedPaths), resolvedPaths_1_1 = resolvedPaths_1.next(); !resolvedPaths_1_1.done; resolvedPaths_1_1 = resolvedPaths_1.next()) {
                        var path_3 = resolvedPaths_1_1.value;
                        if (this.canLoadSync(path_3)) {
                            var results = this.loadSync(path_3, options);
                            try {
                                for (var results_1 = (e_6 = void 0, __values(results)), results_1_1 = results_1.next(); !results_1_1.done; results_1_1 = results_1.next()) {
                                    var result_1 = results_1_1.value;
                                    finalResult_1.push(result_1);
                                }
                            }
                            catch (e_6_1) { e_6 = { error: e_6_1 }; }
                            finally {
                                try {
                                    if (results_1_1 && !results_1_1.done && (_b = results_1.return)) _b.call(results_1);
                                }
                                finally { if (e_6) throw e_6.error; }
                            }
                        }
                    }
                }
                catch (e_5_1) { e_5 = { error: e_5_1 }; }
                finally {
                    try {
                        if (resolvedPaths_1_1 && !resolvedPaths_1_1.done && (_a = resolvedPaths_1.return)) _a.call(resolvedPaths_1);
                    }
                    finally { if (e_5) throw e_5.error; }
                }
            }
            else if (this.canLoadSync(pointer)) {
                var results = this.handleSingularPointerSync(pointer, options);
                try {
                    for (var results_2 = __values(results), results_2_1 = results_2.next(); !results_2_1.done; results_2_1 = results_2.next()) {
                        var result_2 = results_2_1.value;
                        finalResult.push(result_2);
                    }
                }
                catch (e_7_1) { e_7 = { error: e_7_1 }; }
                finally {
                    try {
                        if (results_2_1 && !results_2_1.done && (_c = results_2.return)) _c.call(results_2);
                    }
                    finally { if (e_7) throw e_7.error; }
                }
            }
        }
        catch (error) {
            if (env['DEBUG']) {
                console.error(error);
            }
            if (error instanceof AggregateError) {
                try {
                    for (var _e = __values(error.errors), _f = _e.next(); !_f.done; _f = _e.next()) {
                        var errorElement = _f.value;
                        errors.push(errorElement);
                    }
                }
                catch (e_8_1) { e_8 = { error: e_8_1 }; }
                finally {
                    try {
                        if (_f && !_f.done && (_d = _e.return)) _d.call(_e);
                    }
                    finally { if (e_8) throw e_8.error; }
                }
            }
            else {
                errors.push(error);
            }
        }
        if (finalResult.length === 0 && errors.length > 0) {
            if (errors.length === 1) {
                throw errors[0];
            }
            throw new AggregateError(errors);
        }
        return finalResult;
    };
    return GitLoader;
}());
export { GitLoader };
