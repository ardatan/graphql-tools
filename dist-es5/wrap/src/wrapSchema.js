import { __assign } from "tslib";
import { GraphQLObjectType, GraphQLInterfaceType, GraphQLUnionType, } from 'graphql';
import { MapperKind, mapSchema } from '@graphql-tools/utils';
import { defaultMergedResolver, applySchemaTransforms } from '@graphql-tools/delegate';
import { generateProxyingResolvers } from './generateProxyingResolvers';
export function wrapSchema(subschemaConfig) {
    var targetSchema = subschemaConfig.schema;
    var proxyingResolvers = generateProxyingResolvers(subschemaConfig);
    var schema = createWrappingSchema(targetSchema, proxyingResolvers);
    var transformedSchema = applySchemaTransforms(schema, subschemaConfig);
    return applySchemaTransforms(schema, subschemaConfig, transformedSchema);
}
function createWrappingSchema(schema, proxyingResolvers) {
    var _a;
    return mapSchema(schema, (_a = {},
        _a[MapperKind.ROOT_OBJECT] = function (type) {
            var _a;
            var config = type.toConfig();
            var fieldConfigMap = config.fields;
            for (var fieldName in fieldConfigMap) {
                var field = fieldConfigMap[fieldName];
                if (field == null) {
                    continue;
                }
                fieldConfigMap[fieldName] = __assign(__assign({}, field), (_a = proxyingResolvers[type.name]) === null || _a === void 0 ? void 0 : _a[fieldName]);
            }
            return new GraphQLObjectType(config);
        },
        _a[MapperKind.OBJECT_TYPE] = function (type) {
            var config = type.toConfig();
            config.isTypeOf = undefined;
            for (var fieldName in config.fields) {
                var field = config.fields[fieldName];
                if (field == null) {
                    continue;
                }
                field.resolve = defaultMergedResolver;
                field.subscribe = undefined;
            }
            return new GraphQLObjectType(config);
        },
        _a[MapperKind.INTERFACE_TYPE] = function (type) {
            var config = type.toConfig();
            delete config.resolveType;
            return new GraphQLInterfaceType(config);
        },
        _a[MapperKind.UNION_TYPE] = function (type) {
            var config = type.toConfig();
            delete config.resolveType;
            return new GraphQLUnionType(config);
        },
        _a));
}
