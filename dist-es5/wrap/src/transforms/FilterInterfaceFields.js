import TransformInterfaceFields from './TransformInterfaceFields';
var FilterInterfaceFields = /** @class */ (function () {
    function FilterInterfaceFields(filter) {
        this.transformer = new TransformInterfaceFields(function (typeName, fieldName, fieldConfig) {
            return filter(typeName, fieldName, fieldConfig) ? undefined : null;
        });
    }
    FilterInterfaceFields.prototype.transformSchema = function (originalWrappingSchema, subschemaConfig, transformedSchema) {
        return this.transformer.transformSchema(originalWrappingSchema, subschemaConfig, transformedSchema);
    };
    return FilterInterfaceFields;
}());
export default FilterInterfaceFields;
