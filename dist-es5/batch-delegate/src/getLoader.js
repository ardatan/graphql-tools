import { __assign, __awaiter, __generator, __read } from "tslib";
import { getNamedType, GraphQLList } from 'graphql';
import DataLoader from 'dataloader';
import { delegateToSchema } from '@graphql-tools/delegate';
import { memoize2, relocatedError } from '@graphql-tools/utils';
function createBatchFn(options) {
    var _a, _b;
    var argsFromKeys = (_a = options.argsFromKeys) !== null && _a !== void 0 ? _a : (function (keys) { return ({ ids: keys }); });
    var fieldName = (_b = options.fieldName) !== null && _b !== void 0 ? _b : options.info.fieldName;
    var valuesFromResults = options.valuesFromResults, lazyOptionsFn = options.lazyOptionsFn;
    return function batchFn(keys) {
        return __awaiter(this, void 0, void 0, function () {
            var results, values;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, delegateToSchema(__assign({ returnType: new GraphQLList(getNamedType(options.info.returnType)), onLocatedError: function (originalError) {
                                if (originalError.path == null) {
                                    return originalError;
                                }
                                var _a = __read(originalError.path, 2), pathFieldName = _a[0], pathNumber = _a[1];
                                if (pathFieldName !== fieldName) {
                                    return originalError;
                                }
                                var pathNumberType = typeof pathNumber;
                                if (pathNumberType !== 'number') {
                                    return originalError;
                                }
                                return relocatedError(originalError, originalError.path.slice(0, 0).concat(originalError.path.slice(2)));
                            }, args: argsFromKeys(keys) }, (lazyOptionsFn == null ? options : lazyOptionsFn(options))))];
                    case 1:
                        results = _a.sent();
                        if (results instanceof Error) {
                            return [2 /*return*/, keys.map(function () { return results; })];
                        }
                        values = valuesFromResults == null ? results : valuesFromResults(results, keys);
                        return [2 /*return*/, Array.isArray(values) ? values : keys.map(function () { return values; })];
                }
            });
        });
    };
}
function defaultCacheKeyFn(key) {
    if (typeof key === 'object') {
        return JSON.stringify(key);
    }
    return key;
}
var getLoadersMap = memoize2(function getLoadersMap(_fieldNodes, _schema) {
    return new Map();
});
export function getLoader(options) {
    var _a;
    var fieldName = (_a = options.fieldName) !== null && _a !== void 0 ? _a : options.info.fieldName;
    var loaders = getLoadersMap(options.info.fieldNodes, options.schema);
    var loader = loaders.get(fieldName);
    // Prevents the keys to be passed with the same structure
    var dataLoaderOptions = __assign({ cacheKeyFn: defaultCacheKeyFn }, options.dataLoaderOptions);
    if (loader === undefined) {
        var batchFn = createBatchFn(options);
        loader = new DataLoader(batchFn, dataLoaderOptions);
        loaders.set(fieldName, loader);
    }
    return loader;
}
