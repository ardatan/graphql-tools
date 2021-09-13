import WrapFields from './WrapFields';
var WrapType = /** @class */ (function () {
    function WrapType(outerTypeName, innerTypeName, fieldName) {
        this.transformer = new WrapFields(outerTypeName, [fieldName], [innerTypeName]);
    }
    WrapType.prototype.transformSchema = function (originalWrappingSchema, subschemaConfig, transformedSchema) {
        return this.transformer.transformSchema(originalWrappingSchema, subschemaConfig, transformedSchema);
    };
    WrapType.prototype.transformRequest = function (originalRequest, delegationContext, transformationContext) {
        return this.transformer.transformRequest(originalRequest, delegationContext, transformationContext);
    };
    WrapType.prototype.transformResult = function (originalResult, delegationContext, transformationContext) {
        return this.transformer.transformResult(originalResult, delegationContext, transformationContext);
    };
    return WrapType;
}());
export default WrapType;
