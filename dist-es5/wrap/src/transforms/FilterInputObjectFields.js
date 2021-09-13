import TransformInputObjectFields from './TransformInputObjectFields';
var FilterInputObjectFields = /** @class */ (function () {
    function FilterInputObjectFields(filter, inputObjectNodeTransformer) {
        this.transformer = new TransformInputObjectFields(function (typeName, fieldName, inputFieldConfig) {
            return filter(typeName, fieldName, inputFieldConfig) ? undefined : null;
        }, undefined, inputObjectNodeTransformer);
    }
    FilterInputObjectFields.prototype.transformSchema = function (originalWrappingSchema, subschemaConfig, transformedSchema) {
        return this.transformer.transformSchema(originalWrappingSchema, subschemaConfig, transformedSchema);
    };
    FilterInputObjectFields.prototype.transformRequest = function (originalRequest, delegationContext, transformationContext) {
        return this.transformer.transformRequest(originalRequest, delegationContext, transformationContext);
    };
    return FilterInputObjectFields;
}());
export default FilterInputObjectFields;
