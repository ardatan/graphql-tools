import { Config } from './merge-typedefs';
import { DefinitionNode, SchemaDefinitionNode, SchemaExtensionNode } from 'graphql';
import { NamedDefinitionNode } from '@graphql-tools/utils';
export declare const schemaDefSymbol = 'SCHEMA_DEF_SYMBOL';
export declare type MergedResultMap = Record<string, NamedDefinitionNode> & {
  [schemaDefSymbol]: SchemaDefinitionNode | SchemaExtensionNode;
};
export declare function isNamedDefinitionNode(definitionNode: DefinitionNode): definitionNode is NamedDefinitionNode;
export declare function mergeGraphQLNodes(nodes: ReadonlyArray<DefinitionNode>, config?: Config): MergedResultMap;
