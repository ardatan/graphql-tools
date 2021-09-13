import { valueMatchesCriteria } from '@graphql-tools/utils';
import FilterObjectFields from './FilterObjectFields';
var RemoveObjectFieldsWithDeprecation = /** @class */ (function () {
    function RemoveObjectFieldsWithDeprecation(reason) {
        this.transformer = new FilterObjectFields(function (_typeName, _fieldName, fieldConfig) {
            if (fieldConfig.deprecationReason) {
                return !valueMatchesCriteria(fieldConfig.deprecationReason, reason);
            }
            return true;
        });
    }
    RemoveObjectFieldsWithDeprecation.prototype.transformSchema = function (originalWrappingSchema, subschemaConfig, transformedSchema) {
        return this.transformer.transformSchema(originalWrappingSchema, subschemaConfig, transformedSchema);
    };
    return RemoveObjectFieldsWithDeprecation;
}());
export default RemoveObjectFieldsWithDeprecation;
