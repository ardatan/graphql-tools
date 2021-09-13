import { __assign } from "tslib";
import { getLoader } from './getLoader';
export function createBatchDelegateFn(optionsOrArgsFromKeys, lazyOptionsFn, dataLoaderOptions, valuesFromResults) {
    return typeof optionsOrArgsFromKeys === 'function'
        ? createBatchDelegateFnImpl({
            argsFromKeys: optionsOrArgsFromKeys,
            lazyOptionsFn: lazyOptionsFn,
            dataLoaderOptions: dataLoaderOptions,
            valuesFromResults: valuesFromResults,
        })
        : createBatchDelegateFnImpl(optionsOrArgsFromKeys);
}
function createBatchDelegateFnImpl(options) {
    return function (batchDelegateOptions) {
        var loader = getLoader(__assign(__assign({}, options), batchDelegateOptions));
        return loader.load(batchDelegateOptions.key);
    };
}
