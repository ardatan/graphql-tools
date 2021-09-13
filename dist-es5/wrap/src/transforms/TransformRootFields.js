import TransformObjectFields from './TransformObjectFields';
var TransformRootFields = /** @class */ (function () {
    function TransformRootFields(rootFieldTransformer, fieldNodeTransformer) {
        this.rootFieldTransformer = rootFieldTransformer;
        this.fieldNodeTransformer = fieldNodeTransformer;
    }
    TransformRootFields.prototype._getTransformer = function () {
        var transformer = this.transformer;
        if (transformer === undefined) {
            throw new Error("The TransformRootFields transform's  \"transformRequest\" and \"transformResult\" methods cannot be used without first calling \"transformSchema\".");
        }
        return transformer;
    };
    TransformRootFields.prototype.transformSchema = function (originalWrappingSchema, subschemaConfig, transformedSchema) {
        var _this = this;
        var rootToObjectFieldTransformer = function (typeName, fieldName, fieldConfig) {
            var _a, _b, _c;
            if (typeName === ((_a = originalWrappingSchema.getQueryType()) === null || _a === void 0 ? void 0 : _a.name)) {
                return _this.rootFieldTransformer('Query', fieldName, fieldConfig);
            }
            if (typeName === ((_b = originalWrappingSchema.getMutationType()) === null || _b === void 0 ? void 0 : _b.name)) {
                return _this.rootFieldTransformer('Mutation', fieldName, fieldConfig);
            }
            if (typeName === ((_c = originalWrappingSchema.getSubscriptionType()) === null || _c === void 0 ? void 0 : _c.name)) {
                return _this.rootFieldTransformer('Subscription', fieldName, fieldConfig);
            }
            return undefined;
        };
        this.transformer = new TransformObjectFields(rootToObjectFieldTransformer, this.fieldNodeTransformer);
        return this.transformer.transformSchema(originalWrappingSchema, subschemaConfig, transformedSchema);
    };
    TransformRootFields.prototype.transformRequest = function (originalRequest, delegationContext, transformationContext) {
        return this._getTransformer().transformRequest(originalRequest, delegationContext, transformationContext);
    };
    TransformRootFields.prototype.transformResult = function (originalResult, delegationContext, transformationContext) {
        return this._getTransformer().transformResult(originalResult, delegationContext, transformationContext);
    };
    return TransformRootFields;
}());
export default TransformRootFields;
