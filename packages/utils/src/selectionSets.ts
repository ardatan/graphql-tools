import { OperationDefinitionNode, SelectionSetNode, parse } from 'graphql';
import { GraphQLParseOptions } from './Interfaces.js';

export function parseSelectionSet(selectionSet: string, options?: GraphQLParseOptions): SelectionSetNode {
  const query = parse(selectionSet, options).definitions[0] as OperationDefinitionNode;
  return query.selectionSet;
}
