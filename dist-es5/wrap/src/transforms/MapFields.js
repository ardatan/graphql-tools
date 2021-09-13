import TransformCompositeFields from './TransformCompositeFields';
var MapFields = /** @class */ (function () {
    function MapFields(fieldNodeTransformerMap, objectValueTransformerMap, errorsTransformer) {
        this.fieldNodeTransformerMap = fieldNodeTransformerMap;
        this.objectValueTransformerMap = objectValueTransformerMap;
        this.errorsTransformer = errorsTransformer;
    }
    MapFields.prototype._getTransformer = function () {
        var transformer = this.transformer;
        if (transformer === undefined) {
            throw new Error("The MapFields transform's  \"transformRequest\" and \"transformResult\" methods cannot be used without first calling \"transformSchema\".");
        }
        return transformer;
    };
    MapFields.prototype.transformSchema = function (originalWrappingSchema, subschemaConfig, transformedSchema) {
        var _this = this;
        var _a;
        var subscriptionTypeName = (_a = originalWrappingSchema.getSubscriptionType()) === null || _a === void 0 ? void 0 : _a.name;
        var objectValueTransformerMap = this.objectValueTransformerMap;
        this.transformer = new TransformCompositeFields(function () { return undefined; }, function (typeName, fieldName, fieldNode, fragments, transformationContext) {
            var typeTransformers = _this.fieldNodeTransformerMap[typeName];
            if (typeTransformers == null) {
                return undefined;
            }
            var fieldNodeTransformer = typeTransformers[fieldName];
            if (fieldNodeTransformer == null) {
                return undefined;
            }
            return fieldNodeTransformer(fieldNode, fragments, transformationContext);
        }, objectValueTransformerMap != null
            ? function (data, transformationContext) {
                if (data == null) {
                    return data;
                }
                var typeName = data.__typename;
                if (typeName == null) {
                    // see https://github.com/ardatan/graphql-tools/issues/2282
                    typeName = subscriptionTypeName;
                    if (typeName == null) {
                        return data;
                    }
                }
                var transformer = objectValueTransformerMap[typeName];
                if (transformer == null) {
                    return data;
                }
                return transformer(data, transformationContext);
            }
            : undefined, this.errorsTransformer != null ? this.errorsTransformer : undefined);
        return this.transformer.transformSchema(originalWrappingSchema, subschemaConfig, transformedSchema);
    };
    MapFields.prototype.transformRequest = function (originalRequest, delegationContext, transformationContext) {
        return this._getTransformer().transformRequest(originalRequest, delegationContext, transformationContext);
    };
    MapFields.prototype.transformResult = function (originalResult, delegationContext, transformationContext) {
        return this._getTransformer().transformResult(originalResult, delegationContext, transformationContext);
    };
    return MapFields;
}());
export default MapFields;
