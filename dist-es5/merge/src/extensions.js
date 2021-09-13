import { __read, __values } from "tslib";
import { isObjectType, isInterfaceType, isInputObjectType, isUnionType, isScalarType, isEnumType, isSpecifiedScalarType, isIntrospectionType, } from 'graphql';
import { mergeDeep } from '@graphql-tools/utils';
export function travelSchemaPossibleExtensions(schema, hooks) {
    var e_1, _a, e_2, _b, e_3, _c, e_4, _d, e_5, _e, e_6, _f, e_7, _g;
    hooks.onSchema(schema);
    var typesMap = schema.getTypeMap();
    try {
        for (var _h = __values(Object.entries(typesMap)), _j = _h.next(); !_j.done; _j = _h.next()) {
            var _k = __read(_j.value, 2), type = _k[1];
            var isPredefinedScalar = isScalarType(type) && isSpecifiedScalarType(type);
            var isIntrospection = isIntrospectionType(type);
            if (isPredefinedScalar || isIntrospection) {
                continue;
            }
            if (isObjectType(type)) {
                hooks.onObjectType(type);
                var fields = type.getFields();
                try {
                    for (var _l = (e_2 = void 0, __values(Object.entries(fields))), _m = _l.next(); !_m.done; _m = _l.next()) {
                        var _o = __read(_m.value, 2), field = _o[1];
                        hooks.onObjectField(type, field);
                        var args = field.args || [];
                        try {
                            for (var args_1 = (e_3 = void 0, __values(args)), args_1_1 = args_1.next(); !args_1_1.done; args_1_1 = args_1.next()) {
                                var arg = args_1_1.value;
                                hooks.onObjectFieldArg(type, field, arg);
                            }
                        }
                        catch (e_3_1) { e_3 = { error: e_3_1 }; }
                        finally {
                            try {
                                if (args_1_1 && !args_1_1.done && (_c = args_1.return)) _c.call(args_1);
                            }
                            finally { if (e_3) throw e_3.error; }
                        }
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (_m && !_m.done && (_b = _l.return)) _b.call(_l);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
            else if (isInterfaceType(type)) {
                hooks.onInterface(type);
                var fields = type.getFields();
                try {
                    for (var _p = (e_4 = void 0, __values(Object.entries(fields))), _q = _p.next(); !_q.done; _q = _p.next()) {
                        var _r = __read(_q.value, 2), field = _r[1];
                        hooks.onInterfaceField(type, field);
                        var args = field.args || [];
                        try {
                            for (var args_2 = (e_5 = void 0, __values(args)), args_2_1 = args_2.next(); !args_2_1.done; args_2_1 = args_2.next()) {
                                var arg = args_2_1.value;
                                hooks.onInterfaceFieldArg(type, field, arg);
                            }
                        }
                        catch (e_5_1) { e_5 = { error: e_5_1 }; }
                        finally {
                            try {
                                if (args_2_1 && !args_2_1.done && (_e = args_2.return)) _e.call(args_2);
                            }
                            finally { if (e_5) throw e_5.error; }
                        }
                    }
                }
                catch (e_4_1) { e_4 = { error: e_4_1 }; }
                finally {
                    try {
                        if (_q && !_q.done && (_d = _p.return)) _d.call(_p);
                    }
                    finally { if (e_4) throw e_4.error; }
                }
            }
            else if (isInputObjectType(type)) {
                hooks.onInputType(type);
                var fields = type.getFields();
                try {
                    for (var _s = (e_6 = void 0, __values(Object.entries(fields))), _t = _s.next(); !_t.done; _t = _s.next()) {
                        var _u = __read(_t.value, 2), field = _u[1];
                        hooks.onInputFieldType(type, field);
                    }
                }
                catch (e_6_1) { e_6 = { error: e_6_1 }; }
                finally {
                    try {
                        if (_t && !_t.done && (_f = _s.return)) _f.call(_s);
                    }
                    finally { if (e_6) throw e_6.error; }
                }
            }
            else if (isUnionType(type)) {
                hooks.onUnion(type);
            }
            else if (isScalarType(type)) {
                hooks.onScalar(type);
            }
            else if (isEnumType(type)) {
                hooks.onEnum(type);
                try {
                    for (var _v = (e_7 = void 0, __values(type.getValues())), _w = _v.next(); !_w.done; _w = _v.next()) {
                        var value = _w.value;
                        hooks.onEnumValue(type, value);
                    }
                }
                catch (e_7_1) { e_7 = { error: e_7_1 }; }
                finally {
                    try {
                        if (_w && !_w.done && (_g = _v.return)) _g.call(_v);
                    }
                    finally { if (e_7) throw e_7.error; }
                }
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_j && !_j.done && (_a = _h.return)) _a.call(_h);
        }
        finally { if (e_1) throw e_1.error; }
    }
}
export function mergeExtensions(extensions) {
    return mergeDeep(extensions);
}
function applyExtensionObject(obj, extensions) {
    if (!obj) {
        return;
    }
    obj.extensions = mergeDeep([obj.extensions || {}, extensions || {}]);
}
export function applyExtensions(schema, extensions) {
    var e_8, _a, e_9, _b, e_10, _c, e_11, _d, e_12, _e;
    applyExtensionObject(schema, extensions.schemaExtensions);
    try {
        for (var _f = __values(Object.entries(extensions.types || {})), _g = _f.next(); !_g.done; _g = _f.next()) {
            var _h = __read(_g.value, 2), typeName = _h[0], data = _h[1];
            var type = schema.getType(typeName);
            if (type) {
                applyExtensionObject(type, data.extensions);
                if (data.type === 'object' || data.type === 'interface') {
                    try {
                        for (var _j = (e_9 = void 0, __values(Object.entries(data.fields))), _k = _j.next(); !_k.done; _k = _j.next()) {
                            var _l = __read(_k.value, 2), fieldName = _l[0], fieldData = _l[1];
                            var field = type.getFields()[fieldName];
                            if (field) {
                                applyExtensionObject(field, fieldData.extensions);
                                var _loop_1 = function (arg, argData) {
                                    applyExtensionObject(field.args.find(function (a) { return a.name === arg; }), argData);
                                };
                                try {
                                    for (var _m = (e_10 = void 0, __values(Object.entries(fieldData.arguments))), _o = _m.next(); !_o.done; _o = _m.next()) {
                                        var _p = __read(_o.value, 2), arg = _p[0], argData = _p[1];
                                        _loop_1(arg, argData);
                                    }
                                }
                                catch (e_10_1) { e_10 = { error: e_10_1 }; }
                                finally {
                                    try {
                                        if (_o && !_o.done && (_c = _m.return)) _c.call(_m);
                                    }
                                    finally { if (e_10) throw e_10.error; }
                                }
                            }
                        }
                    }
                    catch (e_9_1) { e_9 = { error: e_9_1 }; }
                    finally {
                        try {
                            if (_k && !_k.done && (_b = _j.return)) _b.call(_j);
                        }
                        finally { if (e_9) throw e_9.error; }
                    }
                }
                else if (data.type === 'input') {
                    try {
                        for (var _q = (e_11 = void 0, __values(Object.entries(data.fields))), _r = _q.next(); !_r.done; _r = _q.next()) {
                            var _s = __read(_r.value, 2), fieldName = _s[0], fieldData = _s[1];
                            var field = type.getFields()[fieldName];
                            applyExtensionObject(field, fieldData.extensions);
                        }
                    }
                    catch (e_11_1) { e_11 = { error: e_11_1 }; }
                    finally {
                        try {
                            if (_r && !_r.done && (_d = _q.return)) _d.call(_q);
                        }
                        finally { if (e_11) throw e_11.error; }
                    }
                }
                else if (data.type === 'enum') {
                    try {
                        for (var _t = (e_12 = void 0, __values(Object.entries(data.values))), _u = _t.next(); !_u.done; _u = _t.next()) {
                            var _v = __read(_u.value, 2), valueName = _v[0], valueData = _v[1];
                            var value = type.getValue(valueName);
                            applyExtensionObject(value, valueData);
                        }
                    }
                    catch (e_12_1) { e_12 = { error: e_12_1 }; }
                    finally {
                        try {
                            if (_u && !_u.done && (_e = _t.return)) _e.call(_t);
                        }
                        finally { if (e_12) throw e_12.error; }
                    }
                }
            }
        }
    }
    catch (e_8_1) { e_8 = { error: e_8_1 }; }
    finally {
        try {
            if (_g && !_g.done && (_a = _f.return)) _a.call(_f);
        }
        finally { if (e_8) throw e_8.error; }
    }
    return schema;
}
export function extractExtensionsFromSchema(schema) {
    var result = {
        schemaExtensions: {},
        types: {},
    };
    travelSchemaPossibleExtensions(schema, {
        onSchema: function (schema) { return (result.schemaExtensions = schema.extensions || {}); },
        onObjectType: function (type) { return (result.types[type.name] = { fields: {}, type: 'object', extensions: type.extensions || {} }); },
        onObjectField: function (type, field) {
            return (result.types[type.name].fields[field.name] = {
                arguments: {},
                extensions: field.extensions || {},
            });
        },
        onObjectFieldArg: function (type, field, arg) {
            return (result.types[type.name].fields[field.name].arguments[arg.name] = arg.extensions || {});
        },
        onInterface: function (type) {
            return (result.types[type.name] = { fields: {}, type: 'interface', extensions: type.extensions || {} });
        },
        onInterfaceField: function (type, field) {
            return (result.types[type.name].fields[field.name] = {
                arguments: {},
                extensions: field.extensions || {},
            });
        },
        onInterfaceFieldArg: function (type, field, arg) {
            return (result.types[type.name].fields[field.name].arguments[arg.name] =
                arg.extensions || {});
        },
        onEnum: function (type) { return (result.types[type.name] = { values: {}, type: 'enum', extensions: type.extensions || {} }); },
        onEnumValue: function (type, value) {
            return (result.types[type.name].values[value.name] = value.extensions || {});
        },
        onScalar: function (type) { return (result.types[type.name] = { type: 'scalar', extensions: type.extensions || {} }); },
        onUnion: function (type) { return (result.types[type.name] = { type: 'union', extensions: type.extensions || {} }); },
        onInputType: function (type) { return (result.types[type.name] = { fields: {}, type: 'input', extensions: type.extensions || {} }); },
        onInputFieldType: function (type, field) {
            return (result.types[type.name].fields[field.name] = { extensions: field.extensions || {} });
        },
    });
    return result;
}
