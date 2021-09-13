import { MapperKind, mapSchema } from '@graphql-tools/utils';
import MapLeafValues from './MapLeafValues';
var TransformEnumValues = /** @class */ (function () {
    function TransformEnumValues(enumValueTransformer, inputValueTransformer, outputValueTransformer) {
        this.enumValueTransformer = enumValueTransformer;
        this.mapping = Object.create(null);
        this.reverseMapping = Object.create(null);
        this.transformer = new MapLeafValues(generateValueTransformer(inputValueTransformer, this.reverseMapping), generateValueTransformer(outputValueTransformer, this.mapping));
    }
    TransformEnumValues.prototype.transformSchema = function (originalWrappingSchema, subschemaConfig, transformedSchema) {
        var _a;
        var _this = this;
        var mappingSchema = this.transformer.transformSchema(originalWrappingSchema, subschemaConfig, transformedSchema);
        this.transformedSchema = mapSchema(mappingSchema, (_a = {},
            _a[MapperKind.ENUM_VALUE] = function (valueConfig, typeName, _schema, externalValue) {
                return _this.transformEnumValue(typeName, externalValue, valueConfig);
            },
            _a));
        return this.transformedSchema;
    };
    TransformEnumValues.prototype.transformRequest = function (originalRequest, delegationContext, transformationContext) {
        return this.transformer.transformRequest(originalRequest, delegationContext, transformationContext);
    };
    TransformEnumValues.prototype.transformResult = function (originalResult, delegationContext, transformationContext) {
        return this.transformer.transformResult(originalResult, delegationContext, transformationContext);
    };
    TransformEnumValues.prototype.transformEnumValue = function (typeName, externalValue, enumValueConfig) {
        var transformedEnumValue = this.enumValueTransformer(typeName, externalValue, enumValueConfig);
        if (Array.isArray(transformedEnumValue)) {
            var newExternalValue = transformedEnumValue[0];
            if (newExternalValue !== externalValue) {
                if (!(typeName in this.mapping)) {
                    this.mapping[typeName] = Object.create(null);
                    this.reverseMapping[typeName] = Object.create(null);
                }
                this.mapping[typeName][externalValue] = newExternalValue;
                this.reverseMapping[typeName][newExternalValue] = externalValue;
            }
        }
        return transformedEnumValue;
    };
    return TransformEnumValues;
}());
export default TransformEnumValues;
function mapEnumValues(typeName, value, mapping) {
    var _a;
    var newExternalValue = (_a = mapping[typeName]) === null || _a === void 0 ? void 0 : _a[value];
    return newExternalValue != null ? newExternalValue : value;
}
function generateValueTransformer(valueTransformer, mapping) {
    if (valueTransformer == null) {
        return function (typeName, value) { return mapEnumValues(typeName, value, mapping); };
    }
    else {
        return function (typeName, value) { return mapEnumValues(typeName, valueTransformer(typeName, value), mapping); };
    }
}
