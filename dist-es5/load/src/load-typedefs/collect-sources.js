import { __assign, __awaiter, __generator, __read, __spreadArray, __values } from "tslib";
import { isDocumentString, parseGraphQLSDL, getDocumentNodeFromSchema } from '@graphql-tools/utils';
import { isSchema, Kind } from 'graphql';
import { loadFile, loadFileSync } from './load-file';
import { stringToHash, useStack } from '../utils/helpers';
import { useCustomLoader, useCustomLoaderSync } from '../utils/custom-loader';
import { useQueue, useSyncQueue } from '../utils/queue';
var CONCURRENCY_LIMIT = 50;
export function collectSources(_a) {
    var pointerOptionMap = _a.pointerOptionMap, options = _a.options;
    return __awaiter(this, void 0, void 0, function () {
        var sources, queue, _b, addSource, collect, pointer, pointerOptions;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    sources = [];
                    queue = useQueue({ concurrency: CONCURRENCY_LIMIT });
                    _b = createHelpers({
                        sources: sources,
                        stack: [collectDocumentString, collectCustomLoader, collectFallback],
                    }), addSource = _b.addSource, collect = _b.collect;
                    for (pointer in pointerOptionMap) {
                        pointerOptions = pointerOptionMap[pointer];
                        collect({
                            pointer: pointer,
                            pointerOptions: pointerOptions,
                            pointerOptionMap: pointerOptionMap,
                            options: options,
                            addSource: addSource,
                            queue: queue.add,
                        });
                    }
                    return [4 /*yield*/, queue.runAll()];
                case 1:
                    _c.sent();
                    return [2 /*return*/, sources];
            }
        });
    });
}
export function collectSourcesSync(_a) {
    var pointerOptionMap = _a.pointerOptionMap, options = _a.options;
    var sources = [];
    var queue = useSyncQueue();
    var _b = createHelpers({
        sources: sources,
        stack: [collectDocumentString, collectCustomLoaderSync, collectFallbackSync],
    }), addSource = _b.addSource, collect = _b.collect;
    for (var pointer in pointerOptionMap) {
        var pointerOptions = pointerOptionMap[pointer];
        collect({
            pointer: pointer,
            pointerOptions: pointerOptions,
            pointerOptionMap: pointerOptionMap,
            options: options,
            addSource: addSource,
            queue: queue.add,
        });
    }
    queue.runAll();
    return sources;
}
function createHelpers(_a) {
    var sources = _a.sources, stack = _a.stack;
    var addSource = function (_a) {
        var source = _a.source;
        sources.push(source);
    };
    var collect = useStack.apply(void 0, __spreadArray([], __read(stack), false));
    return {
        addSource: addSource,
        collect: collect,
    };
}
function addResultOfCustomLoader(_a) {
    var pointer = _a.pointer, result = _a.result, addSource = _a.addSource;
    if (isSchema(result)) {
        addSource({
            source: {
                location: pointer,
                schema: result,
                document: getDocumentNodeFromSchema(result),
            },
            pointer: pointer,
            noCache: true,
        });
    }
    else if (result.kind && result.kind === Kind.DOCUMENT) {
        addSource({
            source: {
                document: result,
                location: pointer,
            },
            pointer: pointer,
        });
    }
    else if (result.document) {
        addSource({
            source: __assign({ location: pointer }, result),
            pointer: pointer,
        });
    }
}
function collectDocumentString(_a, next) {
    var pointer = _a.pointer, pointerOptions = _a.pointerOptions, options = _a.options, addSource = _a.addSource, queue = _a.queue;
    if (isDocumentString(pointer)) {
        return queue(function () {
            var source = parseGraphQLSDL(stringToHash(pointer) + ".graphql", pointer, __assign(__assign({}, options), pointerOptions));
            addSource({
                source: source,
                pointer: pointer,
            });
        });
    }
    next();
}
function collectCustomLoader(_a, next) {
    var _this = this;
    var pointer = _a.pointer, pointerOptions = _a.pointerOptions, queue = _a.queue, addSource = _a.addSource, options = _a.options, pointerOptionMap = _a.pointerOptionMap;
    if (pointerOptions.loader) {
        return queue(function () { return __awaiter(_this, void 0, void 0, function () {
            var loader, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, useCustomLoader(pointerOptions.loader, options.cwd)];
                    case 1:
                        loader = _a.sent();
                        return [4 /*yield*/, loader(pointer, __assign(__assign({}, options), pointerOptions), pointerOptionMap)];
                    case 2:
                        result = _a.sent();
                        if (!result) {
                            return [2 /*return*/];
                        }
                        addResultOfCustomLoader({ pointer: pointer, result: result, addSource: addSource });
                        return [2 /*return*/];
                }
            });
        }); });
    }
    next();
}
function collectCustomLoaderSync(_a, next) {
    var pointer = _a.pointer, pointerOptions = _a.pointerOptions, queue = _a.queue, addSource = _a.addSource, options = _a.options, pointerOptionMap = _a.pointerOptionMap;
    if (pointerOptions.loader) {
        return queue(function () {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore TODO options.cwd is possibly undefined, but it seems like no test covers this path
            var loader = useCustomLoaderSync(pointerOptions.loader, options.cwd);
            var result = loader(pointer, __assign(__assign({}, options), pointerOptions), pointerOptionMap);
            if (result) {
                addResultOfCustomLoader({ pointer: pointer, result: result, addSource: addSource });
            }
        });
    }
    next();
}
function collectFallback(_a) {
    var _this = this;
    var queue = _a.queue, pointer = _a.pointer, options = _a.options, pointerOptions = _a.pointerOptions, addSource = _a.addSource;
    return queue(function () { return __awaiter(_this, void 0, void 0, function () {
        var sources, sources_1, sources_1_1, source;
        var e_1, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, loadFile(pointer, __assign(__assign({}, options), pointerOptions))];
                case 1:
                    sources = _b.sent();
                    if (sources) {
                        try {
                            for (sources_1 = __values(sources), sources_1_1 = sources_1.next(); !sources_1_1.done; sources_1_1 = sources_1.next()) {
                                source = sources_1_1.value;
                                addSource({ source: source, pointer: pointer });
                            }
                        }
                        catch (e_1_1) { e_1 = { error: e_1_1 }; }
                        finally {
                            try {
                                if (sources_1_1 && !sources_1_1.done && (_a = sources_1.return)) _a.call(sources_1);
                            }
                            finally { if (e_1) throw e_1.error; }
                        }
                    }
                    return [2 /*return*/];
            }
        });
    }); });
}
function collectFallbackSync(_a) {
    var queue = _a.queue, pointer = _a.pointer, options = _a.options, pointerOptions = _a.pointerOptions, addSource = _a.addSource;
    return queue(function () {
        var e_2, _a;
        var sources = loadFileSync(pointer, __assign(__assign({}, options), pointerOptions));
        if (sources) {
            try {
                for (var sources_2 = __values(sources), sources_2_1 = sources_2.next(); !sources_2_1.done; sources_2_1 = sources_2.next()) {
                    var source = sources_2_1.value;
                    addSource({ source: source, pointer: pointer });
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (sources_2_1 && !sources_2_1.done && (_a = sources_2.return)) _a.call(sources_2);
                }
                finally { if (e_2) throw e_2.error; }
            }
        }
    });
}
