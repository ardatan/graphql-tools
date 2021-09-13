import { pruneSchema } from '@graphql-tools/utils';
var PruneTypes = /** @class */ (function () {
    function PruneTypes(options) {
        if (options === void 0) { options = {}; }
        this.options = options;
    }
    PruneTypes.prototype.transformSchema = function (originalWrappingSchema, _subschemaConfig, _transformedSchema) {
        return pruneSchema(originalWrappingSchema, this.options);
    };
    return PruneTypes;
}());
export default PruneTypes;
