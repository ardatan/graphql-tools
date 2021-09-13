import { __assign, __values } from "tslib";
import { GraphQLDirective, GraphQLEnumType, GraphQLInputObjectType, GraphQLInterfaceType, GraphQLList, GraphQLObjectType, GraphQLNonNull, GraphQLScalarType, GraphQLUnionType, isInterfaceType, isEnumType, isInputObjectType, isListType, isNamedType, isNonNullType, isObjectType, isScalarType, isUnionType, isSpecifiedScalarType, isSpecifiedDirective, } from 'graphql';
import { getBuiltInForStub, isNamedStub } from './stub';
export function rewireTypes(originalTypeMap, directives) {
    var referenceTypeMap = Object.create(null);
    for (var typeName in originalTypeMap) {
        referenceTypeMap[typeName] = originalTypeMap[typeName];
    }
    var newTypeMap = Object.create(null);
    for (var typeName in referenceTypeMap) {
        var namedType = referenceTypeMap[typeName];
        if (namedType == null || typeName.startsWith('__')) {
            continue;
        }
        var newName = namedType.name;
        if (newName.startsWith('__')) {
            continue;
        }
        if (newTypeMap[newName] != null) {
            throw new Error("Duplicate schema type name " + newName);
        }
        newTypeMap[newName] = namedType;
    }
    for (var typeName in newTypeMap) {
        newTypeMap[typeName] = rewireNamedType(newTypeMap[typeName]);
    }
    var newDirectives = directives.map(function (directive) { return rewireDirective(directive); });
    return {
        typeMap: newTypeMap,
        directives: newDirectives,
    };
    function rewireDirective(directive) {
        if (isSpecifiedDirective(directive)) {
            return directive;
        }
        var directiveConfig = directive.toConfig();
        directiveConfig.args = rewireArgs(directiveConfig.args);
        return new GraphQLDirective(directiveConfig);
    }
    function rewireArgs(args) {
        var rewiredArgs = {};
        for (var argName in args) {
            var arg = args[argName];
            var rewiredArgType = rewireType(arg.type);
            if (rewiredArgType != null) {
                arg.type = rewiredArgType;
                rewiredArgs[argName] = arg;
            }
        }
        return rewiredArgs;
    }
    function rewireNamedType(type) {
        if (isObjectType(type)) {
            var config_1 = type.toConfig();
            var newConfig = __assign(__assign({}, config_1), { fields: function () { return rewireFields(config_1.fields); }, interfaces: function () { return rewireNamedTypes(config_1.interfaces); } });
            return new GraphQLObjectType(newConfig);
        }
        else if (isInterfaceType(type)) {
            var config_2 = type.toConfig();
            var newConfig = __assign(__assign({}, config_2), { fields: function () { return rewireFields(config_2.fields); } });
            if ('interfaces' in newConfig) {
                newConfig.interfaces = function () {
                    return rewireNamedTypes(config_2.interfaces);
                };
            }
            return new GraphQLInterfaceType(newConfig);
        }
        else if (isUnionType(type)) {
            var config_3 = type.toConfig();
            var newConfig = __assign(__assign({}, config_3), { types: function () { return rewireNamedTypes(config_3.types); } });
            return new GraphQLUnionType(newConfig);
        }
        else if (isInputObjectType(type)) {
            var config_4 = type.toConfig();
            var newConfig = __assign(__assign({}, config_4), { fields: function () { return rewireInputFields(config_4.fields); } });
            return new GraphQLInputObjectType(newConfig);
        }
        else if (isEnumType(type)) {
            var enumConfig = type.toConfig();
            return new GraphQLEnumType(enumConfig);
        }
        else if (isScalarType(type)) {
            if (isSpecifiedScalarType(type)) {
                return type;
            }
            var scalarConfig = type.toConfig();
            return new GraphQLScalarType(scalarConfig);
        }
        throw new Error("Unexpected schema type: " + type);
    }
    function rewireFields(fields) {
        var rewiredFields = {};
        for (var fieldName in fields) {
            var field = fields[fieldName];
            var rewiredFieldType = rewireType(field.type);
            if (rewiredFieldType != null && field.args) {
                field.type = rewiredFieldType;
                field.args = rewireArgs(field.args);
                rewiredFields[fieldName] = field;
            }
        }
        return rewiredFields;
    }
    function rewireInputFields(fields) {
        var rewiredFields = {};
        for (var fieldName in fields) {
            var field = fields[fieldName];
            var rewiredFieldType = rewireType(field.type);
            if (rewiredFieldType != null) {
                field.type = rewiredFieldType;
                rewiredFields[fieldName] = field;
            }
        }
        return rewiredFields;
    }
    function rewireNamedTypes(namedTypes) {
        var e_1, _a;
        var rewiredTypes = [];
        try {
            for (var namedTypes_1 = __values(namedTypes), namedTypes_1_1 = namedTypes_1.next(); !namedTypes_1_1.done; namedTypes_1_1 = namedTypes_1.next()) {
                var namedType = namedTypes_1_1.value;
                var rewiredType = rewireType(namedType);
                if (rewiredType != null) {
                    rewiredTypes.push(rewiredType);
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (namedTypes_1_1 && !namedTypes_1_1.done && (_a = namedTypes_1.return)) _a.call(namedTypes_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return rewiredTypes;
    }
    function rewireType(type) {
        if (isListType(type)) {
            var rewiredType = rewireType(type.ofType);
            return rewiredType != null ? new GraphQLList(rewiredType) : null;
        }
        else if (isNonNullType(type)) {
            var rewiredType = rewireType(type.ofType);
            return rewiredType != null ? new GraphQLNonNull(rewiredType) : null;
        }
        else if (isNamedType(type)) {
            var rewiredType = referenceTypeMap[type.name];
            if (rewiredType === undefined) {
                rewiredType = isNamedStub(type) ? getBuiltInForStub(type) : rewireNamedType(type);
                newTypeMap[rewiredType.name] = referenceTypeMap[type.name] = rewiredType;
            }
            return rewiredType != null ? newTypeMap[rewiredType.name] : null;
        }
        return null;
    }
}
