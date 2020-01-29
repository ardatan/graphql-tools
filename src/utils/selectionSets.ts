import {
  OperationDefinitionNode,
  SelectionSetNode,
  parse,
  Kind,
  GraphQLObjectType,
} from 'graphql';

export function parseSelectionSet(selectionSet: string): SelectionSetNode {
  const query = (parse(selectionSet).definitions[0] as OperationDefinitionNode);
  return query.selectionSet;
}

export function typeContainsSelectionSet(type: GraphQLObjectType, selectionSet: SelectionSetNode): boolean {
  const fields = type.getFields();

  for (const selection of selectionSet.selections) {
    if (selection.kind === Kind.FIELD) {
      if (selection.alias) {
        if (!fields[selection.alias.value]) {
          return false;
        }
      } else {
        if (!fields[selection.name.value]) {
          return false;
        }
      }

      // TODO: check that all subfields are also included.

    } else if (selection.kind === Kind.INLINE_FRAGMENT) {
      const containsSelectionSet = typeContainsSelectionSet(type, selection.selectionSet);
      if (!containsSelectionSet) {
        return false;
      }
    }
  }

  return true;
}
