import { __read, __values } from "tslib";
import { getResponseKeyFromInfo, getRootTypeMap } from '@graphql-tools/utils';
import { delegateToSchema, getSubschema, resolveExternalValue, applySchemaTransforms, isExternalObject, getUnpathedErrors, } from '@graphql-tools/delegate';
export function generateProxyingResolvers(subschemaConfig) {
    var e_1, _a;
    var _b;
    var targetSchema = subschemaConfig.schema;
    var createProxyingResolver = (_b = subschemaConfig.createProxyingResolver) !== null && _b !== void 0 ? _b : defaultCreateProxyingResolver;
    var transformedSchema = applySchemaTransforms(targetSchema, subschemaConfig);
    var rootTypeMap = getRootTypeMap(targetSchema);
    var resolvers = {};
    try {
        for (var _c = __values(rootTypeMap.entries()), _d = _c.next(); !_d.done; _d = _c.next()) {
            var _e = __read(_d.value, 2), operation = _e[0], rootType = _e[1];
            var typeName = rootType.name;
            var fields = rootType.getFields();
            resolvers[typeName] = {};
            for (var fieldName in fields) {
                var proxyingResolver = createProxyingResolver({
                    subschemaConfig: subschemaConfig,
                    transformedSchema: transformedSchema,
                    operation: operation,
                    fieldName: fieldName,
                });
                var finalResolver = createPossiblyNestedProxyingResolver(subschemaConfig, proxyingResolver);
                if (operation === 'subscription') {
                    resolvers[typeName][fieldName] = {
                        subscribe: finalResolver,
                        resolve: identical,
                    };
                }
                else {
                    resolvers[typeName][fieldName] = {
                        resolve: finalResolver,
                    };
                }
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return resolvers;
}
function identical(value) {
    return value;
}
function createPossiblyNestedProxyingResolver(subschemaConfig, proxyingResolver) {
    return function possiblyNestedProxyingResolver(parent, args, context, info) {
        if (parent != null) {
            var responseKey = getResponseKeyFromInfo(info);
            // Check to see if the parent contains a proxied result
            if (isExternalObject(parent)) {
                var unpathedErrors = getUnpathedErrors(parent);
                var subschema = getSubschema(parent, responseKey);
                // If there is a proxied result from this subschema, return it
                // This can happen even for a root field when the root type ia
                // also nested as a field within a different type.
                if (subschemaConfig === subschema && parent[responseKey] !== undefined) {
                    return resolveExternalValue(parent[responseKey], unpathedErrors, subschema, context, info);
                }
            }
        }
        return proxyingResolver(parent, args, context, info);
    };
}
export function defaultCreateProxyingResolver(_a) {
    var subschemaConfig = _a.subschemaConfig, operation = _a.operation, transformedSchema = _a.transformedSchema;
    return function proxyingResolver(_parent, _args, context, info) {
        return delegateToSchema({
            schema: subschemaConfig,
            operation: operation,
            context: context,
            info: info,
            transformedSchema: transformedSchema,
        });
    };
}
