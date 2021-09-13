import { __values } from "tslib";
import { getNullableType, isCompositeType, isListType, isAbstractType, locatedError, } from 'graphql';
import { AggregateError } from '@graphql-tools/utils';
import { annotateExternalObject, isExternalObject, mergeFields } from './mergeFields';
export function resolveExternalValue(result, unpathedErrors, subschema, context, info, returnType, skipTypeMerging) {
    if (returnType === void 0) { returnType = getReturnType(info); }
    var type = getNullableType(returnType);
    if (result instanceof Error) {
        return result;
    }
    if (result == null) {
        return reportUnpathedErrorsViaNull(unpathedErrors);
    }
    if ('parseValue' in type) {
        return type.parseValue(result);
    }
    else if (isCompositeType(type)) {
        return resolveExternalObject(type, result, unpathedErrors, subschema, context, info, skipTypeMerging);
    }
    else if (isListType(type)) {
        return resolveExternalList(type, result, unpathedErrors, subschema, context, info, skipTypeMerging);
    }
}
function resolveExternalObject(type, object, unpathedErrors, subschema, context, info, skipTypeMerging) {
    var _a;
    // if we have already resolved this object, for example, when the identical object appears twice
    // in a list, see https://github.com/ardatan/graphql-tools/issues/2304
    if (!isExternalObject(object)) {
        annotateExternalObject(object, unpathedErrors, subschema, Object.create(null));
    }
    if (skipTypeMerging || info == null) {
        return object;
    }
    var stitchingInfo = (_a = info.schema.extensions) === null || _a === void 0 ? void 0 : _a['stitchingInfo'];
    if (stitchingInfo == null) {
        return object;
    }
    var typeName;
    if (isAbstractType(type)) {
        var resolvedType = info.schema.getType(object.__typename);
        if (resolvedType == null) {
            throw new Error("Unable to resolve type '" + object.__typename + "'. Did you forget to include a transform that renames types? Did you delegate to the original subschema rather that the subschema config object containing the transform?");
        }
        typeName = resolvedType.name;
    }
    else {
        typeName = type.name;
    }
    var mergedTypeInfo = stitchingInfo.mergedTypes[typeName];
    var targetSubschemas;
    // Within the stitching context, delegation to a stitched GraphQLSchema or SubschemaConfig
    // will be redirected to the appropriate Subschema object, from which merge targets can be queried.
    if (mergedTypeInfo != null) {
        targetSubschemas = mergedTypeInfo.targetSubschemas.get(subschema);
    }
    // If there are no merge targets from the subschema, return.
    if (!targetSubschemas || !targetSubschemas.length) {
        return object;
    }
    return mergeFields(mergedTypeInfo, object, subschema, context, info);
}
function resolveExternalList(type, list, unpathedErrors, subschema, context, info, skipTypeMerging) {
    return list.map(function (listMember) {
        return resolveExternalListMember(getNullableType(type.ofType), listMember, unpathedErrors, subschema, context, info, skipTypeMerging);
    });
}
function resolveExternalListMember(type, listMember, unpathedErrors, subschema, context, info, skipTypeMerging) {
    if (listMember instanceof Error) {
        return listMember;
    }
    if (listMember == null) {
        return reportUnpathedErrorsViaNull(unpathedErrors);
    }
    if ('parseValue' in type) {
        return type.parseValue(listMember);
    }
    else if (isCompositeType(type)) {
        return resolveExternalObject(type, listMember, unpathedErrors, subschema, context, info, skipTypeMerging);
    }
    else if (isListType(type)) {
        return resolveExternalList(type, listMember, unpathedErrors, subschema, context, info, skipTypeMerging);
    }
}
var reportedErrors = new WeakMap();
function reportUnpathedErrorsViaNull(unpathedErrors) {
    var e_1, _a;
    if (unpathedErrors.length) {
        var unreportedErrors = [];
        try {
            for (var unpathedErrors_1 = __values(unpathedErrors), unpathedErrors_1_1 = unpathedErrors_1.next(); !unpathedErrors_1_1.done; unpathedErrors_1_1 = unpathedErrors_1.next()) {
                var error = unpathedErrors_1_1.value;
                if (!reportedErrors.has(error)) {
                    unreportedErrors.push(error);
                    reportedErrors.set(error, true);
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (unpathedErrors_1_1 && !unpathedErrors_1_1.done && (_a = unpathedErrors_1.return)) _a.call(unpathedErrors_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        if (unreportedErrors.length) {
            if (unreportedErrors.length === 1) {
                return unreportedErrors[0];
            }
            var combinedError = new AggregateError(unreportedErrors);
            // We cast path as any for GraphQL.js 14 compat
            // locatedError path argument must be defined, but it is just forwarded to a constructor that allows a undefined value
            // https://github.com/graphql/graphql-js/blob/b4bff0ba9c15c9d7245dd68556e754c41f263289/src/error/locatedError.js#L25
            // https://github.com/graphql/graphql-js/blob/b4bff0ba9c15c9d7245dd68556e754c41f263289/src/error/GraphQLError.js#L19
            return locatedError(combinedError, undefined, unreportedErrors[0].path);
        }
    }
    return null;
}
function getReturnType(info) {
    if (info == null) {
        throw new Error("Return type cannot be inferred without a source schema.");
    }
    return info.returnType;
}
