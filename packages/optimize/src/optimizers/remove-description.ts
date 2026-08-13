import { visit } from 'graphql';
import { DocumentOptimizer } from '../types.js';

/**
 * This optimizer removes "description" fields from schema and executable AST nodes.
 * @param input
 */
export const removeDescriptions: DocumentOptimizer = input => {
  function transformNode(node: any) {
    if (!node.description) {
      return node;
    }

    const { description, ...rest } = node;
    return rest;
  }

  return visit(input, {
    ScalarTypeDefinition: transformNode,
    ObjectTypeDefinition: transformNode,
    InterfaceTypeDefinition: transformNode,
    UnionTypeDefinition: transformNode,
    EnumTypeDefinition: transformNode,
    EnumValueDefinition: transformNode,
    InputObjectTypeDefinition: transformNode,
    InputValueDefinition: transformNode,
    FieldDefinition: transformNode,
    DirectiveDefinition: transformNode,
    OperationDefinition: transformNode,
    VariableDefinition: transformNode,
    FragmentDefinition: transformNode,
    SchemaDefinition: transformNode,
    SchemaExtension: transformNode,
  });
};
