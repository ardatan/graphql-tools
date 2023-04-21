import type { GraphQLField, GraphQLDirective, FieldNode, DirectiveNode } from 'graphql';
import { getArgumentValues as gqljsGetArgumentValues } from 'graphql';

/**
 * Prepares an object map of argument values given a list of argument
 * definitions and list of argument AST nodes.
 *
 * Note: The returned value is a plain Object with a prototype, since it is
 * exposed to user code. Care should be taken to not pull values from the
 * Object prototype.
 */
export function getArgumentValues(
  def: GraphQLField<any, any> | GraphQLDirective,
  node: FieldNode | DirectiveNode,
  variableValues: Record<string, any> = {}
): Record<string, any> {
  return gqljsGetArgumentValues(def, node, variableValues);
}
