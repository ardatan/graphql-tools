import { __assign, __read, __values } from "tslib";
import { getNullableType, isAbstractType, isInterfaceType, isListType, isNamedType, isObjectType, isUnionType, parseValue, } from 'graphql';
import { getDirective, getImplementingTypes, isSome, MapperKind, mapSchema, parseSelectionSet, } from '@graphql-tools/utils';
import { defaultStitchingDirectiveOptions } from './defaultStitchingDirectiveOptions';
import { parseMergeArgsExpr } from './parseMergeArgsExpr';
var dottedNameRegEx = /^[_A-Za-z][_0-9A-Za-z]*(.[_A-Za-z][_0-9A-Za-z]*)*$/;
export function stitchingDirectivesValidator(options) {
    if (options === void 0) { options = {}; }
    var _a = __assign(__assign({}, defaultStitchingDirectiveOptions), options), keyDirectiveName = _a.keyDirectiveName, computedDirectiveName = _a.computedDirectiveName, mergeDirectiveName = _a.mergeDirectiveName, pathToDirectivesInExtensions = _a.pathToDirectivesInExtensions;
    return function (schema) {
        var _a;
        var _b;
        var queryTypeName = (_b = schema.getQueryType()) === null || _b === void 0 ? void 0 : _b.name;
        mapSchema(schema, (_a = {},
            _a[MapperKind.OBJECT_TYPE] = function (type) {
                var _a;
                var keyDirective = (_a = getDirective(schema, type, keyDirectiveName, pathToDirectivesInExtensions)) === null || _a === void 0 ? void 0 : _a[0];
                if (keyDirective != null) {
                    parseSelectionSet(keyDirective['selectionSet']);
                }
                return undefined;
            },
            _a[MapperKind.OBJECT_FIELD] = function (fieldConfig, _fieldName, typeName) {
                var e_1, _a, e_2, _b;
                var _c, _d, _e;
                var computedDirective = (_c = getDirective(schema, fieldConfig, computedDirectiveName, pathToDirectivesInExtensions)) === null || _c === void 0 ? void 0 : _c[0];
                if (computedDirective != null) {
                    parseSelectionSet(computedDirective['selectionSet']);
                }
                var mergeDirective = (_d = getDirective(schema, fieldConfig, mergeDirectiveName, pathToDirectivesInExtensions)) === null || _d === void 0 ? void 0 : _d[0];
                if (mergeDirective != null) {
                    if (typeName !== queryTypeName) {
                        throw new Error('@merge directive may be used only for root fields of the root Query type.');
                    }
                    var returnType = getNullableType(fieldConfig.type);
                    if (isListType(returnType)) {
                        returnType = getNullableType(returnType.ofType);
                    }
                    if (!isNamedType(returnType)) {
                        throw new Error('@merge directive must be used on a field that returns an object or a list of objects.');
                    }
                    var mergeArgsExpr = mergeDirective['argsExpr'];
                    if (mergeArgsExpr != null) {
                        parseMergeArgsExpr(mergeArgsExpr);
                    }
                    var args = Object.keys((_e = fieldConfig.args) !== null && _e !== void 0 ? _e : {});
                    var keyArg = mergeDirective['keyArg'];
                    if (keyArg == null) {
                        if (!mergeArgsExpr && args.length !== 1) {
                            throw new Error('Cannot use @merge directive without `keyArg` argument if resolver takes more than one argument.');
                        }
                    }
                    else if (!keyArg.match(dottedNameRegEx)) {
                        throw new Error('`keyArg` argument for @merge directive must be a set of valid GraphQL SDL names separated by periods.');
                        // TODO: ideally we should check that the arg exists for the resolver
                    }
                    var keyField = mergeDirective['keyField'];
                    if (keyField != null && !keyField.match(dottedNameRegEx)) {
                        throw new Error('`keyField` argument for @merge directive must be a set of valid GraphQL SDL names separated by periods.');
                        // TODO: ideally we should check that it is part of the key
                    }
                    var key = mergeDirective['key'];
                    if (key != null) {
                        if (keyField != null) {
                            throw new Error('Cannot use @merge directive with both `keyField` and `key` arguments.');
                        }
                        try {
                            for (var key_1 = __values(key), key_1_1 = key_1.next(); !key_1_1.done; key_1_1 = key_1.next()) {
                                var keyDef = key_1_1.value;
                                var _f = __read(keyDef.split(':'), 2), aliasOrKeyPath = _f[0], keyPath = _f[1];
                                var aliasPath = void 0;
                                if (keyPath == null) {
                                    keyPath = aliasPath = aliasOrKeyPath;
                                }
                                else {
                                    aliasPath = aliasOrKeyPath;
                                }
                                if (keyPath != null && !keyPath.match(dottedNameRegEx)) {
                                    throw new Error('Each partial key within the `key` argument for @merge directive must be a set of valid GraphQL SDL names separated by periods.');
                                    // TODO: ideally we should check that it is part of the key
                                }
                                if (aliasPath != null && !aliasOrKeyPath.match(dottedNameRegEx)) {
                                    throw new Error('Each alias within the `key` argument for @merge directive must be a set of valid GraphQL SDL names separated by periods.');
                                    // TODO: ideally we should check that the arg exists within the resolver
                                }
                            }
                        }
                        catch (e_1_1) { e_1 = { error: e_1_1 }; }
                        finally {
                            try {
                                if (key_1_1 && !key_1_1.done && (_a = key_1.return)) _a.call(key_1);
                            }
                            finally { if (e_1) throw e_1.error; }
                        }
                    }
                    var additionalArgs = mergeDirective['additionalArgs'];
                    if (additionalArgs != null) {
                        parseValue("{ " + additionalArgs + " }", { noLocation: true });
                    }
                    if (mergeArgsExpr != null && (keyArg != null || additionalArgs != null)) {
                        throw new Error('Cannot use @merge directive with both `argsExpr` argument and any additional argument.');
                    }
                    if (!isInterfaceType(returnType) && !isUnionType(returnType) && !isObjectType(returnType)) {
                        throw new Error('@merge directive may be used only with resolver that return an object, interface, or union.');
                    }
                    var typeNames = mergeDirective['types'];
                    if (typeNames != null) {
                        if (!isAbstractType(returnType)) {
                            throw new Error('Types argument can only be used with a field that returns an abstract type.');
                        }
                        var implementingTypes = isInterfaceType(returnType)
                            ? getImplementingTypes(returnType.name, schema).map(function (typeName) { return schema.getType(typeName); })
                            : returnType.getTypes();
                        var implementingTypeNames = implementingTypes.map(function (type) { return type === null || type === void 0 ? void 0 : type.name; }).filter(isSome);
                        try {
                            for (var typeNames_1 = __values(typeNames), typeNames_1_1 = typeNames_1.next(); !typeNames_1_1.done; typeNames_1_1 = typeNames_1.next()) {
                                var typeName_1 = typeNames_1_1.value;
                                if (!implementingTypeNames.includes(typeName_1)) {
                                    throw new Error("Types argument can only include only type names that implement the field return type's abstract type.");
                                }
                            }
                        }
                        catch (e_2_1) { e_2 = { error: e_2_1 }; }
                        finally {
                            try {
                                if (typeNames_1_1 && !typeNames_1_1.done && (_b = typeNames_1.return)) _b.call(typeNames_1);
                            }
                            finally { if (e_2) throw e_2.error; }
                        }
                    }
                }
                return undefined;
            },
            _a));
        return schema;
    };
}
