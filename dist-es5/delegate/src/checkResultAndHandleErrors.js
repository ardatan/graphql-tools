import { __read, __spreadArray, __values } from "tslib";
import { responsePathAsArray, locatedError } from 'graphql';
import { AggregateError, getResponseKeyFromInfo, relocatedError } from '@graphql-tools/utils';
import { resolveExternalValue } from './resolveExternalValue';
export function checkResultAndHandleErrors(result, delegationContext) {
    var context = delegationContext.context, info = delegationContext.info, _a = delegationContext.fieldName, responseKey = _a === void 0 ? getResponseKey(info) : _a, subschema = delegationContext.subschema, _b = delegationContext.returnType, returnType = _b === void 0 ? getReturnType(info) : _b, skipTypeMerging = delegationContext.skipTypeMerging, onLocatedError = delegationContext.onLocatedError;
    var _c = mergeDataAndErrors(result.data == null ? undefined : result.data[responseKey], result.errors == null ? [] : result.errors, info != null && info.path ? responsePathAsArray(info.path) : undefined, onLocatedError), data = _c.data, unpathedErrors = _c.unpathedErrors;
    return resolveExternalValue(data, unpathedErrors, subschema, context, info, returnType, skipTypeMerging);
}
export function mergeDataAndErrors(data, errors, path, onLocatedError, index) {
    var e_1, _a, e_2, _b;
    var _c;
    if (index === void 0) { index = 1; }
    if (data == null) {
        if (!errors.length) {
            return { data: null, unpathedErrors: [] };
        }
        if (errors.length === 1) {
            var error = onLocatedError ? onLocatedError(errors[0]) : errors[0];
            var newPath = path === undefined ? error.path : error.path === undefined ? path : path.concat(error.path.slice(1));
            return { data: relocatedError(errors[0], newPath), unpathedErrors: [] };
        }
        // We cast path as any for GraphQL.js 14 compat
        // locatedError path argument must be defined, but it is just forwarded to a constructor that allows a undefined value
        // https://github.com/graphql/graphql-js/blob/b4bff0ba9c15c9d7245dd68556e754c41f263289/src/error/locatedError.js#L25
        // https://github.com/graphql/graphql-js/blob/b4bff0ba9c15c9d7245dd68556e754c41f263289/src/error/GraphQLError.js#L19
        var newError = locatedError(new AggregateError(errors), undefined, path);
        return { data: newError, unpathedErrors: [] };
    }
    if (!errors.length) {
        return { data: data, unpathedErrors: [] };
    }
    var unpathedErrors = [];
    var errorMap = new Map();
    try {
        for (var errors_1 = __values(errors), errors_1_1 = errors_1.next(); !errors_1_1.done; errors_1_1 = errors_1.next()) {
            var error = errors_1_1.value;
            var pathSegment = (_c = error.path) === null || _c === void 0 ? void 0 : _c[index];
            if (pathSegment != null) {
                var pathSegmentErrors = errorMap.get(pathSegment);
                if (pathSegmentErrors === undefined) {
                    pathSegmentErrors = [error];
                    errorMap.set(pathSegment, pathSegmentErrors);
                }
                else {
                    pathSegmentErrors.push(error);
                }
            }
            else {
                unpathedErrors.push(error);
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (errors_1_1 && !errors_1_1.done && (_a = errors_1.return)) _a.call(errors_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    try {
        for (var errorMap_1 = __values(errorMap), errorMap_1_1 = errorMap_1.next(); !errorMap_1_1.done; errorMap_1_1 = errorMap_1.next()) {
            var _d = __read(errorMap_1_1.value, 2), pathSegment = _d[0], pathSegmentErrors = _d[1];
            if (data[pathSegment] !== undefined) {
                var _e = mergeDataAndErrors(data[pathSegment], pathSegmentErrors, path, onLocatedError, index + 1), newData = _e.data, newErrors = _e.unpathedErrors;
                data[pathSegment] = newData;
                unpathedErrors.push.apply(unpathedErrors, __spreadArray([], __read(newErrors), false));
            }
            else {
                unpathedErrors.push.apply(unpathedErrors, __spreadArray([], __read(pathSegmentErrors), false));
            }
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (errorMap_1_1 && !errorMap_1_1.done && (_b = errorMap_1.return)) _b.call(errorMap_1);
        }
        finally { if (e_2) throw e_2.error; }
    }
    return { data: data, unpathedErrors: unpathedErrors };
}
function getResponseKey(info) {
    if (info == null) {
        throw new Error("Data cannot be extracted from result without an explicit key or source schema.");
    }
    return getResponseKeyFromInfo(info);
}
function getReturnType(info) {
    if (info == null) {
        throw new Error("Return type cannot be inferred without a source schema.");
    }
    return info.returnType;
}
