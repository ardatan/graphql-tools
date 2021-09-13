import { __values } from "tslib";
import { getNamedType, isObjectType, isInterfaceType, isUnionType, isInputObjectType, } from 'graphql';
import { mapSchema } from './mapSchema';
import { MapperKind } from './Interfaces';
import { getRootTypes } from './rootTypes';
/**
 * Prunes the provided schema, removing unused and empty types
 * @param schema The schema to prune
 * @param options Additional options for removing unused types from the schema
 */
export function pruneSchema(schema, options) {
    var e_1, _a, _b;
    if (options === void 0) { options = {}; }
    var pruningContext = {
        schema: schema,
        unusedTypes: Object.create(null),
        implementations: Object.create(null),
    };
    for (var typeName in schema.getTypeMap()) {
        var type = schema.getType(typeName);
        if (type && 'getInterfaces' in type) {
            try {
                for (var _c = (e_1 = void 0, __values(type.getInterfaces())), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var iface = _d.value;
                    var implementations = getImplementations(pruningContext, iface);
                    if (implementations == null) {
                        pruningContext.implementations[iface.name] = Object.create(null);
                    }
                    pruningContext.implementations[iface.name][type.name] = true;
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
    }
    visitTypes(pruningContext, schema);
    return mapSchema(schema, (_b = {},
        _b[MapperKind.TYPE] = function (type) {
            // If we should NOT prune the type, return it immediately as unmodified
            if (options.skipPruning && options.skipPruning(type)) {
                return type;
            }
            if (isObjectType(type) || isInputObjectType(type)) {
                if ((!Object.keys(type.getFields()).length && !options.skipEmptyCompositeTypePruning) ||
                    (pruningContext.unusedTypes[type.name] && !options.skipUnusedTypesPruning)) {
                    return null;
                }
            }
            else if (isUnionType(type)) {
                if ((!type.getTypes().length && !options.skipEmptyUnionPruning) ||
                    (pruningContext.unusedTypes[type.name] && !options.skipUnusedTypesPruning)) {
                    return null;
                }
            }
            else if (isInterfaceType(type)) {
                var implementations = getImplementations(pruningContext, type);
                if ((!Object.keys(type.getFields()).length && !options.skipEmptyCompositeTypePruning) ||
                    (implementations && !Object.keys(implementations).length && !options.skipUnimplementedInterfacesPruning) ||
                    (pruningContext.unusedTypes[type.name] && !options.skipUnusedTypesPruning)) {
                    return null;
                }
            }
            else {
                if (pruningContext.unusedTypes[type.name] && !options.skipUnusedTypesPruning) {
                    return null;
                }
            }
        },
        _b));
}
function visitOutputType(visitedTypes, pruningContext, type) {
    var e_2, _a, e_3, _b, e_4, _c;
    if (visitedTypes[type.name]) {
        return;
    }
    visitedTypes[type.name] = true;
    pruningContext.unusedTypes[type.name] = false;
    if (isObjectType(type) || isInterfaceType(type)) {
        var fields = type.getFields();
        for (var fieldName in fields) {
            var field = fields[fieldName];
            var namedType = getNamedType(field.type);
            visitOutputType(visitedTypes, pruningContext, namedType);
            try {
                for (var _d = (e_2 = void 0, __values(field.args)), _e = _d.next(); !_e.done; _e = _d.next()) {
                    var arg = _e.value;
                    var type_1 = getNamedType(arg.type);
                    visitInputType(visitedTypes, pruningContext, type_1);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
                }
                finally { if (e_2) throw e_2.error; }
            }
        }
        if (isInterfaceType(type)) {
            var implementations = getImplementations(pruningContext, type);
            if (implementations) {
                for (var typeName in implementations) {
                    visitOutputType(visitedTypes, pruningContext, pruningContext.schema.getType(typeName));
                }
            }
        }
        if ('getInterfaces' in type) {
            try {
                for (var _f = __values(type.getInterfaces()), _g = _f.next(); !_g.done; _g = _f.next()) {
                    var iFace = _g.value;
                    visitOutputType(visitedTypes, pruningContext, iFace);
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
                }
                finally { if (e_3) throw e_3.error; }
            }
        }
    }
    else if (isUnionType(type)) {
        var types = type.getTypes();
        try {
            for (var types_1 = __values(types), types_1_1 = types_1.next(); !types_1_1.done; types_1_1 = types_1.next()) {
                var type_2 = types_1_1.value;
                visitOutputType(visitedTypes, pruningContext, type_2);
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (types_1_1 && !types_1_1.done && (_c = types_1.return)) _c.call(types_1);
            }
            finally { if (e_4) throw e_4.error; }
        }
    }
}
/**
 * Get the implementations of an interface. May return undefined.
 */
function getImplementations(pruningContext, type) {
    return pruningContext.implementations[type.name];
}
function visitInputType(visitedTypes, pruningContext, type) {
    if (visitedTypes[type.name]) {
        return;
    }
    pruningContext.unusedTypes[type.name] = false;
    visitedTypes[type.name] = true;
    if (isInputObjectType(type)) {
        var fields = type.getFields();
        for (var fieldName in fields) {
            var field = fields[fieldName];
            var namedType = getNamedType(field.type);
            visitInputType(visitedTypes, pruningContext, namedType);
        }
    }
}
function visitTypes(pruningContext, schema) {
    var e_5, _a, e_6, _b, e_7, _c;
    for (var typeName in schema.getTypeMap()) {
        if (!typeName.startsWith('__')) {
            pruningContext.unusedTypes[typeName] = true;
        }
    }
    var visitedTypes = Object.create(null);
    var rootTypes = getRootTypes(schema);
    try {
        for (var rootTypes_1 = __values(rootTypes), rootTypes_1_1 = rootTypes_1.next(); !rootTypes_1_1.done; rootTypes_1_1 = rootTypes_1.next()) {
            var rootType = rootTypes_1_1.value;
            visitOutputType(visitedTypes, pruningContext, rootType);
        }
    }
    catch (e_5_1) { e_5 = { error: e_5_1 }; }
    finally {
        try {
            if (rootTypes_1_1 && !rootTypes_1_1.done && (_a = rootTypes_1.return)) _a.call(rootTypes_1);
        }
        finally { if (e_5) throw e_5.error; }
    }
    try {
        for (var _d = __values(schema.getDirectives()), _e = _d.next(); !_e.done; _e = _d.next()) {
            var directive = _e.value;
            try {
                for (var _f = (e_7 = void 0, __values(directive.args)), _g = _f.next(); !_g.done; _g = _f.next()) {
                    var arg = _g.value;
                    var type = getNamedType(arg.type);
                    visitInputType(visitedTypes, pruningContext, type);
                }
            }
            catch (e_7_1) { e_7 = { error: e_7_1 }; }
            finally {
                try {
                    if (_g && !_g.done && (_c = _f.return)) _c.call(_f);
                }
                finally { if (e_7) throw e_7.error; }
            }
        }
    }
    catch (e_6_1) { e_6 = { error: e_6_1 }; }
    finally {
        try {
            if (_e && !_e.done && (_b = _d.return)) _b.call(_d);
        }
        finally { if (e_6) throw e_6.error; }
    }
}
