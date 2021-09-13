import { GraphQLInputObjectType, GraphQLInterfaceType, GraphQLObjectType, } from 'graphql';
import { MapperKind } from './Interfaces';
import { mapSchema } from './mapSchema';
export function filterSchema(_a) {
    var _b;
    var schema = _a.schema, _c = _a.typeFilter, typeFilter = _c === void 0 ? function () { return true; } : _c, _d = _a.fieldFilter, fieldFilter = _d === void 0 ? undefined : _d, _e = _a.rootFieldFilter, rootFieldFilter = _e === void 0 ? undefined : _e, _f = _a.objectFieldFilter, objectFieldFilter = _f === void 0 ? undefined : _f, _g = _a.interfaceFieldFilter, interfaceFieldFilter = _g === void 0 ? undefined : _g, _h = _a.inputObjectFieldFilter, inputObjectFieldFilter = _h === void 0 ? undefined : _h, _j = _a.argumentFilter, argumentFilter = _j === void 0 ? undefined : _j;
    var filteredSchema = mapSchema(schema, (_b = {},
        _b[MapperKind.QUERY] = function (type) { return filterRootFields(type, 'Query', rootFieldFilter, argumentFilter); },
        _b[MapperKind.MUTATION] = function (type) {
            return filterRootFields(type, 'Mutation', rootFieldFilter, argumentFilter);
        },
        _b[MapperKind.SUBSCRIPTION] = function (type) {
            return filterRootFields(type, 'Subscription', rootFieldFilter, argumentFilter);
        },
        _b[MapperKind.OBJECT_TYPE] = function (type) {
            return typeFilter(type.name, type)
                ? filterElementFields(GraphQLObjectType, type, objectFieldFilter || fieldFilter, argumentFilter)
                : null;
        },
        _b[MapperKind.INTERFACE_TYPE] = function (type) {
            return typeFilter(type.name, type)
                ? filterElementFields(GraphQLInterfaceType, type, interfaceFieldFilter || fieldFilter, argumentFilter)
                : null;
        },
        _b[MapperKind.INPUT_OBJECT_TYPE] = function (type) {
            return typeFilter(type.name, type)
                ? filterElementFields(GraphQLInputObjectType, type, inputObjectFieldFilter || fieldFilter)
                : null;
        },
        _b[MapperKind.UNION_TYPE] = function (type) { return (typeFilter(type.name, type) ? undefined : null); },
        _b[MapperKind.ENUM_TYPE] = function (type) { return (typeFilter(type.name, type) ? undefined : null); },
        _b[MapperKind.SCALAR_TYPE] = function (type) { return (typeFilter(type.name, type) ? undefined : null); },
        _b));
    return filteredSchema;
}
function filterRootFields(type, operation, rootFieldFilter, argumentFilter) {
    if (rootFieldFilter || argumentFilter) {
        var config = type.toConfig();
        for (var fieldName in config.fields) {
            var field = config.fields[fieldName];
            if (rootFieldFilter && !rootFieldFilter(operation, fieldName, config.fields[fieldName])) {
                delete config.fields[fieldName];
            }
            else if (argumentFilter && field.args) {
                for (var argName in field.args) {
                    if (!argumentFilter(operation, fieldName, argName, field.args[argName])) {
                        delete field.args[argName];
                    }
                }
            }
        }
        return new GraphQLObjectType(config);
    }
    return type;
}
function filterElementFields(ElementConstructor, type, fieldFilter, argumentFilter) {
    if (fieldFilter || argumentFilter) {
        var config = type.toConfig();
        for (var fieldName in config.fields) {
            var field = config.fields[fieldName];
            if (fieldFilter && !fieldFilter(type.name, fieldName, config.fields[fieldName])) {
                delete config.fields[fieldName];
            }
            else if (argumentFilter && 'args' in field) {
                for (var argName in field.args) {
                    if (!argumentFilter(type.name, fieldName, argName, field.args[argName])) {
                        delete field.args[argName];
                    }
                }
            }
        }
        return new ElementConstructor(config);
    }
}
