import { __read, __spreadArray } from "tslib";
import { compareNodes } from '@graphql-tools/utils';
function alreadyExists(arr, other) {
    return !!arr.find(function (i) { return i.name.value === other.name.value; });
}
export function mergeNamedTypeArray(first, second, config) {
    if (first === void 0) { first = []; }
    if (second === void 0) { second = []; }
    if (config === void 0) { config = {}; }
    var result = __spreadArray(__spreadArray([], __read(second), false), __read(first.filter(function (d) { return !alreadyExists(second, d); })), false);
    if (config && config.sort) {
        result.sort(compareNodes);
    }
    return result;
}
