import { __assign } from "tslib";
import { getArgumentValues } from '@graphql-tools/utils';
import TransformObjectFields from './TransformObjectFields';
var FilterObjectFieldDirectives = /** @class */ (function () {
    function FilterObjectFieldDirectives(filter) {
        this.filter = filter;
    }
    FilterObjectFieldDirectives.prototype.transformSchema = function (originalWrappingSchema, subschemaConfig, transformedSchema) {
        var _this = this;
        var transformer = new TransformObjectFields(function (_typeName, _fieldName, fieldConfig) {
            var _a, _b, _c, _d;
            var keepDirectives = (_c = (_b = (_a = fieldConfig.astNode) === null || _a === void 0 ? void 0 : _a.directives) === null || _b === void 0 ? void 0 : _b.filter(function (dir) {
                var directiveDef = originalWrappingSchema.getDirective(dir.name.value);
                var directiveValue = directiveDef ? getArgumentValues(directiveDef, dir) : undefined;
                return _this.filter(dir.name.value, directiveValue);
            })) !== null && _c !== void 0 ? _c : [];
            if (((_d = fieldConfig.astNode) === null || _d === void 0 ? void 0 : _d.directives) != null &&
                keepDirectives.length !== fieldConfig.astNode.directives.length) {
                fieldConfig = __assign(__assign({}, fieldConfig), { astNode: __assign(__assign({}, fieldConfig.astNode), { directives: keepDirectives }) });
                return fieldConfig;
            }
        });
        return transformer.transformSchema(originalWrappingSchema, subschemaConfig, transformedSchema);
    };
    return FilterObjectFieldDirectives;
}());
export default FilterObjectFieldDirectives;
