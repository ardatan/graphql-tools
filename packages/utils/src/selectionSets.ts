import {
  OperationDefinitionNode,
  SelectionSetNode,
  SelectionNode,
  FieldNode,
  parse,
  Kind,
  GraphQLObjectType,
  getNamedType,
} from 'graphql';

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

export const selectionSetWithFieldArgs: (
  selectionSet: string,
  mapping?: Record<string, string[]>
) => (field: FieldNode) => SelectionSetNode = (selectionSet: string, mapping?: Record<string, string[]>) => {
  const selectionSetDef = parseSelectionSet(selectionSet);
  return (field: FieldNode): SelectionSetNode => {
    const selections = selectionSetDef.selections.map(
      (selectionNode): SelectionNode => {
        if (selectionNode.kind === Kind.FIELD) {
          if (!mapping) {
            return { ...selectionNode, arguments: field.arguments.slice() };
          } else if (selectionNode.name.value in mapping) {
            const selectionArgs = mapping[selectionNode.name.value];
            return {
              ...selectionNode,
              arguments: field.arguments.filter((arg): boolean => selectionArgs.includes(arg.name.value)),
            };
          }
        }
        return selectionNode;
      }
    );

    return { ...selectionSetDef, selections };
  };
};
