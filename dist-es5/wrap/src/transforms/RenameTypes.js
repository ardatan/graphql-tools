import { __assign } from "tslib";
import { Kind, isScalarType, isSpecifiedScalarType, visit, } from 'graphql';
import { MapperKind, mapSchema, visitData, renameType, } from '@graphql-tools/utils';
var RenameTypes = /** @class */ (function () {
    function RenameTypes(renamer, options) {
        this.renamer = renamer;
        this.map = Object.create(null);
        this.reverseMap = Object.create(null);
        var _a = options != null ? options : {}, _b = _a.renameBuiltins, renameBuiltins = _b === void 0 ? false : _b, _c = _a.renameScalars, renameScalars = _c === void 0 ? true : _c;
        this.renameBuiltins = renameBuiltins;
        this.renameScalars = renameScalars;
    }
    RenameTypes.prototype.transformSchema = function (originalWrappingSchema, _subschemaConfig, _transformedSchema) {
        var _a;
        var _this = this;
        return mapSchema(originalWrappingSchema, (_a = {},
            _a[MapperKind.TYPE] = function (type) {
                if (isSpecifiedScalarType(type) && !_this.renameBuiltins) {
                    return undefined;
                }
                if (isScalarType(type) && !_this.renameScalars) {
                    return undefined;
                }
                var oldName = type.name;
                var newName = _this.renamer(oldName);
                if (newName !== undefined && newName !== oldName) {
                    _this.map[oldName] = newName;
                    _this.reverseMap[newName] = oldName;
                    return renameType(type, newName);
                }
            },
            _a[MapperKind.ROOT_OBJECT] = function () {
                return undefined;
            },
            _a));
    };
    RenameTypes.prototype.transformRequest = function (originalRequest, _delegationContext, _transformationContext) {
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
    RenameTypes.prototype.transformResult = function (originalResult, _delegationContext, _transformationContext) {
        var _this = this;
        return __assign(__assign({}, originalResult), { data: visitData(originalResult.data, function (object) {
                var typeName = object === null || object === void 0 ? void 0 : object.__typename;
                if (typeName != null && typeName in _this.map) {
                    object.__typename = _this.map[typeName];
                }
                return object;
            }) });
    };
    return RenameTypes;
}());
export default RenameTypes;
