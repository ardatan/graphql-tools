import { __assign, __values } from "tslib";
import { TypeInfo, visit, visitWithTypeInfo, Kind, } from 'graphql';
import { MapperKind, mapSchema, visitData } from '@graphql-tools/utils';
var TransformCompositeFields = /** @class */ (function () {
    function TransformCompositeFields(fieldTransformer, fieldNodeTransformer, dataTransformer, errorsTransformer) {
        this.fieldTransformer = fieldTransformer;
        this.fieldNodeTransformer = fieldNodeTransformer;
        this.dataTransformer = dataTransformer;
        this.errorsTransformer = errorsTransformer;
        this.mapping = {};
    }
    TransformCompositeFields.prototype._getTypeInfo = function () {
        var typeInfo = this.typeInfo;
        if (typeInfo === undefined) {
            throw new Error("The TransformCompositeFields transform's  \"transformRequest\" and \"transformResult\" methods cannot be used without first calling \"transformSchema\".");
        }
        return typeInfo;
    };
    TransformCompositeFields.prototype.transformSchema = function (originalWrappingSchema, _subschemaConfig, _transformedSchema) {
        var _a;
        var _this = this;
        var _b;
        this.transformedSchema = mapSchema(originalWrappingSchema, (_a = {},
            _a[MapperKind.COMPOSITE_FIELD] = function (fieldConfig, fieldName, typeName) {
                var transformedField = _this.fieldTransformer(typeName, fieldName, fieldConfig);
                if (Array.isArray(transformedField)) {
                    var newFieldName = transformedField[0];
                    if (newFieldName !== fieldName) {
                        if (!(typeName in _this.mapping)) {
                            _this.mapping[typeName] = {};
                        }
                        _this.mapping[typeName][newFieldName] = fieldName;
                    }
                }
                return transformedField;
            },
            _a));
        this.typeInfo = new TypeInfo(this.transformedSchema);
        this.subscriptionTypeName = (_b = originalWrappingSchema.getSubscriptionType()) === null || _b === void 0 ? void 0 : _b.name;
        return this.transformedSchema;
    };
    TransformCompositeFields.prototype.transformRequest = function (originalRequest, _delegationContext, transformationContext) {
        var document = originalRequest.document;
        return __assign(__assign({}, originalRequest), { document: this.transformDocument(document, transformationContext) });
    };
    TransformCompositeFields.prototype.transformResult = function (result, _delegationContext, transformationContext) {
        var dataTransformer = this.dataTransformer;
        if (dataTransformer != null) {
            result.data = visitData(result.data, function (value) { return dataTransformer(value, transformationContext); });
        }
        if (this.errorsTransformer != null && Array.isArray(result.errors)) {
            result.errors = this.errorsTransformer(result.errors, transformationContext);
        }
        return result;
    };
    TransformCompositeFields.prototype.transformDocument = function (document, transformationContext) {
        var e_1, _a, _b;
        var _this = this;
        var fragments = Object.create(null);
        try {
            for (var _c = __values(document.definitions), _d = _c.next(); !_d.done; _d = _c.next()) {
                var def = _d.value;
                if (def.kind === Kind.FRAGMENT_DEFINITION) {
                    fragments[def.name.value] = def;
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
        return visit(document, visitWithTypeInfo(this._getTypeInfo(), (_b = {},
            _b[Kind.SELECTION_SET] = {
                leave: function (node) { return _this.transformSelectionSet(node, _this._getTypeInfo(), fragments, transformationContext); },
            },
            _b)));
    };
    TransformCompositeFields.prototype.transformSelectionSet = function (node, typeInfo, fragments, transformationContext) {
        var e_2, _a;
        var _b, _c;
        var parentType = typeInfo.getParentType();
        if (parentType == null) {
            return undefined;
        }
        var parentTypeName = parentType.name;
        var newSelections = [];
        try {
            for (var _d = __values(node.selections), _e = _d.next(); !_e.done; _e = _d.next()) {
                var selection = _e.value;
                if (selection.kind !== Kind.FIELD) {
                    newSelections.push(selection);
                    continue;
                }
                var newName = selection.name.value;
                // See https://github.com/ardatan/graphql-tools/issues/2282
                if ((this.dataTransformer != null || this.errorsTransformer != null) &&
                    (this.subscriptionTypeName == null || parentTypeName !== this.subscriptionTypeName)) {
                    newSelections.push({
                        kind: Kind.FIELD,
                        name: {
                            kind: Kind.NAME,
                            value: '__typename',
                        },
                    });
                }
                var transformedSelection = void 0;
                if (this.fieldNodeTransformer == null) {
                    transformedSelection = selection;
                }
                else {
                    transformedSelection = this.fieldNodeTransformer(parentTypeName, newName, selection, fragments, transformationContext);
                    transformedSelection = transformedSelection === undefined ? selection : transformedSelection;
                }
                if (transformedSelection == null) {
                    continue;
                }
                else if (Array.isArray(transformedSelection)) {
                    newSelections = newSelections.concat(transformedSelection);
                    continue;
                }
                else if (transformedSelection.kind !== Kind.FIELD) {
                    newSelections.push(transformedSelection);
                    continue;
                }
                var typeMapping = this.mapping[parentTypeName];
                if (typeMapping == null) {
                    newSelections.push(transformedSelection);
                    continue;
                }
                var oldName = this.mapping[parentTypeName][newName];
                if (oldName == null) {
                    newSelections.push(transformedSelection);
                    continue;
                }
                newSelections.push(__assign(__assign({}, transformedSelection), { name: {
                        kind: Kind.NAME,
                        value: oldName,
                    }, alias: {
                        kind: Kind.NAME,
                        value: (_c = (_b = transformedSelection.alias) === null || _b === void 0 ? void 0 : _b.value) !== null && _c !== void 0 ? _c : newName,
                    } }));
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
            }
            finally { if (e_2) throw e_2.error; }
        }
        return __assign(__assign({}, node), { selections: newSelections });
    };
    return TransformCompositeFields;
}());
export default TransformCompositeFields;
