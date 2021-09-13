import { __read, __values } from "tslib";
import { GraphQLSchema, specifiedDirectives, extendSchema, } from 'graphql';
import { pruneSchema } from '@graphql-tools/utils';
import { addResolversToSchema, assertResolversPresent, extendResolversFromInterfaces } from '@graphql-tools/schema';
import { isSubschemaConfig, Subschema, defaultMergedResolver } from '@graphql-tools/delegate';
import { buildTypeCandidates, buildTypes } from './typeCandidates';
import { createStitchingInfo, completeStitchingInfo, addStitchingInfo } from './stitchingInfo';
import { defaultSubschemaConfigTransforms, isolateComputedFieldsTransformer, splitMergedTypeEntryPointsTransformer, } from './subschemaConfigTransforms';
import { applyExtensions, mergeExtensions, mergeResolvers } from '@graphql-tools/merge';
export function stitchSchemas(_a) {
    var e_1, _b, e_2, _c, e_3, _d, e_4, _e, e_5, _f, e_6, _g;
    var _h = _a.subschemas, subschemas = _h === void 0 ? [] : _h, _j = _a.types, types = _j === void 0 ? [] : _j, typeDefs = _a.typeDefs, onTypeConflict = _a.onTypeConflict, mergeDirectives = _a.mergeDirectives, _k = _a.mergeTypes, mergeTypes = _k === void 0 ? true : _k, typeMergingOptions = _a.typeMergingOptions, _l = _a.subschemaConfigTransforms, subschemaConfigTransforms = _l === void 0 ? defaultSubschemaConfigTransforms : _l, _m = _a.resolvers, resolvers = _m === void 0 ? {} : _m, _o = _a.inheritResolversFromInterfaces, inheritResolversFromInterfaces = _o === void 0 ? false : _o, _p = _a.resolverValidationOptions, resolverValidationOptions = _p === void 0 ? {} : _p, _q = _a.parseOptions, parseOptions = _q === void 0 ? {} : _q, pruningOptions = _a.pruningOptions, updateResolversInPlace = _a.updateResolversInPlace, schemaExtensions = _a.schemaExtensions;
    if (typeof resolverValidationOptions !== 'object') {
        throw new Error('Expected `resolverValidationOptions` to be an object');
    }
    var transformedSubschemas = [];
    var subschemaMap = new Map();
    var originalSubschemaMap = new Map();
    try {
        for (var subschemas_1 = __values(subschemas), subschemas_1_1 = subschemas_1.next(); !subschemas_1_1.done; subschemas_1_1 = subschemas_1.next()) {
            var subschemaOrSubschemaArray = subschemas_1_1.value;
            if (Array.isArray(subschemaOrSubschemaArray)) {
                try {
                    for (var subschemaOrSubschemaArray_1 = (e_2 = void 0, __values(subschemaOrSubschemaArray)), subschemaOrSubschemaArray_1_1 = subschemaOrSubschemaArray_1.next(); !subschemaOrSubschemaArray_1_1.done; subschemaOrSubschemaArray_1_1 = subschemaOrSubschemaArray_1.next()) {
                        var s = subschemaOrSubschemaArray_1_1.value;
                        try {
                            for (var _r = (e_3 = void 0, __values(applySubschemaConfigTransforms(subschemaConfigTransforms, s, subschemaMap, originalSubschemaMap))), _s = _r.next(); !_s.done; _s = _r.next()) {
                                var transformedSubschemaConfig = _s.value;
                                transformedSubschemas.push(transformedSubschemaConfig);
                            }
                        }
                        catch (e_3_1) { e_3 = { error: e_3_1 }; }
                        finally {
                            try {
                                if (_s && !_s.done && (_d = _r.return)) _d.call(_r);
                            }
                            finally { if (e_3) throw e_3.error; }
                        }
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (subschemaOrSubschemaArray_1_1 && !subschemaOrSubschemaArray_1_1.done && (_c = subschemaOrSubschemaArray_1.return)) _c.call(subschemaOrSubschemaArray_1);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
            else {
                try {
                    for (var _t = (e_4 = void 0, __values(applySubschemaConfigTransforms(subschemaConfigTransforms, subschemaOrSubschemaArray, subschemaMap, originalSubschemaMap))), _u = _t.next(); !_u.done; _u = _t.next()) {
                        var transformedSubschemaConfig = _u.value;
                        transformedSubschemas.push(transformedSubschemaConfig);
                    }
                }
                catch (e_4_1) { e_4 = { error: e_4_1 }; }
                finally {
                    try {
                        if (_u && !_u.done && (_e = _t.return)) _e.call(_t);
                    }
                    finally { if (e_4) throw e_4.error; }
                }
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (subschemas_1_1 && !subschemas_1_1.done && (_b = subschemas_1.return)) _b.call(subschemas_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    var extensions = [];
    var directiveMap = Object.create(null);
    try {
        for (var specifiedDirectives_1 = __values(specifiedDirectives), specifiedDirectives_1_1 = specifiedDirectives_1.next(); !specifiedDirectives_1_1.done; specifiedDirectives_1_1 = specifiedDirectives_1.next()) {
            var directive = specifiedDirectives_1_1.value;
            directiveMap[directive.name] = directive;
        }
    }
    catch (e_5_1) { e_5 = { error: e_5_1 }; }
    finally {
        try {
            if (specifiedDirectives_1_1 && !specifiedDirectives_1_1.done && (_f = specifiedDirectives_1.return)) _f.call(specifiedDirectives_1);
        }
        finally { if (e_5) throw e_5.error; }
    }
    var schemaDefs = Object.create(null);
    var _v = __read(buildTypeCandidates({
        subschemas: transformedSubschemas,
        originalSubschemaMap: originalSubschemaMap,
        types: types,
        typeDefs: typeDefs || [],
        parseOptions: parseOptions,
        extensions: extensions,
        directiveMap: directiveMap,
        schemaDefs: schemaDefs,
        mergeDirectives: mergeDirectives,
    }), 2), typeCandidates = _v[0], rootTypeNameMap = _v[1];
    var stitchingInfo = createStitchingInfo(subschemaMap, typeCandidates, mergeTypes);
    var _w = buildTypes({
        typeCandidates: typeCandidates,
        directives: Object.values(directiveMap),
        stitchingInfo: stitchingInfo,
        rootTypeNames: Object.values(rootTypeNameMap),
        onTypeConflict: onTypeConflict,
        mergeTypes: mergeTypes,
        typeMergingOptions: typeMergingOptions,
    }), newTypeMap = _w.typeMap, newDirectives = _w.directives;
    var schema = new GraphQLSchema({
        query: newTypeMap[rootTypeNameMap.query],
        mutation: newTypeMap[rootTypeNameMap.mutation],
        subscription: newTypeMap[rootTypeNameMap.subscription],
        types: Object.values(newTypeMap),
        directives: newDirectives,
        astNode: schemaDefs.schemaDef,
        extensionASTNodes: schemaDefs.schemaExtensions,
        extensions: null,
    });
    try {
        for (var extensions_1 = __values(extensions), extensions_1_1 = extensions_1.next(); !extensions_1_1.done; extensions_1_1 = extensions_1.next()) {
            var extension = extensions_1_1.value;
            schema = extendSchema(schema, extension, {
                commentDescriptions: true,
            });
        }
    }
    catch (e_6_1) { e_6 = { error: e_6_1 }; }
    finally {
        try {
            if (extensions_1_1 && !extensions_1_1.done && (_g = extensions_1.return)) _g.call(extensions_1);
        }
        finally { if (e_6) throw e_6.error; }
    }
    // We allow passing in an array of resolver maps, in which case we merge them
    var resolverMap = mergeResolvers(resolvers);
    var finalResolvers = inheritResolversFromInterfaces
        ? extendResolversFromInterfaces(schema, resolverMap)
        : resolverMap;
    stitchingInfo = completeStitchingInfo(stitchingInfo, finalResolvers, schema);
    schema = addResolversToSchema({
        schema: schema,
        defaultFieldResolver: defaultMergedResolver,
        resolvers: finalResolvers,
        resolverValidationOptions: resolverValidationOptions,
        inheritResolversFromInterfaces: false,
        updateResolversInPlace: updateResolversInPlace,
    });
    if (Object.keys(resolverValidationOptions).length > 0 &&
        Object.values(resolverValidationOptions).some(function (o) { return o !== 'ignore'; })) {
        assertResolversPresent(schema, resolverValidationOptions);
    }
    schema = addStitchingInfo(schema, stitchingInfo);
    if (pruningOptions) {
        schema = pruneSchema(schema, pruningOptions);
    }
    if (schemaExtensions) {
        if (Array.isArray(schemaExtensions)) {
            schemaExtensions = mergeExtensions(schemaExtensions);
        }
        applyExtensions(schema, schemaExtensions);
    }
    return schema;
}
var subschemaConfigTransformerPresets = [
    isolateComputedFieldsTransformer,
    splitMergedTypeEntryPointsTransformer,
];
function applySubschemaConfigTransforms(subschemaConfigTransforms, subschemaOrSubschemaConfig, subschemaMap, originalSubschemaMap) {
    var e_7, _a;
    var subschemaConfig;
    if (isSubschemaConfig(subschemaOrSubschemaConfig)) {
        subschemaConfig = subschemaOrSubschemaConfig;
    }
    else if (subschemaOrSubschemaConfig instanceof GraphQLSchema) {
        subschemaConfig = { schema: subschemaOrSubschemaConfig };
    }
    else {
        throw new TypeError('Received invalid input.');
    }
    var transformedSubschemaConfigs = subschemaConfigTransforms
        .concat(subschemaConfigTransformerPresets)
        .reduce(function (transformedSubschemaConfigs, subschemaConfigTransform) {
        return transformedSubschemaConfigs.flatMap(function (ssConfig) { return subschemaConfigTransform(ssConfig); });
    }, [subschemaConfig]);
    var transformedSubschemas = transformedSubschemaConfigs.map(function (ssConfig) { return new Subschema(ssConfig); });
    var baseSubschema = transformedSubschemas[0];
    subschemaMap.set(subschemaOrSubschemaConfig, baseSubschema);
    try {
        for (var transformedSubschemas_1 = __values(transformedSubschemas), transformedSubschemas_1_1 = transformedSubschemas_1.next(); !transformedSubschemas_1_1.done; transformedSubschemas_1_1 = transformedSubschemas_1.next()) {
            var subschema = transformedSubschemas_1_1.value;
            originalSubschemaMap.set(subschema, subschemaOrSubschemaConfig);
        }
    }
    catch (e_7_1) { e_7 = { error: e_7_1 }; }
    finally {
        try {
            if (transformedSubschemas_1_1 && !transformedSubschemas_1_1.done && (_a = transformedSubschemas_1.return)) _a.call(transformedSubschemas_1);
        }
        finally { if (e_7) throw e_7.error; }
    }
    return transformedSubschemas;
}
