import { __assign } from "tslib";
import { GraphQLObjectType } from 'graphql';
import { MapperKind } from './Interfaces';
import { mapSchema, correctASTNodes } from './mapSchema';
import { addTypes } from './addTypes';
export function appendObjectFields(schema, typeName, additionalFields) {
    var _a;
    if (schema.getType(typeName) == null) {
        return addTypes(schema, [
            new GraphQLObjectType({
                name: typeName,
                fields: additionalFields,
            }),
        ]);
    }
    return mapSchema(schema, (_a = {},
        _a[MapperKind.OBJECT_TYPE] = function (type) {
            if (type.name === typeName) {
                var config = type.toConfig();
                var originalFieldConfigMap = config.fields;
                var newFieldConfigMap = {};
                for (var fieldName in originalFieldConfigMap) {
                    newFieldConfigMap[fieldName] = originalFieldConfigMap[fieldName];
                }
                for (var fieldName in additionalFields) {
                    newFieldConfigMap[fieldName] = additionalFields[fieldName];
                }
                return correctASTNodes(new GraphQLObjectType(__assign(__assign({}, config), { fields: newFieldConfigMap })));
            }
        },
        _a));
}
export function removeObjectFields(schema, typeName, testFn) {
    var _a;
    var removedFields = {};
    var newSchema = mapSchema(schema, (_a = {},
        _a[MapperKind.OBJECT_TYPE] = function (type) {
            if (type.name === typeName) {
                var config = type.toConfig();
                var originalFieldConfigMap = config.fields;
                var newFieldConfigMap = {};
                for (var fieldName in originalFieldConfigMap) {
                    var originalFieldConfig = originalFieldConfigMap[fieldName];
                    if (testFn(fieldName, originalFieldConfig)) {
                        removedFields[fieldName] = originalFieldConfig;
                    }
                    else {
                        newFieldConfigMap[fieldName] = originalFieldConfig;
                    }
                }
                return correctASTNodes(new GraphQLObjectType(__assign(__assign({}, config), { fields: newFieldConfigMap })));
            }
        },
        _a));
    return [newSchema, removedFields];
}
export function selectObjectFields(schema, typeName, testFn) {
    var _a;
    var selectedFields = {};
    mapSchema(schema, (_a = {},
        _a[MapperKind.OBJECT_TYPE] = function (type) {
            if (type.name === typeName) {
                var config = type.toConfig();
                var originalFieldConfigMap = config.fields;
                for (var fieldName in originalFieldConfigMap) {
                    var originalFieldConfig = originalFieldConfigMap[fieldName];
                    if (testFn(fieldName, originalFieldConfig)) {
                        selectedFields[fieldName] = originalFieldConfig;
                    }
                }
            }
            return undefined;
        },
        _a));
    return selectedFields;
}
export function modifyObjectFields(schema, typeName, testFn, newFields) {
    var _a;
    var removedFields = {};
    var newSchema = mapSchema(schema, (_a = {},
        _a[MapperKind.OBJECT_TYPE] = function (type) {
            if (type.name === typeName) {
                var config = type.toConfig();
                var originalFieldConfigMap = config.fields;
                var newFieldConfigMap = {};
                for (var fieldName in originalFieldConfigMap) {
                    var originalFieldConfig = originalFieldConfigMap[fieldName];
                    if (testFn(fieldName, originalFieldConfig)) {
                        removedFields[fieldName] = originalFieldConfig;
                    }
                    else {
                        newFieldConfigMap[fieldName] = originalFieldConfig;
                    }
                }
                for (var fieldName in newFields) {
                    var fieldConfig = newFields[fieldName];
                    newFieldConfigMap[fieldName] = fieldConfig;
                }
                return correctASTNodes(new GraphQLObjectType(__assign(__assign({}, config), { fields: newFieldConfigMap })));
            }
        },
        _a));
    return [newSchema, removedFields];
}
