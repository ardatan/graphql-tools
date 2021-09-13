import TransformRootFields from './TransformRootFields';
var FilterRootFields = /** @class */ (function () {
    function FilterRootFields(filter) {
        this.transformer = new TransformRootFields(function (operation, fieldName, fieldConfig) {
            if (filter(operation, fieldName, fieldConfig)) {
                return undefined;
            }
            return null;
        });
    }
    FilterRootFields.prototype.transformSchema = function (originalWrappingSchema, subschemaConfig, transformedSchema) {
        return this.transformer.transformSchema(originalWrappingSchema, subschemaConfig, transformedSchema);
    };
    return FilterRootFields;
}());
export default FilterRootFields;
