import { valueMatchesCriteria } from '@graphql-tools/utils';
import FilterObjectFieldDirectives from './FilterObjectFieldDirectives';
var RemoveObjectFieldDirectives = /** @class */ (function () {
    function RemoveObjectFieldDirectives(directiveName, args) {
        if (args === void 0) { args = {}; }
        this.transformer = new FilterObjectFieldDirectives(function (dirName, dirValue) {
            return !(valueMatchesCriteria(dirName, directiveName) && valueMatchesCriteria(dirValue, args));
        });
    }
    RemoveObjectFieldDirectives.prototype.transformSchema = function (originalWrappingSchema, subschemaConfig, transformedSchema) {
        return this.transformer.transformSchema(originalWrappingSchema, subschemaConfig, transformedSchema);
    };
    return RemoveObjectFieldDirectives;
}());
export default RemoveObjectFieldDirectives;
