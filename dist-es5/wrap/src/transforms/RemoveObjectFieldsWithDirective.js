import { getDirectives, valueMatchesCriteria } from '@graphql-tools/utils';
import FilterObjectFields from './FilterObjectFields';
var RemoveObjectFieldsWithDirective = /** @class */ (function () {
    function RemoveObjectFieldsWithDirective(directiveName, args) {
        if (args === void 0) { args = {}; }
        this.directiveName = directiveName;
        this.args = args;
    }
    RemoveObjectFieldsWithDirective.prototype.transformSchema = function (originalWrappingSchema, subschemaConfig, transformedSchema) {
        var _this = this;
        var transformer = new FilterObjectFields(function (_typeName, _fieldName, fieldConfig) {
            var directives = getDirectives(originalWrappingSchema, fieldConfig);
            return !directives.some(function (directive) {
                return valueMatchesCriteria(directive.name, _this.directiveName) && valueMatchesCriteria(directive.args, _this.args);
            });
        });
        return transformer.transformSchema(originalWrappingSchema, subschemaConfig, transformedSchema);
    };
    return RemoveObjectFieldsWithDirective;
}());
export default RemoveObjectFieldsWithDirective;
