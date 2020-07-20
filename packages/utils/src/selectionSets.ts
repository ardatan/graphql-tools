import { OperationDefinitionNode, SelectionSetNode, parse, Kind, GraphQLObjectType, getNamedType } from 'graphql';

export function parseSelectionSet(selectionSet: string): SelectionSetNode {
  const query = parse(selectionSet).definitions[0] as OperationDefinitionNode;
  return query.selectionSet;
}

export function typeContainsSelectionSet(type: GraphQLObjectType, selectionSet: SelectionSetNode): boolean {
  const fields = type.getFields();

  for (const selection of selectionSet.selections) {
    if (selection.kind === Kind.FIELD) {
      const field = fields[selection.name.value];

      if (field == null) {
        return false;
      }

      if (selection.selectionSet != null) {
        return typeContainsSelectionSet(getNamedType(field.type) as GraphQLObjectType, selection.selectionSet);
      }
    } else if (selection.kind === Kind.INLINE_FRAGMENT) {
      const containsSelectionSet = typeContainsSelectionSet(type, selection.selectionSet);
      if (!containsSelectionSet) {
        return false;
      }
    }
  }

  return true;
}

export function selectionSetWithFieldArgs(selectionSet: string, mapping?: object): SelectionSetNode {
  selectionSet = JSON.stringify(parseSelectionSet(selectionSet));
  return field => {
    const selectionSetCopy = JSON.parse(selectionSet) as SelectionSetNode;

    for (let selection of selectionSetCopy.selections) {
      if (selection.kind === Kind.FIELD) {
        if (!mapping) {
          selection.arguments = field.arguments.slice();

        } else if (selection.name.value in mapping) {
          const selectionArgs = mapping[selection.name.value];

          for (let fieldArg of field.arguments) {
            if (selectionArgs.includes(fieldArg.name.value)) {
              selection.arguments.push(fieldArg);
            }
          }
        }
      }
    }

    return selectionSetCopy;
  };
}
