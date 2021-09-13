import { __assign, __awaiter, __generator, __values } from "tslib";
import globby, { sync as globbySync } from 'globby';
import unixify from 'unixify';
import { extname } from 'path';
import { statSync, readFileSync, promises as fsPromises } from 'fs';
var readFile = fsPromises.readFile, stat = fsPromises.stat;
var DEFAULT_IGNORED_EXTENSIONS = ['spec', 'test', 'd', 'map'];
var DEFAULT_EXTENSIONS = ['gql', 'graphql', 'graphqls', 'ts', 'js'];
var DEFAULT_EXPORT_NAMES = ['schema', 'typeDef', 'typeDefs', 'resolver', 'resolvers'];
var DEFAULT_EXTRACT_EXPORTS_FACTORY = function (exportNames) {
    return function (fileExport) {
        var e_1, _a, e_2, _b;
        if (!fileExport) {
            return null;
        }
        if (fileExport.default) {
            try {
                for (var exportNames_1 = __values(exportNames), exportNames_1_1 = exportNames_1.next(); !exportNames_1_1.done; exportNames_1_1 = exportNames_1.next()) {
                    var exportName = exportNames_1_1.value;
                    if (fileExport.default[exportName]) {
                        return fileExport.default[exportName];
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (exportNames_1_1 && !exportNames_1_1.done && (_a = exportNames_1.return)) _a.call(exportNames_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return fileExport.default;
        }
        try {
            for (var exportNames_2 = __values(exportNames), exportNames_2_1 = exportNames_2.next(); !exportNames_2_1.done; exportNames_2_1 = exportNames_2.next()) {
                var exportName = exportNames_2_1.value;
                if (fileExport[exportName]) {
                    return fileExport[exportName];
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (exportNames_2_1 && !exportNames_2_1.done && (_b = exportNames_2.return)) _b.call(exportNames_2);
            }
            finally { if (e_2) throw e_2.error; }
        }
        return fileExport;
    };
};
function asArray(obj) {
    if (obj instanceof Array) {
        return obj;
    }
    else {
        return [obj];
    }
}
function isDirectorySync(path) {
    try {
        var pathStat = statSync(path);
        return pathStat.isDirectory();
    }
    catch (e) {
        return false;
    }
}
function isDirectory(path) {
    return __awaiter(this, void 0, void 0, function () {
        var pathStat, e_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, stat(path)];
                case 1:
                    pathStat = _a.sent();
                    return [2 /*return*/, pathStat.isDirectory()];
                case 2:
                    e_3 = _a.sent();
                    return [2 /*return*/, false];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function scanForFilesSync(globStr, globOptions) {
    if (globOptions === void 0) { globOptions = {}; }
    return globbySync(globStr, __assign({ absolute: true }, globOptions));
}
function formatExtension(extension) {
    return extension.charAt(0) === '.' ? extension : "." + extension;
}
function buildGlob(basePath, extensions, ignoredExtensions, recursive) {
    if (extensions === void 0) { extensions = []; }
    if (ignoredExtensions === void 0) { ignoredExtensions = []; }
    var ignored = ignoredExtensions.length > 0 ? "!(" + ignoredExtensions.map(function (e) { return "*" + formatExtension(e); }).join('|') + ")" : '*';
    var ext = extensions.map(function (e) { return "*" + formatExtension(e); }).join('|');
    return "" + basePath + (recursive ? '/**' : '') + "/" + ignored + "+(" + ext + ")";
}
var LoadFilesDefaultOptions = {
    ignoredExtensions: DEFAULT_IGNORED_EXTENSIONS,
    extensions: DEFAULT_EXTENSIONS,
    useRequire: false,
    requireMethod: null,
    globOptions: {
        absolute: true,
    },
    exportNames: DEFAULT_EXPORT_NAMES,
    recursive: true,
    ignoreIndex: false,
};
/**
 * Synchronously loads files using the provided glob pattern.
 * @param pattern Glob pattern or patterns to use when loading files
 * @param options Additional options
 */
export function loadFilesSync(pattern, options) {
    var _a;
    if (options === void 0) { options = LoadFilesDefaultOptions; }
    var execOptions = __assign(__assign({}, LoadFilesDefaultOptions), options);
    var relevantPaths = scanForFilesSync(asArray(pattern).map(function (path) {
        return isDirectorySync(path)
            ? buildGlob(unixify(path), execOptions.extensions, execOptions.ignoredExtensions, execOptions.recursive)
            : unixify(path);
    }), options.globOptions);
    var extractExports = execOptions.extractExports || DEFAULT_EXTRACT_EXPORTS_FACTORY((_a = execOptions.exportNames) !== null && _a !== void 0 ? _a : []);
    var requireMethod = execOptions.requireMethod || require;
    return relevantPaths
        .map(function (path) {
        if (!checkExtension(path, options)) {
            return null;
        }
        if (isIndex(path, execOptions.extensions) && options.ignoreIndex) {
            return false;
        }
        var extension = extname(path);
        if (extension === formatExtension('js') || extension === formatExtension('ts') || execOptions.useRequire) {
            var fileExports = requireMethod(path);
            var extractedExport = extractExports(fileExports);
            return extractedExport;
        }
        else {
            return readFileSync(path, { encoding: 'utf-8' });
        }
    })
        .filter(function (v) { return v; });
}
function scanForFiles(globStr, globOptions) {
    if (globOptions === void 0) { globOptions = {}; }
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, globby(globStr, __assign({ absolute: true }, globOptions))];
        });
    });
}
var checkExtension = function (path, _a) {
    var e_4, _b, e_5, _c, e_6, _d;
    var extensions = _a.extensions, ignoredExtensions = _a.ignoredExtensions;
    if (ignoredExtensions) {
        try {
            for (var ignoredExtensions_1 = __values(ignoredExtensions), ignoredExtensions_1_1 = ignoredExtensions_1.next(); !ignoredExtensions_1_1.done; ignoredExtensions_1_1 = ignoredExtensions_1.next()) {
                var ignoredExtension = ignoredExtensions_1_1.value;
                if (path.endsWith(formatExtension(ignoredExtension))) {
                    return false;
                }
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (ignoredExtensions_1_1 && !ignoredExtensions_1_1.done && (_b = ignoredExtensions_1.return)) _b.call(ignoredExtensions_1);
            }
            finally { if (e_4) throw e_4.error; }
        }
    }
    if (!extensions) {
        return true;
    }
    try {
        for (var extensions_1 = __values(extensions), extensions_1_1 = extensions_1.next(); !extensions_1_1.done; extensions_1_1 = extensions_1.next()) {
            var extension = extensions_1_1.value;
            var formattedExtension = formatExtension(extension);
            if (path.endsWith(formattedExtension)) {
                if (ignoredExtensions) {
                    try {
                        for (var ignoredExtensions_2 = (e_6 = void 0, __values(ignoredExtensions)), ignoredExtensions_2_1 = ignoredExtensions_2.next(); !ignoredExtensions_2_1.done; ignoredExtensions_2_1 = ignoredExtensions_2.next()) {
                            var ignoredExtension = ignoredExtensions_2_1.value;
                            var formattedIgnoredExtension = formatExtension(ignoredExtension);
                            if (path.endsWith(formattedIgnoredExtension + formattedExtension)) {
                                return false;
                            }
                        }
                    }
                    catch (e_6_1) { e_6 = { error: e_6_1 }; }
                    finally {
                        try {
                            if (ignoredExtensions_2_1 && !ignoredExtensions_2_1.done && (_d = ignoredExtensions_2.return)) _d.call(ignoredExtensions_2);
                        }
                        finally { if (e_6) throw e_6.error; }
                    }
                }
                return true;
            }
        }
    }
    catch (e_5_1) { e_5 = { error: e_5_1 }; }
    finally {
        try {
            if (extensions_1_1 && !extensions_1_1.done && (_c = extensions_1.return)) _c.call(extensions_1);
        }
        finally { if (e_5) throw e_5.error; }
    }
    return false;
};
/**
 * Asynchronously loads files using the provided glob pattern.
 * @param pattern Glob pattern or patterns to use when loading files
 * @param options Additional options
 */
export function loadFiles(pattern, options) {
    var _a;
    if (options === void 0) { options = LoadFilesDefaultOptions; }
    return __awaiter(this, void 0, void 0, function () {
        var execOptions, relevantPaths, _b, extractExports, defaultRequireMethod, requireMethod;
        var _this = this;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    execOptions = __assign(__assign({}, LoadFilesDefaultOptions), options);
                    _b = scanForFiles;
                    return [4 /*yield*/, Promise.all(asArray(pattern).map(function (path) { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, isDirectory(path)];
                                    case 1: return [2 /*return*/, (_a.sent())
                                            ? buildGlob(unixify(path), execOptions.extensions, execOptions.ignoredExtensions, execOptions.recursive)
                                            : unixify(path)];
                                }
                            });
                        }); }))];
                case 1: return [4 /*yield*/, _b.apply(void 0, [_c.sent(), options.globOptions])];
                case 2:
                    relevantPaths = _c.sent();
                    extractExports = execOptions.extractExports || DEFAULT_EXTRACT_EXPORTS_FACTORY((_a = execOptions.exportNames) !== null && _a !== void 0 ? _a : []);
                    defaultRequireMethod = function (path) { return import(path).catch(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                        return [2 /*return*/, require(path)];
                    }); }); }); };
                    requireMethod = execOptions.requireMethod || defaultRequireMethod;
                    return [2 /*return*/, Promise.all(relevantPaths
                            .filter(function (path) { return checkExtension(path, options) && !(isIndex(path, execOptions.extensions) && options.ignoreIndex); })
                            .map(function (path) { return __awaiter(_this, void 0, void 0, function () {
                            var extension, fileExports, extractedExport;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        extension = extname(path);
                                        if (!(extension === formatExtension('js') || extension === formatExtension('ts') || execOptions.useRequire)) return [3 /*break*/, 2];
                                        return [4 /*yield*/, requireMethod(path)];
                                    case 1:
                                        fileExports = _a.sent();
                                        extractedExport = extractExports(fileExports);
                                        return [2 /*return*/, extractedExport];
                                    case 2: return [2 /*return*/, readFile(path, { encoding: 'utf-8' })];
                                }
                            });
                        }); }))];
            }
        });
    });
}
function isIndex(path, extensions) {
    if (extensions === void 0) { extensions = []; }
    var IS_INDEX = /(\/|\\)index\.[^\/\\]+$/i; // (/ or \) AND `index.` AND (everything except \ and /)(end of line)
    return IS_INDEX.test(path) && extensions.some(function (ext) { return path.endsWith(formatExtension(ext)); });
}
