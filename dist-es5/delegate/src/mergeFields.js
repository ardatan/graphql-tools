import { __awaiter, __generator, __read, __spreadArray, __values } from "tslib";
import { responsePathAsArray, GraphQLError, locatedError, } from 'graphql';
import { collectFields, relocatedError } from '@graphql-tools/utils';
import { FIELD_SUBSCHEMA_MAP_SYMBOL, OBJECT_SUBSCHEMA_SYMBOL, UNPATHED_ERRORS_SYMBOL } from './symbols';
export function isExternalObject(data) {
    return data[UNPATHED_ERRORS_SYMBOL] !== undefined;
}
export function annotateExternalObject(object, errors, subschema, subschemaMap) {
    var _a;
    Object.defineProperties(object, (_a = {},
        _a[OBJECT_SUBSCHEMA_SYMBOL] = { value: subschema },
        _a[FIELD_SUBSCHEMA_MAP_SYMBOL] = { value: subschemaMap },
        _a[UNPATHED_ERRORS_SYMBOL] = { value: errors },
        _a));
    return object;
}
export function getSubschema(object, responseKey) {
    var _a;
    return (_a = object[FIELD_SUBSCHEMA_MAP_SYMBOL][responseKey]) !== null && _a !== void 0 ? _a : object[OBJECT_SUBSCHEMA_SYMBOL];
}
export function getUnpathedErrors(object) {
    return object[UNPATHED_ERRORS_SYMBOL];
}
var EMPTY_ARRAY = [];
var EMPTY_OBJECT = Object.create(null);
export function mergeFields(mergedTypeInfo, object, sourceSubschema, context, info) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var delegationMaps, delegationMaps_1, delegationMaps_1_1, delegationMap, e_1_1;
        var e_1, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    delegationMaps = mergedTypeInfo.delegationPlanBuilder(info.schema, sourceSubschema, info.variableValues != null && Object.keys(info.variableValues).length > 0 ? info.variableValues : EMPTY_OBJECT, info.fragments != null && Object.keys(info.fragments).length > 0 ? info.fragments : EMPTY_OBJECT, ((_a = info.fieldNodes) === null || _a === void 0 ? void 0 : _a.length) ? info.fieldNodes : EMPTY_ARRAY);
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 6, 7, 8]);
                    delegationMaps_1 = __values(delegationMaps), delegationMaps_1_1 = delegationMaps_1.next();
                    _c.label = 2;
                case 2:
                    if (!!delegationMaps_1_1.done) return [3 /*break*/, 5];
                    delegationMap = delegationMaps_1_1.value;
                    return [4 /*yield*/, executeDelegationStage(mergedTypeInfo, delegationMap, object, context, info)];
                case 3:
                    _c.sent();
                    _c.label = 4;
                case 4:
                    delegationMaps_1_1 = delegationMaps_1.next();
                    return [3 /*break*/, 2];
                case 5: return [3 /*break*/, 8];
                case 6:
                    e_1_1 = _c.sent();
                    e_1 = { error: e_1_1 };
                    return [3 /*break*/, 8];
                case 7:
                    try {
                        if (delegationMaps_1_1 && !delegationMaps_1_1.done && (_b = delegationMaps_1.return)) _b.call(delegationMaps_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                    return [7 /*endfinally*/];
                case 8: return [2 /*return*/, object];
            }
        });
    });
}
function executeDelegationStage(mergedTypeInfo, delegationMap, object, context, info) {
    return __awaiter(this, void 0, void 0, function () {
        var combinedErrors, path, combinedFieldSubschemaMap, type;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    combinedErrors = object[UNPATHED_ERRORS_SYMBOL];
                    path = responsePathAsArray(info.path);
                    combinedFieldSubschemaMap = object[FIELD_SUBSCHEMA_MAP_SYMBOL];
                    type = info.schema.getType(object.__typename);
                    return [4 /*yield*/, Promise.all(__spreadArray([], __read(delegationMap.entries()), false).map(function (_a) {
                            var _b = __read(_a, 2), s = _b[0], selectionSet = _b[1];
                            return __awaiter(_this, void 0, void 0, function () {
                                var resolver, source, error_1, fieldNodeResponseKeyMap, nullResult, fieldNodeResponseKeyMap_1, fieldNodeResponseKeyMap_1_1, _c, responseKey, fieldNodes, combinedPath, objectSubschema, fieldSubschemaMap, responseKey;
                                var e_2, _d;
                                var _e;
                                return __generator(this, function (_f) {
                                    switch (_f.label) {
                                        case 0:
                                            resolver = mergedTypeInfo.resolvers.get(s);
                                            if (!resolver) return [3 /*break*/, 5];
                                            source = void 0;
                                            _f.label = 1;
                                        case 1:
                                            _f.trys.push([1, 3, , 4]);
                                            return [4 /*yield*/, resolver(object, context, info, s, selectionSet)];
                                        case 2:
                                            source = _f.sent();
                                            return [3 /*break*/, 4];
                                        case 3:
                                            error_1 = _f.sent();
                                            source = error_1;
                                            return [3 /*break*/, 4];
                                        case 4:
                                            if (source instanceof Error || source == null) {
                                                fieldNodeResponseKeyMap = collectFields(info.schema, {}, {}, type, selectionSet, new Map(), new Set());
                                                nullResult = {};
                                                try {
                                                    for (fieldNodeResponseKeyMap_1 = __values(fieldNodeResponseKeyMap), fieldNodeResponseKeyMap_1_1 = fieldNodeResponseKeyMap_1.next(); !fieldNodeResponseKeyMap_1_1.done; fieldNodeResponseKeyMap_1_1 = fieldNodeResponseKeyMap_1.next()) {
                                                        _c = __read(fieldNodeResponseKeyMap_1_1.value, 2), responseKey = _c[0], fieldNodes = _c[1];
                                                        combinedPath = __spreadArray(__spreadArray([], __read(path), false), [responseKey], false);
                                                        if (source instanceof GraphQLError) {
                                                            nullResult[responseKey] = relocatedError(source, combinedPath);
                                                        }
                                                        else if (source instanceof Error) {
                                                            nullResult[responseKey] = locatedError(source, fieldNodes, combinedPath);
                                                        }
                                                        else {
                                                            nullResult[responseKey] = null;
                                                        }
                                                    }
                                                }
                                                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                                                finally {
                                                    try {
                                                        if (fieldNodeResponseKeyMap_1_1 && !fieldNodeResponseKeyMap_1_1.done && (_d = fieldNodeResponseKeyMap_1.return)) _d.call(fieldNodeResponseKeyMap_1);
                                                    }
                                                    finally { if (e_2) throw e_2.error; }
                                                }
                                                source = nullResult;
                                            }
                                            else {
                                                if (source[UNPATHED_ERRORS_SYMBOL]) {
                                                    combinedErrors.push.apply(combinedErrors, __spreadArray([], __read(source[UNPATHED_ERRORS_SYMBOL]), false));
                                                }
                                            }
                                            objectSubschema = source[OBJECT_SUBSCHEMA_SYMBOL];
                                            fieldSubschemaMap = source[FIELD_SUBSCHEMA_MAP_SYMBOL];
                                            for (responseKey in source) {
                                                object[responseKey] = source[responseKey];
                                                combinedFieldSubschemaMap[responseKey] = (_e = fieldSubschemaMap === null || fieldSubschemaMap === void 0 ? void 0 : fieldSubschemaMap[responseKey]) !== null && _e !== void 0 ? _e : objectSubschema;
                                            }
                                            _f.label = 5;
                                        case 5: return [2 /*return*/];
                                    }
                                });
                            });
                        }))];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
