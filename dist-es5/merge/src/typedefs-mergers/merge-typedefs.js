import { __assign, __values } from "tslib";
import { parse, Kind, isSchema, isDefinitionNode, } from 'graphql';
import { defaultStringComparator, isSourceTypes, isStringTypes } from './utils';
import { mergeGraphQLNodes, schemaDefSymbol } from './merge-nodes';
import { getDocumentNodeFromSchema, isDocumentNode, resetComments, printWithComments, } from '@graphql-tools/utils';
import { DEFAULT_OPERATION_TYPE_NAME_MAP } from './schema-def';
export function mergeTypeDefs(typeSource, config) {
    resetComments();
    var doc = {
        kind: Kind.DOCUMENT,
        definitions: mergeGraphQLTypes(typeSource, __assign({ useSchemaDefinition: true, forceSchemaDefinition: false, throwOnConflict: false, commentDescriptions: false }, config)),
    };
    var result;
    if (config === null || config === void 0 ? void 0 : config.commentDescriptions) {
        result = printWithComments(doc);
    }
    else {
        result = doc;
    }
    resetComments();
    return result;
}
function visitTypeSources(typeSource, options, allNodes, visitedTypeSources) {
    var e_1, _a;
    if (allNodes === void 0) { allNodes = []; }
    if (visitedTypeSources === void 0) { visitedTypeSources = new Set(); }
    if (typeSource && !visitedTypeSources.has(typeSource)) {
        visitedTypeSources.add(typeSource);
        if (typeof typeSource === 'function') {
            visitTypeSources(typeSource(), options, allNodes, visitedTypeSources);
        }
        else if (Array.isArray(typeSource)) {
            try {
                for (var typeSource_1 = __values(typeSource), typeSource_1_1 = typeSource_1.next(); !typeSource_1_1.done; typeSource_1_1 = typeSource_1.next()) {
                    var type = typeSource_1_1.value;
                    visitTypeSources(type, options, allNodes, visitedTypeSources);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (typeSource_1_1 && !typeSource_1_1.done && (_a = typeSource_1.return)) _a.call(typeSource_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
        else if (isSchema(typeSource)) {
            var documentNode = getDocumentNodeFromSchema(typeSource, options);
            visitTypeSources(documentNode.definitions, options, allNodes, visitedTypeSources);
        }
        else if (isStringTypes(typeSource) || isSourceTypes(typeSource)) {
            var documentNode = parse(typeSource, options);
            visitTypeSources(documentNode.definitions, options, allNodes, visitedTypeSources);
        }
        else if (typeof typeSource === 'object' && isDefinitionNode(typeSource)) {
            allNodes.push(typeSource);
        }
        else if (isDocumentNode(typeSource)) {
            visitTypeSources(typeSource.definitions, options, allNodes, visitedTypeSources);
        }
        else {
            throw new Error("typeDefs must contain only strings, documents, schemas, or functions, got " + typeof typeSource);
        }
    }
    return allNodes;
}
export function mergeGraphQLTypes(typeSource, config) {
    var _a, _b, _c;
    resetComments();
    var allNodes = visitTypeSources(typeSource, config);
    var mergedNodes = mergeGraphQLNodes(allNodes, config);
    if (config === null || config === void 0 ? void 0 : config.useSchemaDefinition) {
        // XXX: right now we don't handle multiple schema definitions
        var schemaDef = mergedNodes[schemaDefSymbol] || {
            kind: Kind.SCHEMA_DEFINITION,
            operationTypes: [],
        };
        var operationTypes = schemaDef.operationTypes;
        var _loop_1 = function (opTypeDefNodeType) {
            var opTypeDefNode = operationTypes.find(function (operationType) { return operationType.operation === opTypeDefNodeType; });
            if (!opTypeDefNode) {
                var possibleRootTypeName = DEFAULT_OPERATION_TYPE_NAME_MAP[opTypeDefNodeType];
                var existingPossibleRootType = mergedNodes[possibleRootTypeName];
                if (existingPossibleRootType != null && existingPossibleRootType.name != null) {
                    operationTypes.push({
                        kind: Kind.OPERATION_TYPE_DEFINITION,
                        type: {
                            kind: Kind.NAMED_TYPE,
                            name: existingPossibleRootType.name,
                        },
                        operation: opTypeDefNodeType,
                    });
                }
            }
        };
        for (var opTypeDefNodeType in DEFAULT_OPERATION_TYPE_NAME_MAP) {
            _loop_1(opTypeDefNodeType);
        }
        if (((_a = schemaDef === null || schemaDef === void 0 ? void 0 : schemaDef.operationTypes) === null || _a === void 0 ? void 0 : _a.length) != null && schemaDef.operationTypes.length > 0) {
            mergedNodes[schemaDefSymbol] = schemaDef;
        }
    }
    if ((config === null || config === void 0 ? void 0 : config.forceSchemaDefinition) && !((_c = (_b = mergedNodes[schemaDefSymbol]) === null || _b === void 0 ? void 0 : _b.operationTypes) === null || _c === void 0 ? void 0 : _c.length)) {
        mergedNodes[schemaDefSymbol] = {
            kind: Kind.SCHEMA_DEFINITION,
            operationTypes: [
                {
                    kind: Kind.OPERATION_TYPE_DEFINITION,
                    operation: 'query',
                    type: {
                        kind: Kind.NAMED_TYPE,
                        name: {
                            kind: Kind.NAME,
                            value: 'Query',
                        },
                    },
                },
            ],
        };
    }
    var mergedNodeDefinitions = Object.values(mergedNodes);
    if (config === null || config === void 0 ? void 0 : config.sort) {
        var sortFn_1 = typeof config.sort === 'function' ? config.sort : defaultStringComparator;
        mergedNodeDefinitions.sort(function (a, b) { var _a, _b; return sortFn_1((_a = a.name) === null || _a === void 0 ? void 0 : _a.value, (_b = b.name) === null || _b === void 0 ? void 0 : _b.value); });
    }
    return mergedNodeDefinitions;
}
