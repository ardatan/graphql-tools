import TransformObjectFields from './TransformObjectFields';
var FilterObjectFields = /** @class */ (function () {
    function FilterObjectFields(filter) {
        this.transformer = new TransformObjectFields(function (typeName, fieldName, fieldConfig) {
            return filter(typeName, fieldName, fieldConfig) ? undefined : null;
        });
    }
    FilterObjectFields.prototype.transformSchema = function (originalWrappingSchema, subschemaConfig, transformedSchema) {
        return this.transformer.transformSchema(originalWrappingSchema, subschemaConfig, transformedSchema);
    };
    return FilterObjectFields;
}());
export default FilterObjectFields;
