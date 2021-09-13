import { __assign } from "tslib";
import { visit, Kind } from 'graphql';
import { MapperKind, mapSchema, renameType, visitData } from '@graphql-tools/utils';
var RenameRootTypes = /** @class */ (function () {
    function RenameRootTypes(renamer) {
        this.renamer = renamer;
        this.map = Object.create(null);
        this.reverseMap = Object.create(null);
    }
    RenameRootTypes.prototype.transformSchema = function (originalWrappingSchema, _subschemaConfig, _transformedSchema) {
        var _a;
        var _this = this;
        return mapSchema(originalWrappingSchema, (_a = {},
            _a[MapperKind.ROOT_OBJECT] = function (type) {
                var oldName = type.name;
                var newName = _this.renamer(oldName);
                if (newName !== undefined && newName !== oldName) {
                    _this.map[oldName] = newName;
                    _this.reverseMap[newName] = oldName;
                    return renameType(type, newName);
                }
            },
            _a));
    };
    RenameRootTypes.prototype.transformRequest = function (originalRequest, _delegationContext, _transformationContext) {
        var _a;
        var _this = this;
        var document = visit(originalRequest.document, (_a = {},
            _a[Kind.NAMED_TYPE] = function (node) {
                var name = node.name.value;
                if (name in _this.reverseMap) {
                    return __assign(__assign({}, node), { name: {
                            kind: Kind.NAME,
                            value: _this.reverseMap[name],
                        } });
                }
            },
            _a));
        return __assign(__assign({}, originalRequest), { document: document });
    };
    RenameRootTypes.prototype.transformResult = function (originalResult, _delegationContext, _transformationContext) {
        var _this = this;
        return __assign(__assign({}, originalResult), { data: visitData(originalResult.data, function (object) {
                var typeName = object === null || object === void 0 ? void 0 : object.__typename;
                if (typeName != null && typeName in _this.map) {
                    object.__typename = _this.map[typeName];
                }
                return object;
            }) });
    };
    return RenameRootTypes;
}());
export default RenameRootTypes;
