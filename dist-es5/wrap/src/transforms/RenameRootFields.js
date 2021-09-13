import TransformRootFields from './TransformRootFields';
var RenameRootFields = /** @class */ (function () {
    function RenameRootFields(renamer) {
        this.transformer = new TransformRootFields(function (operation, fieldName, fieldConfig) { return [renamer(operation, fieldName, fieldConfig), fieldConfig]; });
    }
    RenameRootFields.prototype.transformSchema = function (originalWrappingSchema, subschemaConfig, transformedSchema) {
        return this.transformer.transformSchema(originalWrappingSchema, subschemaConfig, transformedSchema);
    };
    RenameRootFields.prototype.transformRequest = function (originalRequest, delegationContext, transformationContext) {
        return this.transformer.transformRequest(originalRequest, delegationContext, transformationContext);
    };
    return RenameRootFields;
}());
export default RenameRootFields;
