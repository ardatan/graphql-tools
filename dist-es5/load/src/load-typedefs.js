import { __awaiter, __generator, __read, __spreadArray, __values } from "tslib";
import { compareStrings, asArray } from '@graphql-tools/utils';
import { normalizePointers } from './utils/pointers';
import { applyDefaultOptions } from './load-typedefs/options';
import { collectSources, collectSourcesSync } from './load-typedefs/collect-sources';
import { parseSource } from './load-typedefs/parse';
import { useLimit } from './utils/helpers';
var CONCURRENCY_LIMIT = 100;
/**
 * Asynchronously loads any GraphQL documents (i.e. executable documents like
 * operations and fragments as well as type system definitions) from the
 * provided pointers.
 * @param pointerOrPointers Pointers to the sources to load the documents from
 * @param options Additional options
 */
export function loadTypedefs(pointerOrPointers, options) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, ignore, pointerOptionMap, sources, validSources, limit;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _a = normalizePointers(pointerOrPointers), ignore = _a.ignore, pointerOptionMap = _a.pointerOptionMap;
                    options.ignore = asArray(options.ignore || []);
                    (_b = options.ignore).push.apply(_b, __spreadArray([], __read(ignore), false));
                    applyDefaultOptions(options);
                    return [4 /*yield*/, collectSources({
                            pointerOptionMap: pointerOptionMap,
                            options: options,
                        })];
                case 1:
                    sources = _c.sent();
                    validSources = [];
                    limit = useLimit(CONCURRENCY_LIMIT);
                    return [4 /*yield*/, Promise.all(sources.map(function (partialSource) {
                            return limit(function () {
                                return parseSource({
                                    partialSource: partialSource,
                                    options: options,
                                    pointerOptionMap: pointerOptionMap,
                                    addValidSource: function (source) {
                                        validSources.push(source);
                                    },
                                });
                            });
                        }))];
                case 2:
                    _c.sent();
                    return [2 /*return*/, prepareResult({ options: options, pointerOptionMap: pointerOptionMap, validSources: validSources })];
            }
        });
    });
}
/**
 * Synchronously loads any GraphQL documents (i.e. executable documents like
 * operations and fragments as well as type system definitions) from the
 * provided pointers.
 * @param pointerOrPointers Pointers to the sources to load the documents from
 * @param options Additional options
 */
export function loadTypedefsSync(pointerOrPointers, options) {
    var e_1, _a;
    var _b = normalizePointers(pointerOrPointers), ignore = _b.ignore, pointerOptionMap = _b.pointerOptionMap;
    options.ignore = asArray(options.ignore || []).concat(ignore);
    applyDefaultOptions(options);
    var sources = collectSourcesSync({
        pointerOptionMap: pointerOptionMap,
        options: options,
    });
    var validSources = [];
    try {
        for (var sources_1 = __values(sources), sources_1_1 = sources_1.next(); !sources_1_1.done; sources_1_1 = sources_1.next()) {
            var partialSource = sources_1_1.value;
            parseSource({
                partialSource: partialSource,
                options: options,
                pointerOptionMap: pointerOptionMap,
                addValidSource: function (source) {
                    validSources.push(source);
                },
            });
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (sources_1_1 && !sources_1_1.done && (_a = sources_1.return)) _a.call(sources_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return prepareResult({ options: options, pointerOptionMap: pointerOptionMap, validSources: validSources });
}
//
function prepareResult(_a) {
    var options = _a.options, pointerOptionMap = _a.pointerOptionMap, validSources = _a.validSources;
    var pointerList = Object.keys(pointerOptionMap);
    if (pointerList.length > 0 && validSources.length === 0) {
        throw new Error("\n      Unable to find any GraphQL type definitions for the following pointers:\n        " + pointerList.map(function (p) { return "\n          - " + p + "\n          "; }));
    }
    return options.sort
        ? validSources.sort(function (left, right) { return compareStrings(left.location, right.location); })
        : validSources;
}
