import { OperationDefinitionNode, SelectionSetNode, parse, Kind, GraphQLObjectType, getNamedType } from 'graphql';

export function parseSelectionSet(selectionSet: string): SelectionSetNode {
  const query = parse(selectionSet).definitions[0] as OperationDefinitionNode;
  return query.selectionSet;
}

export function typesContainSelectionSet(types: Array<GraphQLObjectType>, selectionSet: SelectionSetNode): boolean {
  const fieldMaps = types.map(type => type.getFields());

  for (const selection of selectionSet.selections) {
    if (selection.kind === Kind.FIELD) {
      const fields = fieldMaps.map(fieldMap => fieldMap[selection.name.value]).filter(field => field != null);
      if (!fields.length) {
        return false;
      }

      if (selection.selectionSet != null) {
        return typesContainSelectionSet(
          fields.map(field => getNamedType(field.type)) as Array<GraphQLObjectType>,
          selection.selectionSet
        );
      }
    } else if (selection.kind === Kind.INLINE_FRAGMENT) {
      return typesContainSelectionSet(types, selection.selectionSet);
    }
  }

  return true;
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
      return typeContainsSelectionSet(type, selection.selectionSet);
    }
  }

  return true;
}
