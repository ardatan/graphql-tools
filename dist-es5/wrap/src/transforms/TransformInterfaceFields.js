import { isInterfaceType } from 'graphql';
import TransformCompositeFields from './TransformCompositeFields';
var TransformInterfaceFields = /** @class */ (function () {
    function TransformInterfaceFields(interfaceFieldTransformer, fieldNodeTransformer) {
        this.interfaceFieldTransformer = interfaceFieldTransformer;
        this.fieldNodeTransformer = fieldNodeTransformer;
    }
    TransformInterfaceFields.prototype._getTransformer = function () {
        var transformer = this.transformer;
        if (transformer === undefined) {
            throw new Error("The TransformInterfaceFields transform's  \"transformRequest\" and \"transformResult\" methods cannot be used without first calling \"transformSchema\".");
        }
        return transformer;
    };
    TransformInterfaceFields.prototype.transformSchema = function (originalWrappingSchema, subschemaConfig, transformedSchema) {
        var _this = this;
        var compositeToObjectFieldTransformer = function (typeName, fieldName, fieldConfig) {
            if (isInterfaceType(originalWrappingSchema.getType(typeName))) {
                return _this.interfaceFieldTransformer(typeName, fieldName, fieldConfig);
            }
            return undefined;
        };
        this.transformer = new TransformCompositeFields(compositeToObjectFieldTransformer, this.fieldNodeTransformer);
        return this.transformer.transformSchema(originalWrappingSchema, subschemaConfig, transformedSchema);
    };
    TransformInterfaceFields.prototype.transformRequest = function (originalRequest, delegationContext, transformationContext) {
        return this._getTransformer().transformRequest(originalRequest, delegationContext, transformationContext);
    };
    TransformInterfaceFields.prototype.transformResult = function (originalResult, delegationContext, transformationContext) {
        return this._getTransformer().transformResult(originalResult, delegationContext, transformationContext);
    };
    return TransformInterfaceFields;
}());
export default TransformInterfaceFields;
