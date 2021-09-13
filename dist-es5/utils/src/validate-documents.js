import { __awaiter, __generator, __read, __spreadArray, __values } from "tslib";
import { Kind, validate, specifiedRules, concatAST, } from 'graphql';
import { AggregateError } from './AggregateError';
export function validateGraphQlDocuments(schema, documentFiles, effectiveRules) {
    return __awaiter(this, void 0, void 0, function () {
        var allFragmentMap, documentFileObjectsToValidate, documentFiles_1, documentFiles_1_1, documentFile, definitionsToValidate, _a, _b, definitionNode, allErrors, allFragmentsDocument;
        var e_1, _c, e_2, _d;
        var _this = this;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    effectiveRules = effectiveRules || createDefaultRules();
                    allFragmentMap = new Map();
                    documentFileObjectsToValidate = [];
                    try {
                        for (documentFiles_1 = __values(documentFiles), documentFiles_1_1 = documentFiles_1.next(); !documentFiles_1_1.done; documentFiles_1_1 = documentFiles_1.next()) {
                            documentFile = documentFiles_1_1.value;
                            if (documentFile.document) {
                                definitionsToValidate = [];
                                try {
                                    for (_a = (e_2 = void 0, __values(documentFile.document.definitions)), _b = _a.next(); !_b.done; _b = _a.next()) {
                                        definitionNode = _b.value;
                                        if (definitionNode.kind === Kind.FRAGMENT_DEFINITION) {
                                            allFragmentMap.set(definitionNode.name.value, definitionNode);
                                        }
                                        else {
                                            definitionsToValidate.push(definitionNode);
                                        }
                                    }
                                }
                                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                                finally {
                                    try {
                                        if (_b && !_b.done && (_d = _a.return)) _d.call(_a);
                                    }
                                    finally { if (e_2) throw e_2.error; }
                                }
                                documentFileObjectsToValidate.push({
                                    location: documentFile.location,
                                    document: {
                                        kind: Kind.DOCUMENT,
                                        definitions: definitionsToValidate,
                                    },
                                });
                            }
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (documentFiles_1_1 && !documentFiles_1_1.done && (_c = documentFiles_1.return)) _c.call(documentFiles_1);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                    allErrors = [];
                    allFragmentsDocument = {
                        kind: Kind.DOCUMENT,
                        definitions: __spreadArray([], __read(allFragmentMap.values()), false),
                    };
                    return [4 /*yield*/, Promise.all(documentFileObjectsToValidate.map(function (documentFile) { return __awaiter(_this, void 0, void 0, function () {
                            var documentToValidate, errors;
                            return __generator(this, function (_a) {
                                documentToValidate = concatAST([allFragmentsDocument, documentFile.document]);
                                errors = validate(schema, documentToValidate, effectiveRules);
                                if (errors.length > 0) {
                                    allErrors.push({
                                        filePath: documentFile.location,
                                        errors: errors,
                                    });
                                }
                                return [2 /*return*/];
                            });
                        }); }))];
                case 1:
                    _e.sent();
                    return [2 /*return*/, allErrors];
            }
        });
    });
}
export function checkValidationErrors(loadDocumentErrors) {
    var e_3, _a, e_4, _b, e_5, _c;
    if (loadDocumentErrors.length > 0) {
        var errors = [];
        try {
            for (var loadDocumentErrors_1 = __values(loadDocumentErrors), loadDocumentErrors_1_1 = loadDocumentErrors_1.next(); !loadDocumentErrors_1_1.done; loadDocumentErrors_1_1 = loadDocumentErrors_1.next()) {
                var loadDocumentError = loadDocumentErrors_1_1.value;
                try {
                    for (var _d = (e_4 = void 0, __values(loadDocumentError.errors)), _e = _d.next(); !_e.done; _e = _d.next()) {
                        var graphQLError = _e.value;
                        var error = new Error();
                        error.name = 'GraphQLDocumentError';
                        error.message = error.name + ": " + graphQLError.message;
                        error.stack = error.message;
                        if (graphQLError.locations) {
                            try {
                                for (var _f = (e_5 = void 0, __values(graphQLError.locations)), _g = _f.next(); !_g.done; _g = _f.next()) {
                                    var location_1 = _g.value;
                                    error.stack += "\n    at " + loadDocumentError.filePath + ":" + location_1.line + ":" + location_1.column;
                                }
                            }
                            catch (e_5_1) { e_5 = { error: e_5_1 }; }
                            finally {
                                try {
                                    if (_g && !_g.done && (_c = _f.return)) _c.call(_f);
                                }
                                finally { if (e_5) throw e_5.error; }
                            }
                        }
                        errors.push(error);
                    }
                }
                catch (e_4_1) { e_4 = { error: e_4_1 }; }
                finally {
                    try {
                        if (_e && !_e.done && (_b = _d.return)) _b.call(_d);
                    }
                    finally { if (e_4) throw e_4.error; }
                }
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (loadDocumentErrors_1_1 && !loadDocumentErrors_1_1.done && (_a = loadDocumentErrors_1.return)) _a.call(loadDocumentErrors_1);
            }
            finally { if (e_3) throw e_3.error; }
        }
        throw new AggregateError(errors, "GraphQL Document Validation failed with " + errors.length + " errors;\n  " + errors.map(function (error, index) { return "Error " + index + ": " + error.stack; }).join('\n\n'));
    }
}
function createDefaultRules() {
    var ignored = ['NoUnusedFragmentsRule', 'NoUnusedVariablesRule', 'KnownDirectivesRule'];
    var v4ignored = ignored.map(function (rule) { return rule.replace(/Rule$/, ''); });
    return specifiedRules.filter(function (f) { return !ignored.includes(f.name) && !v4ignored.includes(f.name); });
}
