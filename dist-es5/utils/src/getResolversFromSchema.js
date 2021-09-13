import { __values } from "tslib";
import { GraphQLScalarType, isScalarType, isEnumType, isInterfaceType, isUnionType, isObjectType, isSpecifiedScalarType, } from 'graphql';
export function getResolversFromSchema(schema) {
    var e_1, _a;
    var _b, _c;
    var resolvers = Object.create(null);
    var typeMap = schema.getTypeMap();
    for (var typeName in typeMap) {
        if (!typeName.startsWith('__')) {
            var type = typeMap[typeName];
            if (isScalarType(type)) {
                if (!isSpecifiedScalarType(type)) {
                    var config = type.toConfig();
                    delete config.astNode; // avoid AST duplication elsewhere
                    resolvers[typeName] = new GraphQLScalarType(config);
                }
            }
            else if (isEnumType(type)) {
                resolvers[typeName] = {};
                var values = type.getValues();
                try {
                    for (var values_1 = (e_1 = void 0, __values(values)), values_1_1 = values_1.next(); !values_1_1.done; values_1_1 = values_1.next()) {
                        var value = values_1_1.value;
                        resolvers[typeName][value.name] = value.value;
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (values_1_1 && !values_1_1.done && (_a = values_1.return)) _a.call(values_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            }
            else if (isInterfaceType(type)) {
                if (type.resolveType != null) {
                    resolvers[typeName] = {
                        __resolveType: type.resolveType,
                    };
                }
            }
            else if (isUnionType(type)) {
                if (type.resolveType != null) {
                    resolvers[typeName] = {
                        __resolveType: type.resolveType,
                    };
                }
            }
            else if (isObjectType(type)) {
                resolvers[typeName] = {};
                if (type.isTypeOf != null) {
                    resolvers[typeName].__isTypeOf = type.isTypeOf;
                }
                var fields = type.getFields();
                for (var fieldName in fields) {
                    var field = fields[fieldName];
                    if (field.subscribe != null) {
                        resolvers[typeName][fieldName] = resolvers[typeName][fieldName] || {};
                        resolvers[typeName][fieldName].subscribe = field.subscribe;
                    }
                    if (field.resolve != null &&
                        ((_b = field.resolve) === null || _b === void 0 ? void 0 : _b.name) !== 'defaultFieldResolver' &&
                        ((_c = field.resolve) === null || _c === void 0 ? void 0 : _c.name) !== 'defaultMergedResolver') {
                        resolvers[typeName][fieldName] = resolvers[typeName][fieldName] || {};
                        resolvers[typeName][fieldName].resolve = field.resolve;
                    }
                }
            }
        }
    }
    return resolvers;
}
