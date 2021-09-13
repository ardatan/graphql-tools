import { __assign } from "tslib";
import { valueMatchesCriteria } from '@graphql-tools/utils';
import FilterObjectFieldDirectives from './FilterObjectFieldDirectives';
import TransformObjectFields from './TransformObjectFields';
var RemoveObjectFieldDeprecations = /** @class */ (function () {
    function RemoveObjectFieldDeprecations(reason) {
        var args = { reason: reason };
        this.removeDirectives = new FilterObjectFieldDirectives(function (dirName, dirValue) {
            return !(dirName === 'deprecated' && valueMatchesCriteria(dirValue, args));
        });
        this.removeDeprecations = new TransformObjectFields(function (_typeName, _fieldName, fieldConfig) {
            if (fieldConfig.deprecationReason && valueMatchesCriteria(fieldConfig.deprecationReason, reason)) {
                fieldConfig = __assign({}, fieldConfig);
                delete fieldConfig.deprecationReason;
            }
            return fieldConfig;
        });
    }
    RemoveObjectFieldDeprecations.prototype.transformSchema = function (originalWrappingSchema, subschemaConfig, transformedSchema) {
        return this.removeDeprecations.transformSchema(this.removeDirectives.transformSchema(originalWrappingSchema, subschemaConfig, transformedSchema), subschemaConfig, transformedSchema);
    };
    return RemoveObjectFieldDeprecations;
}());
export default RemoveObjectFieldDeprecations;
