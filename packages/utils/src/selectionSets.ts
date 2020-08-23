import { OperationDefinitionNode, SelectionSetNode, parse } from 'graphql';

export function parseSelectionSet(selectionSet: string): SelectionSetNode {
  const query = parse(selectionSet).definitions[0] as OperationDefinitionNode;
  return query.selectionSet;
}
