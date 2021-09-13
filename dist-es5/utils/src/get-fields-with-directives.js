import { __assign, __read, __spreadArray, __values } from "tslib";
import { Kind, } from 'graphql';
function parseDirectiveValue(value) {
    switch (value.kind) {
        case Kind.INT:
            return parseInt(value.value);
        case Kind.FLOAT:
            return parseFloat(value.value);
        case Kind.BOOLEAN:
            return Boolean(value.value);
        case Kind.STRING:
        case Kind.ENUM:
            return value.value;
        case Kind.LIST:
            return value.values.map(function (v) { return parseDirectiveValue(v); });
        case Kind.OBJECT:
            return value.fields.reduce(function (prev, v) {
                var _a;
                return (__assign(__assign({}, prev), (_a = {}, _a[v.name.value] = parseDirectiveValue(v.value), _a)));
            }, {});
        case Kind.NULL:
            return null;
        default:
            return null;
    }
}
export function getFieldsWithDirectives(documentNode, options) {
    var e_1, _a, e_2, _b;
    if (options === void 0) { options = {}; }
    var result = {};
    var selected = ['ObjectTypeDefinition', 'ObjectTypeExtension'];
    if (options.includeInputTypes) {
        selected = __spreadArray(__spreadArray([], __read(selected), false), ['InputObjectTypeDefinition', 'InputObjectTypeExtension'], false);
    }
    var allTypes = documentNode.definitions.filter(function (obj) { return selected.includes(obj.kind); });
    try {
        for (var allTypes_1 = __values(allTypes), allTypes_1_1 = allTypes_1.next(); !allTypes_1_1.done; allTypes_1_1 = allTypes_1.next()) {
            var type = allTypes_1_1.value;
            var typeName = type.name.value;
            if (type.fields == null) {
                continue;
            }
            try {
                for (var _c = (e_2 = void 0, __values(type.fields)), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var field = _d.value;
                    if (field.directives && field.directives.length > 0) {
                        var fieldName = field.name.value;
                        var key = typeName + "." + fieldName;
                        var directives = field.directives.map(function (d) { return ({
                            name: d.name.value,
                            args: (d.arguments || []).reduce(function (prev, arg) {
                                var _a;
                                return (__assign(__assign({}, prev), (_a = {}, _a[arg.name.value] = parseDirectiveValue(arg.value), _a)));
                            }, {}),
                        }); });
                        result[key] = directives;
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_b = _c.return)) _b.call(_c);
                }
                finally { if (e_2) throw e_2.error; }
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (allTypes_1_1 && !allTypes_1_1.done && (_a = allTypes_1.return)) _a.call(allTypes_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return result;
}
