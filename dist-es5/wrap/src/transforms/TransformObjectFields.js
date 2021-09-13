import { isObjectType } from 'graphql';
import TransformCompositeFields from './TransformCompositeFields';
var TransformObjectFields = /** @class */ (function () {
    function TransformObjectFields(objectFieldTransformer, fieldNodeTransformer) {
        this.objectFieldTransformer = objectFieldTransformer;
        this.fieldNodeTransformer = fieldNodeTransformer;
    }
    TransformObjectFields.prototype._getTransformer = function () {
        var transformer = this.transformer;
        if (transformer === undefined) {
            throw new Error("The TransformObjectFields transform's  \"transformRequest\" and \"transformResult\" methods cannot be used without first calling \"transformSchema\".");
        }
        return transformer;
    };
    TransformObjectFields.prototype.transformSchema = function (originalWrappingSchema, subschemaConfig, transformedSchema) {
        var _this = this;
        var compositeToObjectFieldTransformer = function (typeName, fieldName, fieldConfig) {
            if (isObjectType(originalWrappingSchema.getType(typeName))) {
                return _this.objectFieldTransformer(typeName, fieldName, fieldConfig);
            }
            return undefined;
        };
        this.transformer = new TransformCompositeFields(compositeToObjectFieldTransformer, this.fieldNodeTransformer);
        return this.transformer.transformSchema(originalWrappingSchema, subschemaConfig, transformedSchema);
    };
    TransformObjectFields.prototype.transformRequest = function (originalRequest, delegationContext, transformationContext) {
        return this._getTransformer().transformRequest(originalRequest, delegationContext, transformationContext);
    };
    TransformObjectFields.prototype.transformResult = function (originalResult, delegationContext, transformationContext) {
        return this._getTransformer().transformResult(originalResult, delegationContext, transformationContext);
    };
    return TransformObjectFields;
}());
export default TransformObjectFields;
