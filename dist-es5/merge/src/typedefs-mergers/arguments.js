import { __read, __spreadArray } from "tslib";
import { compareNodes, isSome } from '@graphql-tools/utils';
export function mergeArguments(args1, args2, config) {
    var result = deduplicateArguments(__spreadArray(__spreadArray([], __read(args2), false), __read(args1), false).filter(isSome));
    if (config && config.sort) {
        result.sort(compareNodes);
    }
    return result;
}
function deduplicateArguments(args) {
    return args.reduce(function (acc, current) {
        var dup = acc.find(function (arg) { return arg.name.value === current.name.value; });
        if (!dup) {
            return acc.concat([current]);
        }
        return acc;
    }, []);
}
