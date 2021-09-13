import { __assign, __read, __spreadArray, __values } from "tslib";
import { visit, Kind, TypeInfo, visitWithTypeInfo, valueFromAST, isLeafType, } from 'graphql';
import { visitResult, updateArgument, transformInputValue, createVariableNameGenerator, assertSome, } from '@graphql-tools/utils';
var MapLeafValues = /** @class */ (function () {
    function MapLeafValues(inputValueTransformer, outputValueTransformer) {
        this.inputValueTransformer = inputValueTransformer;
        this.outputValueTransformer = outputValueTransformer;
        this.resultVisitorMap = Object.create(null);
    }
    MapLeafValues.prototype._getTypeInfo = function () {
        var typeInfo = this.typeInfo;
        if (typeInfo === undefined) {
            throw new Error("The MapLeafValues transform's  \"transformRequest\" and \"transformResult\" methods cannot be used without first calling \"transformSchema\".");
        }
        return typeInfo;
    };
    MapLeafValues.prototype._getOriginalWrappingSchema = function () {
        var originalWrappingSchema = this.originalWrappingSchema;
        if (originalWrappingSchema === undefined) {
            throw new Error("The MapLeafValues transform's  \"transformRequest\" and \"transformResult\" methods cannot be used without first calling \"transformSchema\".");
        }
        return originalWrappingSchema;
    };
    MapLeafValues.prototype.transformSchema = function (originalWrappingSchema, _subschemaConfig, _transformedSchema) {
        var _this = this;
        this.originalWrappingSchema = originalWrappingSchema;
        var typeMap = originalWrappingSchema.getTypeMap();
        var _loop_1 = function (typeName) {
            var type = typeMap[typeName];
            if (!typeName.startsWith('__')) {
                if (isLeafType(type)) {
                    this_1.resultVisitorMap[typeName] = function (value) { return _this.outputValueTransformer(typeName, value); };
                }
            }
        };
        var this_1 = this;
        for (var typeName in typeMap) {
            _loop_1(typeName);
        }
        this.typeInfo = new TypeInfo(originalWrappingSchema);
        return originalWrappingSchema;
    };
    MapLeafValues.prototype.transformRequest = function (originalRequest, _delegationContext, transformationContext) {
        var document = originalRequest.document;
        var variableValues = (originalRequest.variables = {});
        var operations = document.definitions.filter(function (def) { return def.kind === Kind.OPERATION_DEFINITION; });
        var fragments = document.definitions.filter(function (def) { return def.kind === Kind.FRAGMENT_DEFINITION; });
        var newOperations = this.transformOperations(operations, variableValues);
        var transformedRequest = __assign(__assign({}, originalRequest), { document: __assign(__assign({}, document), { definitions: __spreadArray(__spreadArray([], __read(newOperations), false), __read(fragments), false) }), variables: variableValues });
        transformationContext.transformedRequest = transformedRequest;
        return transformedRequest;
    };
    MapLeafValues.prototype.transformResult = function (originalResult, _delegationContext, transformationContext) {
        return visitResult(originalResult, transformationContext.transformedRequest, this._getOriginalWrappingSchema(), this.resultVisitorMap);
    };
    MapLeafValues.prototype.transformOperations = function (operations, variableValues) {
        var _this = this;
        return operations.map(function (operation) {
            var _a;
            var _b;
            var variableDefinitionMap = ((_b = operation.variableDefinitions) !== null && _b !== void 0 ? _b : []).reduce(function (prev, def) {
                var _a;
                return (__assign(__assign({}, prev), (_a = {}, _a[def.variable.name.value] = def, _a)));
            }, {});
            var newOperation = visit(operation, visitWithTypeInfo(_this._getTypeInfo(), (_a = {},
                _a[Kind.FIELD] = function (node) { return _this.transformFieldNode(node, variableDefinitionMap, variableValues); },
                _a)));
            return __assign(__assign({}, newOperation), { variableDefinitions: Object.values(variableDefinitionMap) });
        });
    };
    MapLeafValues.prototype.transformFieldNode = function (field, variableDefinitionMap, variableValues) {
        var e_1, _a;
        var _this = this;
        var targetField = this._getTypeInfo().getFieldDef();
        assertSome(targetField);
        var generateVariableName = createVariableNameGenerator(variableDefinitionMap);
        if (!targetField.name.startsWith('__')) {
            var argumentNodes = field.arguments;
            if (argumentNodes != null) {
                var argumentNodeMap = argumentNodes.reduce(function (prev, argument) {
                    var _a;
                    return (__assign(__assign({}, prev), (_a = {}, _a[argument.name.value] = argument, _a)));
                }, Object.create(null));
                try {
                    for (var _b = __values(targetField.args), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var argument = _c.value;
                        var argName = argument.name;
                        var argType = argument.type;
                        var argumentNode = argumentNodeMap[argName];
                        var argValue = argumentNode === null || argumentNode === void 0 ? void 0 : argumentNode.value;
                        var value = void 0;
                        if (argValue != null) {
                            value = valueFromAST(argValue, argType, variableValues);
                        }
                        updateArgument(argumentNodeMap, variableDefinitionMap, variableValues, argName, generateVariableName(argName), argType, transformInputValue(argType, value, function (t, v) {
                            var newValue = _this.inputValueTransformer(t.name, v);
                            return newValue === undefined ? v : newValue;
                        }));
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
                return __assign(__assign({}, field), { arguments: Object.values(argumentNodeMap) });
            }
        }
    };
    return MapLeafValues;
}());
export default MapLeafValues;
