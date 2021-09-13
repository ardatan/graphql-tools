import { __assign, __values } from "tslib";
import { typeFromAST, TypeInfo, visit, visitWithTypeInfo, Kind, isInputType, } from 'graphql';
import { MapperKind, mapSchema, transformInputValue } from '@graphql-tools/utils';
var TransformInputObjectFields = /** @class */ (function () {
    function TransformInputObjectFields(inputFieldTransformer, inputFieldNodeTransformer, inputObjectNodeTransformer) {
        this.inputFieldTransformer = inputFieldTransformer;
        this.inputFieldNodeTransformer = inputFieldNodeTransformer;
        this.inputObjectNodeTransformer = inputObjectNodeTransformer;
        this.mapping = {};
    }
    TransformInputObjectFields.prototype._getTransformedSchema = function () {
        var transformedSchema = this.transformedSchema;
        if (transformedSchema === undefined) {
            throw new Error("The TransformInputObjectFields transform's  \"transformRequest\" and \"transformResult\" methods cannot be used without first calling \"transformSchema\".");
        }
        return transformedSchema;
    };
    TransformInputObjectFields.prototype.transformSchema = function (originalWrappingSchema, _subschemaConfig, _transformedSchema) {
        var _a;
        var _this = this;
        this.transformedSchema = mapSchema(originalWrappingSchema, (_a = {},
            _a[MapperKind.INPUT_OBJECT_FIELD] = function (inputFieldConfig, fieldName, typeName) {
                var transformedInputField = _this.inputFieldTransformer(typeName, fieldName, inputFieldConfig);
                if (Array.isArray(transformedInputField)) {
                    var newFieldName = transformedInputField[0];
                    if (newFieldName !== fieldName) {
                        if (!(typeName in _this.mapping)) {
                            _this.mapping[typeName] = {};
                        }
                        _this.mapping[typeName][newFieldName] = fieldName;
                    }
                }
                return transformedInputField;
            },
            _a));
        return this.transformedSchema;
    };
    TransformInputObjectFields.prototype.transformRequest = function (originalRequest, delegationContext, _transformationContext) {
        var e_1, _a, e_2, _b, e_3, _c, e_4, _d;
        var _this = this;
        var _e;
        var variableValues = (_e = originalRequest.variables) !== null && _e !== void 0 ? _e : {};
        var fragments = Object.create(null);
        var operations = [];
        try {
            for (var _f = __values(originalRequest.document.definitions), _g = _f.next(); !_g.done; _g = _f.next()) {
                var def = _g.value;
                if (def.kind === Kind.OPERATION_DEFINITION) {
                    operations.push(def);
                }
                else if (def.kind === Kind.FRAGMENT_DEFINITION) {
                    fragments[def.name.value] = def;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_g && !_g.done && (_a = _f.return)) _a.call(_f);
            }
            finally { if (e_1) throw e_1.error; }
        }
        try {
            for (var operations_1 = __values(operations), operations_1_1 = operations_1.next(); !operations_1_1.done; operations_1_1 = operations_1.next()) {
                var def = operations_1_1.value;
                var variableDefs = def.variableDefinitions;
                if (variableDefs != null) {
                    try {
                        for (var variableDefs_1 = (e_3 = void 0, __values(variableDefs)), variableDefs_1_1 = variableDefs_1.next(); !variableDefs_1_1.done; variableDefs_1_1 = variableDefs_1.next()) {
                            var variableDef = variableDefs_1_1.value;
                            var varName = variableDef.variable.name.value;
                            // Cast to NamedTypeNode required until upcomming graphql releases will have TypeNode paramter
                            var varType = typeFromAST(delegationContext.transformedSchema, variableDef.type);
                            if (!isInputType(varType)) {
                                throw new Error("Expected " + varType + " to be an input type");
                            }
                            variableValues[varName] = transformInputValue(varType, variableValues[varName], undefined, function (type, originalValue) {
                                var _a;
                                var newValue = Object.create(null);
                                var fields = type.getFields();
                                for (var key in originalValue) {
                                    var field = fields[key];
                                    if (field != null) {
                                        var newFieldName = (_a = _this.mapping[type.name]) === null || _a === void 0 ? void 0 : _a[field.name];
                                        if (newFieldName != null) {
                                            newValue[newFieldName] = originalValue[field.name];
                                        }
                                        else {
                                            newValue[field.name] = originalValue[field.name];
                                        }
                                    }
                                }
                                return newValue;
                            });
                        }
                    }
                    catch (e_3_1) { e_3 = { error: e_3_1 }; }
                    finally {
                        try {
                            if (variableDefs_1_1 && !variableDefs_1_1.done && (_c = variableDefs_1.return)) _c.call(variableDefs_1);
                        }
                        finally { if (e_3) throw e_3.error; }
                    }
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (operations_1_1 && !operations_1_1.done && (_b = operations_1.return)) _b.call(operations_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
        try {
            for (var _h = __values(originalRequest.document.definitions.filter(function (def) { return def.kind === Kind.FRAGMENT_DEFINITION; })), _j = _h.next(); !_j.done; _j = _h.next()) {
                var def = _j.value;
                fragments[def.name.value] = def;
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (_j && !_j.done && (_d = _h.return)) _d.call(_h);
            }
            finally { if (e_4) throw e_4.error; }
        }
        var document = this.transformDocument(originalRequest.document, this.mapping, this.inputFieldNodeTransformer, this.inputObjectNodeTransformer, originalRequest, delegationContext);
        return __assign(__assign({}, originalRequest), { document: document, variables: variableValues });
    };
    TransformInputObjectFields.prototype.transformDocument = function (document, mapping, inputFieldNodeTransformer, inputObjectNodeTransformer, request, delegationContext) {
        var _a;
        var typeInfo = new TypeInfo(this._getTransformedSchema());
        var newDocument = visit(document, visitWithTypeInfo(typeInfo, (_a = {},
            _a[Kind.OBJECT] = {
                leave: function (node) {
                    var e_5, _a, e_6, _b;
                    // The casting is kind of legit here as we are in a visitor
                    var parentType = typeInfo.getInputType();
                    if (parentType != null) {
                        var parentTypeName = parentType.name;
                        var newInputFields = [];
                        try {
                            for (var _c = __values(node.fields), _d = _c.next(); !_d.done; _d = _c.next()) {
                                var inputField = _d.value;
                                var newName = inputField.name.value;
                                var transformedInputField = inputFieldNodeTransformer != null
                                    ? inputFieldNodeTransformer(parentTypeName, newName, inputField, request, delegationContext)
                                    : inputField;
                                if (Array.isArray(transformedInputField)) {
                                    try {
                                        for (var transformedInputField_1 = (e_6 = void 0, __values(transformedInputField)), transformedInputField_1_1 = transformedInputField_1.next(); !transformedInputField_1_1.done; transformedInputField_1_1 = transformedInputField_1.next()) {
                                            var individualTransformedInputField = transformedInputField_1_1.value;
                                            var typeMapping_1 = mapping[parentTypeName];
                                            if (typeMapping_1 == null) {
                                                newInputFields.push(individualTransformedInputField);
                                                continue;
                                            }
                                            var oldName_1 = typeMapping_1[newName];
                                            if (oldName_1 == null) {
                                                newInputFields.push(individualTransformedInputField);
                                                continue;
                                            }
                                            newInputFields.push(__assign(__assign({}, individualTransformedInputField), { name: __assign(__assign({}, individualTransformedInputField.name), { value: oldName_1 }) }));
                                        }
                                    }
                                    catch (e_6_1) { e_6 = { error: e_6_1 }; }
                                    finally {
                                        try {
                                            if (transformedInputField_1_1 && !transformedInputField_1_1.done && (_b = transformedInputField_1.return)) _b.call(transformedInputField_1);
                                        }
                                        finally { if (e_6) throw e_6.error; }
                                    }
                                    continue;
                                }
                                var typeMapping = mapping[parentTypeName];
                                if (typeMapping == null) {
                                    newInputFields.push(transformedInputField);
                                    continue;
                                }
                                var oldName = typeMapping[newName];
                                if (oldName == null) {
                                    newInputFields.push(transformedInputField);
                                    continue;
                                }
                                newInputFields.push(__assign(__assign({}, transformedInputField), { name: __assign(__assign({}, transformedInputField.name), { value: oldName }) }));
                            }
                        }
                        catch (e_5_1) { e_5 = { error: e_5_1 }; }
                        finally {
                            try {
                                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                            }
                            finally { if (e_5) throw e_5.error; }
                        }
                        var newNode = __assign(__assign({}, node), { fields: newInputFields });
                        return inputObjectNodeTransformer != null
                            ? inputObjectNodeTransformer(parentTypeName, newNode, request, delegationContext)
                            : newNode;
                    }
                },
            },
            _a)));
        return newDocument;
    };
    return TransformInputObjectFields;
}());
export default TransformInputObjectFields;
