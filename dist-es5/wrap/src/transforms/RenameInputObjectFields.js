import { __assign } from "tslib";
import { mapSchema, MapperKind } from '@graphql-tools/utils';
import TransformInputObjectFields from './TransformInputObjectFields';
var RenameInputObjectFields = /** @class */ (function () {
    function RenameInputObjectFields(renamer) {
        var _this = this;
        this.renamer = renamer;
        this.transformer = new TransformInputObjectFields(function (typeName, inputFieldName, inputFieldConfig) {
            var newName = renamer(typeName, inputFieldName, inputFieldConfig);
            if (newName !== undefined && newName !== inputFieldName) {
                var value = renamer(typeName, inputFieldName, inputFieldConfig);
                if (value != null) {
                    return [value, inputFieldConfig];
                }
            }
        }, function (typeName, inputFieldName, inputFieldNode) {
            if (!(typeName in _this.reverseMap)) {
                return inputFieldNode;
            }
            var inputFieldNameMap = _this.reverseMap[typeName];
            if (!(inputFieldName in inputFieldNameMap)) {
                return inputFieldNode;
            }
            return __assign(__assign({}, inputFieldNode), { name: __assign(__assign({}, inputFieldNode.name), { value: inputFieldNameMap[inputFieldName] }) });
        });
        this.reverseMap = Object.create(null);
    }
    RenameInputObjectFields.prototype.transformSchema = function (originalWrappingSchema, subschemaConfig, transformedSchema) {
        var _a;
        var _this = this;
        mapSchema(originalWrappingSchema, (_a = {},
            _a[MapperKind.INPUT_OBJECT_FIELD] = function (inputFieldConfig, fieldName, typeName) {
                var newName = _this.renamer(typeName, fieldName, inputFieldConfig);
                if (newName !== undefined && newName !== fieldName) {
                    if (_this.reverseMap[typeName] == null) {
                        _this.reverseMap[typeName] = Object.create(null);
                    }
                    _this.reverseMap[typeName][newName] = fieldName;
                }
                return undefined;
            },
            _a[MapperKind.ROOT_OBJECT] = function () {
                return undefined;
            },
            _a));
        return this.transformer.transformSchema(originalWrappingSchema, subschemaConfig, transformedSchema);
    };
    RenameInputObjectFields.prototype.transformRequest = function (originalRequest, delegationContext, transformationContext) {
        return this.transformer.transformRequest(originalRequest, delegationContext, transformationContext);
    };
    return RenameInputObjectFields;
}());
export default RenameInputObjectFields;
