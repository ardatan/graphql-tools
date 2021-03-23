import { Kind, OperationTypeDefinitionNode, SchemaDefinitionNode, SchemaExtensionNode } from 'graphql';
import { mergeDirectives } from './directives';
import { Config } from './merge-typedefs';

export const operationTypeDefinitionNodeTypeRootTypeMap = {
  query: 'Query',
  mutation: 'Mutation',
  subscription: 'Subscription',
} as const;

function mergeOperationTypes(
  opNodeList: ReadonlyArray<OperationTypeDefinitionNode> = [],
  existingOpNodeList: ReadonlyArray<OperationTypeDefinitionNode> = []
): OperationTypeDefinitionNode[] {
  const finalOpNodeList: OperationTypeDefinitionNode[] = [];
  for (const opNodeType in operationTypeDefinitionNodeTypeRootTypeMap) {
    const opNode =
      opNodeList.find(n => n.operation === opNodeType) || existingOpNodeList.find(n => n.operation === opNodeType);
    if (opNode) {
      finalOpNodeList.push(opNode);
    }
  }
  return finalOpNodeList;
}

export function mergeSchemaDefs(
  node: SchemaDefinitionNode | SchemaExtensionNode,
  existingNode: SchemaDefinitionNode | SchemaExtensionNode,
  config?: Config
): SchemaDefinitionNode | SchemaExtensionNode {
  if (existingNode) {
    return {
      kind:
        config?.convertExtensions ||
        node.kind === Kind.SCHEMA_DEFINITION ||
        existingNode.kind === Kind.SCHEMA_DEFINITION
          ? Kind.SCHEMA_DEFINITION
          : Kind.SCHEMA_EXTENSION,
      description: node['description'] || existingNode['description'],
      directives: mergeDirectives(node.directives, existingNode.directives, config),
      operationTypes: mergeOperationTypes(node.operationTypes, existingNode.operationTypes),
    } as any;
  }

  return (config?.convertExtensions
    ? {
        ...node,
        kind: Kind.SCHEMA_EXTENSION,
      }
    : node) as any;
}
