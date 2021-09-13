import TransformObjectFields from './TransformObjectFields';
var RenameObjectFields = /** @class */ (function () {
    function RenameObjectFields(renamer) {
        this.transformer = new TransformObjectFields(function (typeName, fieldName, fieldConfig) { return [
            renamer(typeName, fieldName, fieldConfig),
            fieldConfig,
        ]; });
    }
    RenameObjectFields.prototype.transformSchema = function (originalWrappingSchema, subschemaConfig, transformedSchema) {
        return this.transformer.transformSchema(originalWrappingSchema, subschemaConfig, transformedSchema);
    };
    RenameObjectFields.prototype.transformRequest = function (originalRequest, delegationContext, transformationContext) {
        return this.transformer.transformRequest(originalRequest, delegationContext, transformationContext);
    };
    return RenameObjectFields;
}());
export default RenameObjectFields;
