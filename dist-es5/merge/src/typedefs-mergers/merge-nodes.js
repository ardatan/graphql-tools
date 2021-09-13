import { __values } from "tslib";
import { Kind } from 'graphql';
import { mergeType } from './type';
import { mergeEnum } from './enum';
import { mergeScalar } from './scalar';
import { mergeUnion } from './union';
import { mergeInputType } from './input-type';
import { mergeInterface } from './interface';
import { mergeDirective } from './directives';
import { mergeSchemaDefs } from './schema-def';
import { collectComment } from '@graphql-tools/utils';
export var schemaDefSymbol = 'SCHEMA_DEF_SYMBOL';
export function isNamedDefinitionNode(definitionNode) {
    return 'name' in definitionNode;
}
export function mergeGraphQLNodes(nodes, config) {
    var e_1, _a;
    var _b, _c, _d;
    var mergedResultMap = {};
    try {
        for (var nodes_1 = __values(nodes), nodes_1_1 = nodes_1.next(); !nodes_1_1.done; nodes_1_1 = nodes_1.next()) {
            var nodeDefinition = nodes_1_1.value;
            if (isNamedDefinitionNode(nodeDefinition)) {
                var name_1 = (_b = nodeDefinition.name) === null || _b === void 0 ? void 0 : _b.value;
                if (config === null || config === void 0 ? void 0 : config.commentDescriptions) {
                    collectComment(nodeDefinition);
                }
                if (name_1 == null) {
                    continue;
                }
                if (((_c = config === null || config === void 0 ? void 0 : config.exclusions) === null || _c === void 0 ? void 0 : _c.includes(name_1 + '.*')) || ((_d = config === null || config === void 0 ? void 0 : config.exclusions) === null || _d === void 0 ? void 0 : _d.includes(name_1))) {
                    delete mergedResultMap[name_1];
                }
                else {
                    switch (nodeDefinition.kind) {
                        case Kind.OBJECT_TYPE_DEFINITION:
                        case Kind.OBJECT_TYPE_EXTENSION:
                            mergedResultMap[name_1] = mergeType(nodeDefinition, mergedResultMap[name_1], config);
                            break;
                        case Kind.ENUM_TYPE_DEFINITION:
                        case Kind.ENUM_TYPE_EXTENSION:
                            mergedResultMap[name_1] = mergeEnum(nodeDefinition, mergedResultMap[name_1], config);
                            break;
                        case Kind.UNION_TYPE_DEFINITION:
                        case Kind.UNION_TYPE_EXTENSION:
                            mergedResultMap[name_1] = mergeUnion(nodeDefinition, mergedResultMap[name_1], config);
                            break;
                        case Kind.SCALAR_TYPE_DEFINITION:
                        case Kind.SCALAR_TYPE_EXTENSION:
                            mergedResultMap[name_1] = mergeScalar(nodeDefinition, mergedResultMap[name_1], config);
                            break;
                        case Kind.INPUT_OBJECT_TYPE_DEFINITION:
                        case Kind.INPUT_OBJECT_TYPE_EXTENSION:
                            mergedResultMap[name_1] = mergeInputType(nodeDefinition, mergedResultMap[name_1], config);
                            break;
                        case Kind.INTERFACE_TYPE_DEFINITION:
                        case Kind.INTERFACE_TYPE_EXTENSION:
                            mergedResultMap[name_1] = mergeInterface(nodeDefinition, mergedResultMap[name_1], config);
                            break;
                        case Kind.DIRECTIVE_DEFINITION:
                            mergedResultMap[name_1] = mergeDirective(nodeDefinition, mergedResultMap[name_1]);
                            break;
                    }
                }
            }
            else if (nodeDefinition.kind === Kind.SCHEMA_DEFINITION || nodeDefinition.kind === Kind.SCHEMA_EXTENSION) {
                mergedResultMap[schemaDefSymbol] = mergeSchemaDefs(nodeDefinition, mergedResultMap[schemaDefSymbol], config);
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (nodes_1_1 && !nodes_1_1.done && (_a = nodes_1.return)) _a.call(nodes_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return mergedResultMap;
}
