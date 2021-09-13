import TransformInterfaceFields from './TransformInterfaceFields';
var RenameInterfaceFields = /** @class */ (function () {
    function RenameInterfaceFields(renamer) {
        this.transformer = new TransformInterfaceFields(function (typeName, fieldName, fieldConfig) { return [
            renamer(typeName, fieldName, fieldConfig),
            fieldConfig,
        ]; });
    }
    RenameInterfaceFields.prototype.transformSchema = function (originalWrappingSchema, subschemaConfig, transformedSchema) {
        return this.transformer.transformSchema(originalWrappingSchema, subschemaConfig, transformedSchema);
    };
    RenameInterfaceFields.prototype.transformRequest = function (originalRequest, delegationContext, transformationContext) {
        return this.transformer.transformRequest(originalRequest, delegationContext, transformationContext);
    };
    return RenameInterfaceFields;
}());
export default RenameInterfaceFields;
