import {
  DirectiveDefinitionNode,
  InputObjectTypeDefinitionNode,
  InputObjectTypeExtensionNode,
  InputValueDefinitionNode,
  Kind,
} from 'graphql';
import { mergeDirectives } from './directives.js';
import { mergeFields } from './fields.js';
import { Config } from './merge-typedefs.js';

export function mergeInputType(
  node: InputObjectTypeDefinitionNode | InputObjectTypeExtensionNode,
  existingNode: InputObjectTypeDefinitionNode | InputObjectTypeExtensionNode,
  config?: Config,
  directives?: Record<string, DirectiveDefinitionNode>,
): InputObjectTypeDefinitionNode | InputObjectTypeExtensionNode {
  if (existingNode) {
    try {
      return {
        name: node.name,
        description: node['description'] || existingNode['description'],
        kind:
          config?.convertExtensions ||
          node.kind === 'InputObjectTypeDefinition' ||
          existingNode.kind === 'InputObjectTypeDefinition'
            ? 'InputObjectTypeDefinition'
            : 'InputObjectTypeExtension',
        loc: node.loc,
        fields: mergeFields<InputValueDefinitionNode>(
          node,
          node.fields,
          existingNode.fields,
          config,
        ),
        directives: mergeDirectives(node.directives, existingNode.directives, config, directives),
      } as any;
    } catch (e: any) {
      throw new Error(`Unable to merge GraphQL input type "${node.name.value}": ${e.message}`);
    }
  }

  return config?.convertExtensions
    ? {
        ...node,
        kind: Kind.INPUT_OBJECT_TYPE_DEFINITION,
      }
    : node;
}
