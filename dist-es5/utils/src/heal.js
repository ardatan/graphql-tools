import { __read, __spreadArray, __values } from "tslib";
import { GraphQLList, GraphQLNonNull, isNamedType, isObjectType, isInterfaceType, isUnionType, isInputObjectType, isLeafType, isListType, isNonNullType, } from 'graphql';
// Update any references to named schema types that disagree with the named
// types found in schema.getTypeMap().
//
// healSchema and its callers (visitSchema/visitSchemaDirectives) all modify the schema in place.
// Therefore, private variables (such as the stored implementation map and the proper root types)
// are not updated.
//
// If this causes issues, the schema could be more aggressively healed as follows:
//
// healSchema(schema);
// const config = schema.toConfig()
// const healedSchema = new GraphQLSchema({
//   ...config,
//   query: schema.getType('<desired new root query type name>'),
//   mutation: schema.getType('<desired new root mutation type name>'),
//   subscription: schema.getType('<desired new root subscription type name>'),
// });
//
// One can then also -- if necessary --  assign the correct private variables to the initial schema
// as follows:
// Object.assign(schema, healedSchema);
//
// These steps are not taken automatically to preserve backwards compatibility with graphql-tools v4.
// See https://github.com/ardatan/graphql-tools/issues/1462
//
// They were briefly taken in v5, but can now be phased out as they were only required when other
// areas of the codebase were using healSchema and visitSchema more extensively.
//
export function healSchema(schema) {
    healTypes(schema.getTypeMap(), schema.getDirectives());
    return schema;
}
export function healTypes(originalTypeMap, directives) {
    var e_1, _a;
    var actualNamedTypeMap = Object.create(null);
    // If any of the .name properties of the GraphQLNamedType objects in
    // schema.getTypeMap() have changed, the keys of the type map need to
    // be updated accordingly.
    for (var typeName in originalTypeMap) {
        var namedType = originalTypeMap[typeName];
        if (namedType == null || typeName.startsWith('__')) {
            continue;
        }
        var actualName = namedType.name;
        if (actualName.startsWith('__')) {
            continue;
        }
        if (actualName in actualNamedTypeMap) {
            throw new Error("Duplicate schema type name " + actualName);
        }
        actualNamedTypeMap[actualName] = namedType;
        // Note: we are deliberately leaving namedType in the schema by its
        // original name (which might be different from actualName), so that
        // references by that name can be healed.
    }
    // Now add back every named type by its actual name.
    for (var typeName in actualNamedTypeMap) {
        var namedType = actualNamedTypeMap[typeName];
        originalTypeMap[typeName] = namedType;
    }
    try {
        // Directive declaration argument types can refer to named types.
        for (var directives_1 = __values(directives), directives_1_1 = directives_1.next(); !directives_1_1.done; directives_1_1 = directives_1.next()) {
            var decl = directives_1_1.value;
            decl.args = decl.args.filter(function (arg) {
                arg.type = healType(arg.type);
                return arg.type !== null;
            });
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (directives_1_1 && !directives_1_1.done && (_a = directives_1.return)) _a.call(directives_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    for (var typeName in originalTypeMap) {
        var namedType = originalTypeMap[typeName];
        // Heal all named types, except for dangling references, kept only to redirect.
        if (!typeName.startsWith('__') && typeName in actualNamedTypeMap) {
            if (namedType != null) {
                healNamedType(namedType);
            }
        }
    }
    for (var typeName in originalTypeMap) {
        if (!typeName.startsWith('__') && !(typeName in actualNamedTypeMap)) {
            delete originalTypeMap[typeName];
        }
    }
    function healNamedType(type) {
        if (isObjectType(type)) {
            healFields(type);
            healInterfaces(type);
            return;
        }
        else if (isInterfaceType(type)) {
            healFields(type);
            if ('getInterfaces' in type) {
                healInterfaces(type);
            }
            return;
        }
        else if (isUnionType(type)) {
            healUnderlyingTypes(type);
            return;
        }
        else if (isInputObjectType(type)) {
            healInputFields(type);
            return;
        }
        else if (isLeafType(type)) {
            return;
        }
        throw new Error("Unexpected schema type: " + type);
    }
    function healFields(type) {
        var e_2, _a;
        var fieldMap = type.getFields();
        try {
            for (var _b = __values(Object.entries(fieldMap)), _c = _b.next(); !_c.done; _c = _b.next()) {
                var _d = __read(_c.value, 2), key = _d[0], field = _d[1];
                field.args
                    .map(function (arg) {
                    arg.type = healType(arg.type);
                    return arg.type === null ? null : arg;
                })
                    .filter(Boolean);
                field.type = healType(field.type);
                if (field.type === null) {
                    delete fieldMap[key];
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_2) throw e_2.error; }
        }
    }
    function healInterfaces(type) {
        if ('getInterfaces' in type) {
            var interfaces = type.getInterfaces();
            interfaces.push.apply(interfaces, __spreadArray([], __read(interfaces
                .splice(0)
                .map(function (iface) { return healType(iface); })
                .filter(Boolean)), false));
        }
    }
    function healInputFields(type) {
        var e_3, _a;
        var fieldMap = type.getFields();
        try {
            for (var _b = __values(Object.entries(fieldMap)), _c = _b.next(); !_c.done; _c = _b.next()) {
                var _d = __read(_c.value, 2), key = _d[0], field = _d[1];
                field.type = healType(field.type);
                if (field.type === null) {
                    delete fieldMap[key];
                }
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_3) throw e_3.error; }
        }
    }
    function healUnderlyingTypes(type) {
        var types = type.getTypes();
        types.push.apply(types, __spreadArray([], __read(types
            .splice(0)
            .map(function (t) { return healType(t); })
            .filter(Boolean)), false));
    }
    function healType(type) {
        // Unwrap the two known wrapper types
        if (isListType(type)) {
            var healedType = healType(type.ofType);
            return healedType != null ? new GraphQLList(healedType) : null;
        }
        else if (isNonNullType(type)) {
            var healedType = healType(type.ofType);
            return healedType != null ? new GraphQLNonNull(healedType) : null;
        }
        else if (isNamedType(type)) {
            // If a type annotation on a field or an argument or a union member is
            // any `GraphQLNamedType` with a `name`, then it must end up identical
            // to `schema.getType(name)`, since `schema.getTypeMap()` is the source
            // of truth for all named schema types.
            // Note that new types can still be simply added by adding a field, as
            // the official type will be undefined, not null.
            var officialType = originalTypeMap[type.name];
            if (officialType && type !== officialType) {
                return officialType;
            }
        }
        return type;
    }
}
