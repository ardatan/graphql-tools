import { __assign, __read, __spreadArray, __values } from "tslib";
import { GraphQLObjectType, GraphQLSchema, isInterfaceType, isEnumType, isObjectType, isScalarType, isUnionType, isInputObjectType, GraphQLInputObjectType, GraphQLInterfaceType, isLeafType, isListType, isNonNullType, isNamedType, GraphQLList, GraphQLNonNull, GraphQLEnumType, Kind, } from 'graphql';
import { getObjectTypeFromTypeMap } from './getObjectTypeFromTypeMap';
import { MapperKind, } from './Interfaces';
import { rewireTypes } from './rewire';
import { serializeInputValue, parseInputValue } from './transformInputValue';
export function mapSchema(schema, schemaMapper) {
    if (schemaMapper === void 0) { schemaMapper = {}; }
    var newTypeMap = mapArguments(mapFields(mapTypes(mapDefaultValues(mapEnumValues(mapTypes(mapDefaultValues(schema.getTypeMap(), schema, serializeInputValue), schema, schemaMapper, function (type) {
        return isLeafType(type);
    }), schema, schemaMapper), schema, parseInputValue), schema, schemaMapper, function (type) { return !isLeafType(type); }), schema, schemaMapper), schema, schemaMapper);
    var originalDirectives = schema.getDirectives();
    var newDirectives = mapDirectives(originalDirectives, schema, schemaMapper);
    var _a = rewireTypes(newTypeMap, newDirectives), typeMap = _a.typeMap, directives = _a.directives;
    return new GraphQLSchema(__assign(__assign({}, schema.toConfig()), { query: getObjectTypeFromTypeMap(typeMap, getObjectTypeFromTypeMap(newTypeMap, schema.getQueryType())), mutation: getObjectTypeFromTypeMap(typeMap, getObjectTypeFromTypeMap(newTypeMap, schema.getMutationType())), subscription: getObjectTypeFromTypeMap(typeMap, getObjectTypeFromTypeMap(newTypeMap, schema.getSubscriptionType())), types: Object.values(typeMap), directives: directives }));
}
function mapTypes(originalTypeMap, schema, schemaMapper, testFn) {
    if (testFn === void 0) { testFn = function () { return true; }; }
    var newTypeMap = {};
    for (var typeName in originalTypeMap) {
        if (!typeName.startsWith('__')) {
            var originalType = originalTypeMap[typeName];
            if (originalType == null || !testFn(originalType)) {
                newTypeMap[typeName] = originalType;
                continue;
            }
            var typeMapper = getTypeMapper(schema, schemaMapper, typeName);
            if (typeMapper == null) {
                newTypeMap[typeName] = originalType;
                continue;
            }
            var maybeNewType = typeMapper(originalType, schema);
            if (maybeNewType === undefined) {
                newTypeMap[typeName] = originalType;
                continue;
            }
            newTypeMap[typeName] = maybeNewType;
        }
    }
    return newTypeMap;
}
function mapEnumValues(originalTypeMap, schema, schemaMapper) {
    var _a;
    var enumValueMapper = getEnumValueMapper(schemaMapper);
    if (!enumValueMapper) {
        return originalTypeMap;
    }
    return mapTypes(originalTypeMap, schema, (_a = {},
        _a[MapperKind.ENUM_TYPE] = function (type) {
            var config = type.toConfig();
            var originalEnumValueConfigMap = config.values;
            var newEnumValueConfigMap = {};
            for (var externalValue in originalEnumValueConfigMap) {
                var originalEnumValueConfig = originalEnumValueConfigMap[externalValue];
                var mappedEnumValue = enumValueMapper(originalEnumValueConfig, type.name, schema, externalValue);
                if (mappedEnumValue === undefined) {
                    newEnumValueConfigMap[externalValue] = originalEnumValueConfig;
                }
                else if (Array.isArray(mappedEnumValue)) {
                    var _a = __read(mappedEnumValue, 2), newExternalValue = _a[0], newEnumValueConfig = _a[1];
                    newEnumValueConfigMap[newExternalValue] =
                        newEnumValueConfig === undefined ? originalEnumValueConfig : newEnumValueConfig;
                }
                else if (mappedEnumValue !== null) {
                    newEnumValueConfigMap[externalValue] = mappedEnumValue;
                }
            }
            return correctASTNodes(new GraphQLEnumType(__assign(__assign({}, config), { values: newEnumValueConfigMap })));
        },
        _a), function (type) { return isEnumType(type); });
}
function mapDefaultValues(originalTypeMap, schema, fn) {
    var _a, _b;
    var newTypeMap = mapArguments(originalTypeMap, schema, (_a = {},
        _a[MapperKind.ARGUMENT] = function (argumentConfig) {
            if (argumentConfig.defaultValue === undefined) {
                return argumentConfig;
            }
            var maybeNewType = getNewType(originalTypeMap, argumentConfig.type);
            if (maybeNewType != null) {
                return __assign(__assign({}, argumentConfig), { defaultValue: fn(maybeNewType, argumentConfig.defaultValue) });
            }
        },
        _a));
    return mapFields(newTypeMap, schema, (_b = {},
        _b[MapperKind.INPUT_OBJECT_FIELD] = function (inputFieldConfig) {
            if (inputFieldConfig.defaultValue === undefined) {
                return inputFieldConfig;
            }
            var maybeNewType = getNewType(newTypeMap, inputFieldConfig.type);
            if (maybeNewType != null) {
                return __assign(__assign({}, inputFieldConfig), { defaultValue: fn(maybeNewType, inputFieldConfig.defaultValue) });
            }
        },
        _b));
}
function getNewType(newTypeMap, type) {
    if (isListType(type)) {
        var newType = getNewType(newTypeMap, type.ofType);
        return newType != null ? new GraphQLList(newType) : null;
    }
    else if (isNonNullType(type)) {
        var newType = getNewType(newTypeMap, type.ofType);
        return newType != null ? new GraphQLNonNull(newType) : null;
    }
    else if (isNamedType(type)) {
        var newType = newTypeMap[type.name];
        return newType != null ? newType : null;
    }
    return null;
}
function mapFields(originalTypeMap, schema, schemaMapper) {
    var newTypeMap = {};
    for (var typeName in originalTypeMap) {
        if (!typeName.startsWith('__')) {
            var originalType = originalTypeMap[typeName];
            if (!isObjectType(originalType) && !isInterfaceType(originalType) && !isInputObjectType(originalType)) {
                newTypeMap[typeName] = originalType;
                continue;
            }
            var fieldMapper = getFieldMapper(schema, schemaMapper, typeName);
            if (fieldMapper == null) {
                newTypeMap[typeName] = originalType;
                continue;
            }
            var config = originalType.toConfig();
            var originalFieldConfigMap = config.fields;
            var newFieldConfigMap = {};
            for (var fieldName in originalFieldConfigMap) {
                var originalFieldConfig = originalFieldConfigMap[fieldName];
                var mappedField = fieldMapper(originalFieldConfig, fieldName, typeName, schema);
                if (mappedField === undefined) {
                    newFieldConfigMap[fieldName] = originalFieldConfig;
                }
                else if (Array.isArray(mappedField)) {
                    var _a = __read(mappedField, 2), newFieldName = _a[0], newFieldConfig = _a[1];
                    if (newFieldConfig.astNode != null) {
                        newFieldConfig.astNode = __assign(__assign({}, newFieldConfig.astNode), { name: __assign(__assign({}, newFieldConfig.astNode.name), { value: newFieldName }) });
                    }
                    newFieldConfigMap[newFieldName] = newFieldConfig === undefined ? originalFieldConfig : newFieldConfig;
                }
                else if (mappedField !== null) {
                    newFieldConfigMap[fieldName] = mappedField;
                }
            }
            if (isObjectType(originalType)) {
                newTypeMap[typeName] = correctASTNodes(new GraphQLObjectType(__assign(__assign({}, config), { fields: newFieldConfigMap })));
            }
            else if (isInterfaceType(originalType)) {
                newTypeMap[typeName] = correctASTNodes(new GraphQLInterfaceType(__assign(__assign({}, config), { fields: newFieldConfigMap })));
            }
            else {
                newTypeMap[typeName] = correctASTNodes(new GraphQLInputObjectType(__assign(__assign({}, config), { fields: newFieldConfigMap })));
            }
        }
    }
    return newTypeMap;
}
function mapArguments(originalTypeMap, schema, schemaMapper) {
    var e_1, _a;
    var newTypeMap = {};
    for (var typeName in originalTypeMap) {
        if (!typeName.startsWith('__')) {
            var originalType = originalTypeMap[typeName];
            if (!isObjectType(originalType) && !isInterfaceType(originalType)) {
                newTypeMap[typeName] = originalType;
                continue;
            }
            var argumentMapper = getArgumentMapper(schemaMapper);
            if (argumentMapper == null) {
                newTypeMap[typeName] = originalType;
                continue;
            }
            var config = originalType.toConfig();
            var originalFieldConfigMap = config.fields;
            var newFieldConfigMap = {};
            for (var fieldName in originalFieldConfigMap) {
                var originalFieldConfig = originalFieldConfigMap[fieldName];
                var originalArgumentConfigMap = originalFieldConfig.args;
                if (originalArgumentConfigMap == null) {
                    newFieldConfigMap[fieldName] = originalFieldConfig;
                    continue;
                }
                var argumentNames = Object.keys(originalArgumentConfigMap);
                if (!argumentNames.length) {
                    newFieldConfigMap[fieldName] = originalFieldConfig;
                    continue;
                }
                var newArgumentConfigMap = {};
                try {
                    for (var argumentNames_1 = (e_1 = void 0, __values(argumentNames)), argumentNames_1_1 = argumentNames_1.next(); !argumentNames_1_1.done; argumentNames_1_1 = argumentNames_1.next()) {
                        var argumentName = argumentNames_1_1.value;
                        var originalArgumentConfig = originalArgumentConfigMap[argumentName];
                        var mappedArgument = argumentMapper(originalArgumentConfig, fieldName, typeName, schema);
                        if (mappedArgument === undefined) {
                            newArgumentConfigMap[argumentName] = originalArgumentConfig;
                        }
                        else if (Array.isArray(mappedArgument)) {
                            var _b = __read(mappedArgument, 2), newArgumentName = _b[0], newArgumentConfig = _b[1];
                            newArgumentConfigMap[newArgumentName] = newArgumentConfig;
                        }
                        else if (mappedArgument !== null) {
                            newArgumentConfigMap[argumentName] = mappedArgument;
                        }
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (argumentNames_1_1 && !argumentNames_1_1.done && (_a = argumentNames_1.return)) _a.call(argumentNames_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
                newFieldConfigMap[fieldName] = __assign(__assign({}, originalFieldConfig), { args: newArgumentConfigMap });
            }
            if (isObjectType(originalType)) {
                newTypeMap[typeName] = new GraphQLObjectType(__assign(__assign({}, config), { fields: newFieldConfigMap }));
            }
            else if (isInterfaceType(originalType)) {
                newTypeMap[typeName] = new GraphQLInterfaceType(__assign(__assign({}, config), { fields: newFieldConfigMap }));
            }
            else {
                newTypeMap[typeName] = new GraphQLInputObjectType(__assign(__assign({}, config), { fields: newFieldConfigMap }));
            }
        }
    }
    return newTypeMap;
}
function mapDirectives(originalDirectives, schema, schemaMapper) {
    var e_2, _a;
    var directiveMapper = getDirectiveMapper(schemaMapper);
    if (directiveMapper == null) {
        return originalDirectives.slice();
    }
    var newDirectives = [];
    try {
        for (var originalDirectives_1 = __values(originalDirectives), originalDirectives_1_1 = originalDirectives_1.next(); !originalDirectives_1_1.done; originalDirectives_1_1 = originalDirectives_1.next()) {
            var directive = originalDirectives_1_1.value;
            var mappedDirective = directiveMapper(directive, schema);
            if (mappedDirective === undefined) {
                newDirectives.push(directive);
            }
            else if (mappedDirective !== null) {
                newDirectives.push(mappedDirective);
            }
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (originalDirectives_1_1 && !originalDirectives_1_1.done && (_a = originalDirectives_1.return)) _a.call(originalDirectives_1);
        }
        finally { if (e_2) throw e_2.error; }
    }
    return newDirectives;
}
function getTypeSpecifiers(schema, typeName) {
    var _a, _b, _c;
    var type = schema.getType(typeName);
    var specifiers = [MapperKind.TYPE];
    if (isObjectType(type)) {
        specifiers.push(MapperKind.COMPOSITE_TYPE, MapperKind.OBJECT_TYPE);
        if (typeName === ((_a = schema.getQueryType()) === null || _a === void 0 ? void 0 : _a.name)) {
            specifiers.push(MapperKind.ROOT_OBJECT, MapperKind.QUERY);
        }
        else if (typeName === ((_b = schema.getMutationType()) === null || _b === void 0 ? void 0 : _b.name)) {
            specifiers.push(MapperKind.ROOT_OBJECT, MapperKind.MUTATION);
        }
        else if (typeName === ((_c = schema.getSubscriptionType()) === null || _c === void 0 ? void 0 : _c.name)) {
            specifiers.push(MapperKind.ROOT_OBJECT, MapperKind.SUBSCRIPTION);
        }
    }
    else if (isInputObjectType(type)) {
        specifiers.push(MapperKind.INPUT_OBJECT_TYPE);
    }
    else if (isInterfaceType(type)) {
        specifiers.push(MapperKind.COMPOSITE_TYPE, MapperKind.ABSTRACT_TYPE, MapperKind.INTERFACE_TYPE);
    }
    else if (isUnionType(type)) {
        specifiers.push(MapperKind.COMPOSITE_TYPE, MapperKind.ABSTRACT_TYPE, MapperKind.UNION_TYPE);
    }
    else if (isEnumType(type)) {
        specifiers.push(MapperKind.ENUM_TYPE);
    }
    else if (isScalarType(type)) {
        specifiers.push(MapperKind.SCALAR_TYPE);
    }
    return specifiers;
}
function getTypeMapper(schema, schemaMapper, typeName) {
    var specifiers = getTypeSpecifiers(schema, typeName);
    var typeMapper;
    var stack = __spreadArray([], __read(specifiers), false);
    while (!typeMapper && stack.length > 0) {
        // It is safe to use the ! operator here as we check the length.
        var next = stack.pop();
        typeMapper = schemaMapper[next];
    }
    return typeMapper != null ? typeMapper : null;
}
function getFieldSpecifiers(schema, typeName) {
    var _a, _b, _c;
    var type = schema.getType(typeName);
    var specifiers = [MapperKind.FIELD];
    if (isObjectType(type)) {
        specifiers.push(MapperKind.COMPOSITE_FIELD, MapperKind.OBJECT_FIELD);
        if (typeName === ((_a = schema.getQueryType()) === null || _a === void 0 ? void 0 : _a.name)) {
            specifiers.push(MapperKind.ROOT_FIELD, MapperKind.QUERY_ROOT_FIELD);
        }
        else if (typeName === ((_b = schema.getMutationType()) === null || _b === void 0 ? void 0 : _b.name)) {
            specifiers.push(MapperKind.ROOT_FIELD, MapperKind.MUTATION_ROOT_FIELD);
        }
        else if (typeName === ((_c = schema.getSubscriptionType()) === null || _c === void 0 ? void 0 : _c.name)) {
            specifiers.push(MapperKind.ROOT_FIELD, MapperKind.SUBSCRIPTION_ROOT_FIELD);
        }
    }
    else if (isInterfaceType(type)) {
        specifiers.push(MapperKind.COMPOSITE_FIELD, MapperKind.INTERFACE_FIELD);
    }
    else if (isInputObjectType(type)) {
        specifiers.push(MapperKind.INPUT_OBJECT_FIELD);
    }
    return specifiers;
}
function getFieldMapper(schema, schemaMapper, typeName) {
    var specifiers = getFieldSpecifiers(schema, typeName);
    var fieldMapper;
    var stack = __spreadArray([], __read(specifiers), false);
    while (!fieldMapper && stack.length > 0) {
        // It is safe to use the ! operator here as we check the length.
        var next = stack.pop();
        // TODO: fix this as unknown cast
        fieldMapper = schemaMapper[next];
    }
    return fieldMapper !== null && fieldMapper !== void 0 ? fieldMapper : null;
}
function getArgumentMapper(schemaMapper) {
    var argumentMapper = schemaMapper[MapperKind.ARGUMENT];
    return argumentMapper != null ? argumentMapper : null;
}
function getDirectiveMapper(schemaMapper) {
    var directiveMapper = schemaMapper[MapperKind.DIRECTIVE];
    return directiveMapper != null ? directiveMapper : null;
}
function getEnumValueMapper(schemaMapper) {
    var enumValueMapper = schemaMapper[MapperKind.ENUM_VALUE];
    return enumValueMapper != null ? enumValueMapper : null;
}
export function correctASTNodes(type) {
    if (isObjectType(type)) {
        var config = type.toConfig();
        if (config.astNode != null) {
            var fields = [];
            for (var fieldName in config.fields) {
                var fieldConfig = config.fields[fieldName];
                if (fieldConfig.astNode != null) {
                    fields.push(fieldConfig.astNode);
                }
            }
            config.astNode = __assign(__assign({}, config.astNode), { kind: Kind.OBJECT_TYPE_DEFINITION, fields: fields });
        }
        if (config.extensionASTNodes != null) {
            config.extensionASTNodes = config.extensionASTNodes.map(function (node) { return (__assign(__assign({}, node), { kind: Kind.OBJECT_TYPE_EXTENSION, fields: undefined })); });
        }
        return new GraphQLObjectType(config);
    }
    else if (isInterfaceType(type)) {
        var config = type.toConfig();
        if (config.astNode != null) {
            var fields = [];
            for (var fieldName in config.fields) {
                var fieldConfig = config.fields[fieldName];
                if (fieldConfig.astNode != null) {
                    fields.push(fieldConfig.astNode);
                }
            }
            config.astNode = __assign(__assign({}, config.astNode), { kind: Kind.INTERFACE_TYPE_DEFINITION, fields: fields });
        }
        if (config.extensionASTNodes != null) {
            config.extensionASTNodes = config.extensionASTNodes.map(function (node) { return (__assign(__assign({}, node), { kind: Kind.INTERFACE_TYPE_EXTENSION, fields: undefined })); });
        }
        return new GraphQLInterfaceType(config);
    }
    else if (isInputObjectType(type)) {
        var config = type.toConfig();
        if (config.astNode != null) {
            var fields = [];
            for (var fieldName in config.fields) {
                var fieldConfig = config.fields[fieldName];
                if (fieldConfig.astNode != null) {
                    fields.push(fieldConfig.astNode);
                }
            }
            config.astNode = __assign(__assign({}, config.astNode), { kind: Kind.INPUT_OBJECT_TYPE_DEFINITION, fields: fields });
        }
        if (config.extensionASTNodes != null) {
            config.extensionASTNodes = config.extensionASTNodes.map(function (node) { return (__assign(__assign({}, node), { kind: Kind.INPUT_OBJECT_TYPE_EXTENSION, fields: undefined })); });
        }
        return new GraphQLInputObjectType(config);
    }
    else if (isEnumType(type)) {
        var config = type.toConfig();
        if (config.astNode != null) {
            var values = [];
            for (var enumKey in config.values) {
                var enumValueConfig = config.values[enumKey];
                if (enumValueConfig.astNode != null) {
                    values.push(enumValueConfig.astNode);
                }
            }
            config.astNode = __assign(__assign({}, config.astNode), { values: values });
        }
        if (config.extensionASTNodes != null) {
            config.extensionASTNodes = config.extensionASTNodes.map(function (node) { return (__assign(__assign({}, node), { values: undefined })); });
        }
        return new GraphQLEnumType(config);
    }
    else {
        return type;
    }
}
