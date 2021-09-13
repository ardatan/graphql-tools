import { mapSchema, MapperKind } from '@graphql-tools/utils';
var FilterTypes = /** @class */ (function () {
    function FilterTypes(filter) {
        this.filter = filter;
    }
    FilterTypes.prototype.transformSchema = function (originalWrappingSchema, _subschemaConfig, _transformedSchema) {
        var _a;
        var _this = this;
        return mapSchema(originalWrappingSchema, (_a = {},
            _a[MapperKind.TYPE] = function (type) {
                if (_this.filter(type)) {
                    return undefined;
                }
                return null;
            },
            _a));
    };
    return FilterTypes;
}());
export default FilterTypes;
