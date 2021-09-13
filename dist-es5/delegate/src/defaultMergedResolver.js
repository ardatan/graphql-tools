import { defaultFieldResolver } from 'graphql';
import { getResponseKeyFromInfo } from '@graphql-tools/utils';
import { resolveExternalValue } from './resolveExternalValue';
import { getSubschema, getUnpathedErrors, isExternalObject } from './mergeFields';
/**
 * Resolver that knows how to:
 * a) handle aliases for proxied schemas
 * b) handle errors from proxied schemas
 * c) handle external to internal enum conversion
 */
export function defaultMergedResolver(parent, args, context, info) {
    if (!parent) {
        return null;
    }
    var responseKey = getResponseKeyFromInfo(info);
    // check to see if parent is not a proxied result, i.e. if parent resolver was manually overwritten
    // See https://github.com/ardatan/graphql-tools/issues/967
    if (!isExternalObject(parent)) {
        return defaultFieldResolver(parent, args, context, info);
    }
    var data = parent[responseKey];
    var unpathedErrors = getUnpathedErrors(parent);
    var subschema = getSubschema(parent, responseKey);
    return resolveExternalValue(data, unpathedErrors, subschema, context, info);
}
