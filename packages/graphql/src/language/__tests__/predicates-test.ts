import type { ASTNode } from '../ast.js';
import { Kind } from '../kinds.js';
import { parseValue } from '../parser.js';
import {
  isConstValueNode,
  isDefinitionNode,
  isExecutableDefinitionNode,
  isNullabilityAssertionNode,
  isSelectionNode,
  isTypeDefinitionNode,
  isTypeExtensionNode,
  isTypeNode,
  isTypeSystemDefinitionNode,
  isTypeSystemExtensionNode,
  isValueNode,
} from '../predicates.js';

function filterNodes(predicate: (node: ASTNode) => boolean): Array<string> {
  return Object.values(Kind).filter(
    // @ts-expect-error create node only with kind
    kind => predicate({ kind })
  );
}

describe('AST node predicates', () => {
  it('isDefinitionNode', () => {
    expect(filterNodes(isDefinitionNode)).toEqual([
      'OperationDefinition',
      'FragmentDefinition',
      'SchemaDefinition',
      'ScalarTypeDefinition',
      'ObjectTypeDefinition',
      'InterfaceTypeDefinition',
      'UnionTypeDefinition',
      'EnumTypeDefinition',
      'InputObjectTypeDefinition',
      'DirectiveDefinition',
      'SchemaExtension',
      'ScalarTypeExtension',
      'ObjectTypeExtension',
      'InterfaceTypeExtension',
      'UnionTypeExtension',
      'EnumTypeExtension',
      'InputObjectTypeExtension',
    ]);
  });

  it('isExecutableDefinitionNode', () => {
    expect(filterNodes(isExecutableDefinitionNode)).toEqual(['OperationDefinition', 'FragmentDefinition']);
  });

  it('isSelectionNode', () => {
    expect(filterNodes(isSelectionNode)).toEqual(['Field', 'FragmentSpread', 'InlineFragment']);
  });

  it('isNullabilityAssertionNode', () => {
    expect(filterNodes(isNullabilityAssertionNode)).toEqual([
      'ListNullabilityOperator',
      'NonNullAssertion',
      'ErrorBoundary',
    ]);
  });

  it('isValueNode', () => {
    expect(filterNodes(isValueNode)).toEqual([
      'Variable',
      'IntValue',
      'FloatValue',
      'StringValue',
      'BooleanValue',
      'NullValue',
      'EnumValue',
      'ListValue',
      'ObjectValue',
    ]);
  });

  it('isConstValueNode', () => {
    expect(isConstValueNode(parseValue('"value"'))).toEqual(true);
    expect(isConstValueNode(parseValue('$var'))).toEqual(false);

    expect(isConstValueNode(parseValue('{ field: "value" }'))).toEqual(true);
    expect(isConstValueNode(parseValue('{ field: $var }'))).toEqual(false);

    expect(isConstValueNode(parseValue('[ "value" ]'))).toEqual(true);
    expect(isConstValueNode(parseValue('[ $var ]'))).toEqual(false);
  });

  it('isTypeNode', () => {
    expect(filterNodes(isTypeNode)).toEqual(['NamedType', 'ListType', 'NonNullType']);
  });

  it('isTypeSystemDefinitionNode', () => {
    expect(filterNodes(isTypeSystemDefinitionNode)).toEqual([
      'SchemaDefinition',
      'ScalarTypeDefinition',
      'ObjectTypeDefinition',
      'InterfaceTypeDefinition',
      'UnionTypeDefinition',
      'EnumTypeDefinition',
      'InputObjectTypeDefinition',
      'DirectiveDefinition',
    ]);
  });

  it('isTypeDefinitionNode', () => {
    expect(filterNodes(isTypeDefinitionNode)).toEqual([
      'ScalarTypeDefinition',
      'ObjectTypeDefinition',
      'InterfaceTypeDefinition',
      'UnionTypeDefinition',
      'EnumTypeDefinition',
      'InputObjectTypeDefinition',
    ]);
  });

  it('isTypeSystemExtensionNode', () => {
    expect(filterNodes(isTypeSystemExtensionNode)).toEqual([
      'SchemaExtension',
      'ScalarTypeExtension',
      'ObjectTypeExtension',
      'InterfaceTypeExtension',
      'UnionTypeExtension',
      'EnumTypeExtension',
      'InputObjectTypeExtension',
    ]);
  });

  it('isTypeExtensionNode', () => {
    expect(filterNodes(isTypeExtensionNode)).toEqual([
      'ScalarTypeExtension',
      'ObjectTypeExtension',
      'InterfaceTypeExtension',
      'UnionTypeExtension',
      'EnumTypeExtension',
      'InputObjectTypeExtension',
    ]);
  });
});
