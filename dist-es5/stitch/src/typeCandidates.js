import { __assign, __read, __values } from "tslib";
import { getNamedType, isNamedType, isSpecifiedScalarType, isDirective, } from 'graphql';
import { wrapSchema } from '@graphql-tools/wrap';
import { rewireTypes, getRootTypeMap, inspect, getRootTypes, } from '@graphql-tools/utils';
import typeFromAST from './typeFromAST';
import { mergeCandidates } from './mergeCandidates';
import { extractDefinitions } from './definitions';
import { mergeTypeDefs } from '@graphql-tools/merge';
export function buildTypeCandidates(_a) {
    var e_1, _b, e_2, _c, e_3, _d, e_4, _e, e_5, _f, e_6, _g;
    var subschemas = _a.subschemas, originalSubschemaMap = _a.originalSubschemaMap, types = _a.types, typeDefs = _a.typeDefs, parseOptions = _a.parseOptions, extensions = _a.extensions, directiveMap = _a.directiveMap, schemaDefs = _a.schemaDefs, mergeDirectives = _a.mergeDirectives;
    var typeCandidates = Object.create(null);
    var schemaDef;
    var schemaExtensions = [];
    var document;
    var extraction;
    if ((typeDefs && !Array.isArray(typeDefs)) || (Array.isArray(typeDefs) && typeDefs.length)) {
        document = mergeTypeDefs(typeDefs, parseOptions);
        extraction = extractDefinitions(document);
        schemaDef = extraction.schemaDefs[0];
        schemaExtensions = schemaExtensions.concat(extraction.schemaExtensions);
    }
    schemaDefs.schemaDef = schemaDef !== null && schemaDef !== void 0 ? schemaDef : schemaDefs.schemaDef;
    schemaDefs.schemaExtensions = schemaExtensions;
    var rootTypeNameMap = getRootTypeNameMap(schemaDefs);
    try {
        for (var subschemas_1 = __values(subschemas), subschemas_1_1 = subschemas_1.next(); !subschemas_1_1.done; subschemas_1_1 = subschemas_1.next()) {
            var subschema = subschemas_1_1.value;
            var schema = wrapSchema(subschema);
            var rootTypeMap = getRootTypeMap(schema);
            var rootTypes = getRootTypes(schema);
            try {
                for (var _h = (e_2 = void 0, __values(rootTypeMap.entries())), _j = _h.next(); !_j.done; _j = _h.next()) {
                    var _k = __read(_j.value, 2), operation = _k[0], rootType = _k[1];
                    addTypeCandidate(typeCandidates, rootTypeNameMap[operation], {
                        type: rootType,
                        subschema: originalSubschemaMap.get(subschema),
                        transformedSubschema: subschema,
                    });
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_j && !_j.done && (_c = _h.return)) _c.call(_h);
                }
                finally { if (e_2) throw e_2.error; }
            }
            if (mergeDirectives === true) {
                try {
                    for (var _l = (e_3 = void 0, __values(schema.getDirectives())), _m = _l.next(); !_m.done; _m = _l.next()) {
                        var directive = _m.value;
                        directiveMap[directive.name] = directive;
                    }
                }
                catch (e_3_1) { e_3 = { error: e_3_1 }; }
                finally {
                    try {
                        if (_m && !_m.done && (_d = _l.return)) _d.call(_l);
                    }
                    finally { if (e_3) throw e_3.error; }
                }
            }
            var originalTypeMap = schema.getTypeMap();
            for (var typeName in originalTypeMap) {
                var type = originalTypeMap[typeName];
                if (isNamedType(type) &&
                    getNamedType(type).name.slice(0, 2) !== '__' &&
                    !rootTypes.has(type)) {
                    addTypeCandidate(typeCandidates, type.name, {
                        type: type,
                        subschema: originalSubschemaMap.get(subschema),
                        transformedSubschema: subschema,
                    });
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
    if (document != null && extraction != null) {
        try {
            for (var _o = __values(extraction.typeDefinitions), _p = _o.next(); !_p.done; _p = _o.next()) {
                var def = _p.value;
                var type = typeFromAST(def);
                if (!isNamedType(type)) {
                    throw new Error("Expected to get named typed but got " + inspect(def));
                }
                if (type != null) {
                    addTypeCandidate(typeCandidates, type.name, { type: type });
                }
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (_p && !_p.done && (_e = _o.return)) _e.call(_o);
            }
            finally { if (e_4) throw e_4.error; }
        }
        try {
            for (var _q = __values(extraction.directiveDefs), _r = _q.next(); !_r.done; _r = _q.next()) {
                var def = _r.value;
                var directive = typeFromAST(def);
                if (!isDirective(directive)) {
                    throw new Error("Expected to get directive type but got " + inspect(def));
                }
                directiveMap[directive.name] = directive;
            }
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (_r && !_r.done && (_f = _q.return)) _f.call(_q);
            }
            finally { if (e_5) throw e_5.error; }
        }
        if (extraction.extensionDefs.length > 0) {
            extensions.push(__assign(__assign({}, document), { definitions: extraction.extensionDefs }));
        }
    }
    try {
        for (var types_1 = __values(types), types_1_1 = types_1.next(); !types_1_1.done; types_1_1 = types_1.next()) {
            var type = types_1_1.value;
            addTypeCandidate(typeCandidates, type.name, { type: type });
        }
    }
    catch (e_6_1) { e_6 = { error: e_6_1 }; }
    finally {
        try {
            if (types_1_1 && !types_1_1.done && (_g = types_1.return)) _g.call(types_1);
        }
        finally { if (e_6) throw e_6.error; }
    }
    return [typeCandidates, rootTypeNameMap];
}
function getRootTypeNameMap(_a) {
    var e_7, _b, e_8, _c;
    var schemaDef = _a.schemaDef, schemaExtensions = _a.schemaExtensions;
    var rootTypeNameMap = {
        query: 'Query',
        mutation: 'Mutation',
        subscription: 'Subscription',
    };
    var allNodes = schemaExtensions.slice();
    if (schemaDef != null) {
        allNodes.unshift(schemaDef);
    }
    try {
        for (var allNodes_1 = __values(allNodes), allNodes_1_1 = allNodes_1.next(); !allNodes_1_1.done; allNodes_1_1 = allNodes_1.next()) {
            var node = allNodes_1_1.value;
            if (node.operationTypes != null) {
                try {
                    for (var _d = (e_8 = void 0, __values(node.operationTypes)), _e = _d.next(); !_e.done; _e = _d.next()) {
                        var operationType = _e.value;
                        rootTypeNameMap[operationType.operation] = operationType.type.name.value;
                    }
                }
                catch (e_8_1) { e_8 = { error: e_8_1 }; }
                finally {
                    try {
                        if (_e && !_e.done && (_c = _d.return)) _c.call(_d);
                    }
                    finally { if (e_8) throw e_8.error; }
                }
            }
        }
    }
    catch (e_7_1) { e_7 = { error: e_7_1 }; }
    finally {
        try {
            if (allNodes_1_1 && !allNodes_1_1.done && (_b = allNodes_1.return)) _b.call(allNodes_1);
        }
        finally { if (e_7) throw e_7.error; }
    }
    return rootTypeNameMap;
}
function addTypeCandidate(typeCandidates, name, typeCandidate) {
    if (!(name in typeCandidates)) {
        typeCandidates[name] = [];
    }
    typeCandidates[name].push(typeCandidate);
}
export function buildTypes(_a) {
    var typeCandidates = _a.typeCandidates, directives = _a.directives, stitchingInfo = _a.stitchingInfo, rootTypeNames = _a.rootTypeNames, onTypeConflict = _a.onTypeConflict, mergeTypes = _a.mergeTypes, typeMergingOptions = _a.typeMergingOptions;
    var typeMap = Object.create(null);
    for (var typeName in typeCandidates) {
        if (rootTypeNames.includes(typeName) ||
            (mergeTypes === true && !typeCandidates[typeName].some(function (candidate) { return isSpecifiedScalarType(candidate.type); })) ||
            (typeof mergeTypes === 'function' && mergeTypes(typeCandidates[typeName], typeName)) ||
            (Array.isArray(mergeTypes) && mergeTypes.includes(typeName)) ||
            (stitchingInfo != null && typeName in stitchingInfo.mergedTypes)) {
            typeMap[typeName] = mergeCandidates(typeName, typeCandidates[typeName], typeMergingOptions);
        }
        else {
            var candidateSelector = onTypeConflict != null
                ? onTypeConflictToCandidateSelector(onTypeConflict)
                : function (cands) { return cands[cands.length - 1]; };
            typeMap[typeName] = candidateSelector(typeCandidates[typeName]).type;
        }
    }
    return rewireTypes(typeMap, directives);
}
function onTypeConflictToCandidateSelector(onTypeConflict) {
    return function (cands) {
        return cands.reduce(function (prev, next) {
            var type = onTypeConflict(prev.type, next.type, {
                left: {
                    subschema: prev.subschema,
                    transformedSubschema: prev.transformedSubschema,
                },
                right: {
                    subschema: next.subschema,
                    transformedSubschema: next.transformedSubschema,
                },
            });
            if (prev.type === type) {
                return prev;
            }
            else if (next.type === type) {
                return next;
            }
            return {
                schemaName: 'unknown',
                type: type,
            };
        });
    };
}
