import { __values } from "tslib";
import { getNamedType, isObjectType, isInputObjectType } from 'graphql';
export function forEachDefaultValue(schema, fn) {
    var e_1, _a;
    var typeMap = schema.getTypeMap();
    for (var typeName in typeMap) {
        var type = typeMap[typeName];
        if (!getNamedType(type).name.startsWith('__')) {
            if (isObjectType(type)) {
                var fields = type.getFields();
                for (var fieldName in fields) {
                    var field = fields[fieldName];
                    try {
                        for (var _b = (e_1 = void 0, __values(field.args)), _c = _b.next(); !_c.done; _c = _b.next()) {
                            var arg = _c.value;
                            arg.defaultValue = fn(arg.type, arg.defaultValue);
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                }
            }
            else if (isInputObjectType(type)) {
                var fields = type.getFields();
                for (var fieldName in fields) {
                    var field = fields[fieldName];
                    field.defaultValue = fn(field.type, field.defaultValue);
                }
            }
        }
    }
}
