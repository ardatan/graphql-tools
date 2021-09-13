// addTypes uses toConfig to create a new schema with a new or replaced
// type or directive. Rewiring is employed so that the replaced type can be
// reconnected with the existing types.
//
// Rewiring is employed even for new types or directives as a convenience, so
// that type references within the new type or directive do not have to be to
// the identical objects within the original schema.
//
// In fact, the type references could even be stub types with entirely different
// fields, as long as the type references share the same name as the desired
// type within the original schema's type map.
//
// This makes it easy to perform simple schema operations (e.g. adding a new
// type with a fiew fields removed from an existing type) that could normally be
// performed by using toConfig directly, but is blocked if any intervening
// more advanced schema operations have caused the types to be recreated via
// rewiring.
//
// Type recreation happens, for example, with every use of mapSchema, as the
// types are always rewired. If fields are selected and removed using
// mapSchema, adding those fields to a new type can no longer be simply done
// by toConfig, as the types are not the identical JavaScript objects, and
// schema creation will fail with errors referencing multiple types with the
// same names.
//
// enhanceSchema can fill this gap by adding an additional round of rewiring.
//
import { __assign, __values } from "tslib";
import { GraphQLSchema, isNamedType, isDirective } from 'graphql';
import { getObjectTypeFromTypeMap } from './getObjectTypeFromTypeMap';
import { rewireTypes } from './rewire';
export function addTypes(schema, newTypesOrDirectives) {
    var e_1, _a, e_2, _b, e_3, _c;
    var config = schema.toConfig();
    var originalTypeMap = {};
    try {
        for (var _d = __values(config.types), _e = _d.next(); !_e.done; _e = _d.next()) {
            var type = _e.value;
            originalTypeMap[type.name] = type;
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
        }
        finally { if (e_1) throw e_1.error; }
    }
    var originalDirectiveMap = {};
    try {
        for (var _f = __values(config.directives), _g = _f.next(); !_g.done; _g = _f.next()) {
            var directive = _g.value;
            originalDirectiveMap[directive.name] = directive;
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
        }
        finally { if (e_2) throw e_2.error; }
    }
    try {
        for (var newTypesOrDirectives_1 = __values(newTypesOrDirectives), newTypesOrDirectives_1_1 = newTypesOrDirectives_1.next(); !newTypesOrDirectives_1_1.done; newTypesOrDirectives_1_1 = newTypesOrDirectives_1.next()) {
            var newTypeOrDirective = newTypesOrDirectives_1_1.value;
            if (isNamedType(newTypeOrDirective)) {
                originalTypeMap[newTypeOrDirective.name] = newTypeOrDirective;
            }
            else if (isDirective(newTypeOrDirective)) {
                originalDirectiveMap[newTypeOrDirective.name] = newTypeOrDirective;
            }
        }
    }
    catch (e_3_1) { e_3 = { error: e_3_1 }; }
    finally {
        try {
            if (newTypesOrDirectives_1_1 && !newTypesOrDirectives_1_1.done && (_c = newTypesOrDirectives_1.return)) _c.call(newTypesOrDirectives_1);
        }
        finally { if (e_3) throw e_3.error; }
    }
    var _h = rewireTypes(originalTypeMap, Object.values(originalDirectiveMap)), typeMap = _h.typeMap, directives = _h.directives;
    return new GraphQLSchema(__assign(__assign({}, config), { query: getObjectTypeFromTypeMap(typeMap, schema.getQueryType()), mutation: getObjectTypeFromTypeMap(typeMap, schema.getMutationType()), subscription: getObjectTypeFromTypeMap(typeMap, schema.getSubscriptionType()), types: Object.values(typeMap), directives: directives }));
}
