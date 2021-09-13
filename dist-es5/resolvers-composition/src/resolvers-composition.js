import { __read, __spreadArray, __values } from "tslib";
import { chainFunctions } from './chain-functions';
import _ from 'lodash';
import { asArray } from '@graphql-tools/utils';
import micromatch from 'micromatch';
function isScalarTypeConfiguration(config) {
    return config && 'serialize' in config && 'parseLiteral' in config;
}
function resolveRelevantMappings(resolvers, path) {
    if (!resolvers) {
        return [];
    }
    var _a = __read(path.split('.'), 2), typeNameOrGlob = _a[0], fieldNameOrGlob = _a[1];
    var isTypeMatch = micromatch.matcher(typeNameOrGlob);
    var fixedFieldGlob = fieldNameOrGlob;
    // convert single value OR `{singleField}` to `singleField` as matching will fail otherwise
    if (fixedFieldGlob.includes('{') && !fixedFieldGlob.includes(',')) {
        fixedFieldGlob = fieldNameOrGlob.replace('{', '').replace('}', '');
    }
    fixedFieldGlob = fixedFieldGlob.replace(', ', ',').trim();
    var isFieldMatch = micromatch.matcher(fixedFieldGlob);
    var mappings = [];
    for (var typeName in resolvers) {
        if (!isTypeMatch(typeName)) {
            continue;
        }
        if (isScalarTypeConfiguration(resolvers[typeName])) {
            continue;
        }
        var fieldMap = resolvers[typeName];
        if (!fieldMap) {
            return [];
        }
        for (var field in fieldMap) {
            if (!isFieldMatch(field)) {
                continue;
            }
            var resolvedPath = typeName + "." + field;
            if (resolvers[typeName] && resolvers[typeName][field]) {
                if (resolvers[typeName][field].subscribe) {
                    mappings.push(resolvedPath + '.subscribe');
                }
                if (resolvers[typeName][field].resolve) {
                    mappings.push(resolvedPath + '.resolve');
                }
                if (typeof resolvers[typeName][field] === 'function') {
                    mappings.push(resolvedPath);
                }
            }
        }
    }
    return mappings;
}
/**
 * Wraps the resolvers object with the resolvers composition objects.
 * Implemented as a simple and basic middleware mechanism.
 *
 * @param resolvers - resolvers object
 * @param mapping - resolvers composition mapping
 * @hidden
 */
export function composeResolvers(resolvers, mapping) {
    var e_1, _a, e_2, _b;
    if (mapping === void 0) { mapping = {}; }
    var mappingResult = {};
    for (var resolverPath in mapping) {
        var resolverPathMapping = mapping[resolverPath];
        if (resolverPathMapping instanceof Array || typeof resolverPathMapping === 'function') {
            var composeFns = resolverPathMapping;
            var relevantFields = resolveRelevantMappings(resolvers, resolverPath);
            try {
                for (var relevantFields_1 = (e_1 = void 0, __values(relevantFields)), relevantFields_1_1 = relevantFields_1.next(); !relevantFields_1_1.done; relevantFields_1_1 = relevantFields_1.next()) {
                    var path = relevantFields_1_1.value;
                    mappingResult[path] = asArray(composeFns);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (relevantFields_1_1 && !relevantFields_1_1.done && (_a = relevantFields_1.return)) _a.call(relevantFields_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
        else if (resolverPathMapping) {
            for (var fieldName in resolverPathMapping) {
                var composeFns = resolverPathMapping[fieldName];
                var relevantFields = resolveRelevantMappings(resolvers, resolverPath + '.' + fieldName);
                try {
                    for (var relevantFields_2 = (e_2 = void 0, __values(relevantFields)), relevantFields_2_1 = relevantFields_2.next(); !relevantFields_2_1.done; relevantFields_2_1 = relevantFields_2.next()) {
                        var path = relevantFields_2_1.value;
                        mappingResult[path] = asArray(composeFns);
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (relevantFields_2_1 && !relevantFields_2_1.done && (_b = relevantFields_2.return)) _b.call(relevantFields_2);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
        }
    }
    var _loop_1 = function (path) {
        var fns = chainFunctions(__spreadArray(__spreadArray([], __read(asArray(mappingResult[path])), false), [function () { return _.get(resolvers, path); }], false));
        _.set(resolvers, path, fns());
    };
    for (var path in mappingResult) {
        _loop_1(path);
    }
    return resolvers;
}
