import {
  FieldNode,
  getNamedType,
  GraphQLField,
  GraphQLInterfaceType,
  GraphQLNamedOutputType,
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLSchema,
  isAbstractType,
  isInterfaceType,
  isLeafType,
  isObjectType,
  isUnionType,
  Kind,
  SelectionNode,
  SelectionSetNode,
  visit,
} from 'graphql';
import { Maybe, memoize4 } from '@graphql-tools/utils';

export const extractUnavailableFieldsFromSelectionSet = memoize4(
  function extractUnavailableFieldsFromSelectionSet(
    schema: GraphQLSchema,
    fieldType: GraphQLNamedOutputType,
    fieldSelectionSet: SelectionSetNode,
    shouldAdd: (
      fieldType: GraphQLObjectType | GraphQLInterfaceType,
      selection: FieldNode,
    ) => boolean,
  ) {
    if (isLeafType(fieldType)) {
      return [];
    }
    if (isUnionType(fieldType)) {
      const unavailableSelections: SelectionNode[] = [];
      for (const type of fieldType.getTypes()) {
        // Exclude other inline fragments
        const fieldSelectionExcluded: SelectionSetNode = {
          ...fieldSelectionSet,
          selections: fieldSelectionSet.selections.filter(selection =>
            selection.kind === Kind.INLINE_FRAGMENT
              ? selection.typeCondition
                ? selection.typeCondition.name.value === type.name
                : false
              : true,
          ),
        };
        unavailableSelections.push(
          ...extractUnavailableFieldsFromSelectionSet(
            schema,
            type,
            fieldSelectionExcluded,
            shouldAdd,
          ),
        );
      }
      return unavailableSelections;
    }
    const subFields = fieldType.getFields();
    const unavailableSelections: SelectionNode[] = [];
    for (const selection of fieldSelectionSet.selections) {
      if (selection.kind === Kind.FIELD) {
        if (selection.name.value === '__typename') {
          continue;
        }
        const fieldName = selection.name.value;
        const selectionField = subFields[fieldName];
        if (!selectionField) {
          if (shouldAdd(fieldType, selection)) {
            unavailableSelections.push(selection);
          }
        } else {
          const unavailableSubFields = extractUnavailableFields(
            schema,
            selectionField,
            selection,
            shouldAdd,
          );
          if (unavailableSubFields.length) {
            unavailableSelections.push({
              ...selection,
              selectionSet: {
                kind: Kind.SELECTION_SET,
                selections: unavailableSubFields,
              },
            });
          }
        }
      } else if (selection.kind === Kind.INLINE_FRAGMENT) {
        const subFieldType: Maybe<GraphQLNamedType> = selection.typeCondition
          ? schema.getType(selection.typeCondition.name.value)
          : fieldType;
        if (
          subFieldType === fieldType ||
          ((isObjectType(subFieldType) || isInterfaceType(subFieldType)) &&
            isAbstractType(fieldType) &&
            schema.isSubType(fieldType, subFieldType))
        ) {
          const unavailableFields = extractUnavailableFieldsFromSelectionSet(
            schema,
            subFieldType,
            selection.selectionSet,
            shouldAdd,
          );
          if (unavailableFields.length) {
            unavailableSelections.push({
              ...selection,
              selectionSet: {
                kind: Kind.SELECTION_SET,
                selections: unavailableFields,
              },
            });
          }
        }
      }
    }
    return unavailableSelections;
  },
);

export const extractUnavailableFields = memoize4(function extractUnavailableFields(
  schema: GraphQLSchema,
  field: GraphQLField<any, any>,
  fieldNode: FieldNode,
  shouldAdd: (fieldType: GraphQLObjectType | GraphQLInterfaceType, selection: FieldNode) => boolean,
) {
  if (fieldNode.selectionSet) {
    const fieldType = getNamedType(field.type);
    return extractUnavailableFieldsFromSelectionSet(
      schema,
      fieldType,
      fieldNode.selectionSet,
      shouldAdd,
    );
  }
  return [];
});

function getByPath<T>(object: unknown, path: readonly (string | number)[]) {
  let current = object;
  for (const pathSegment of path) {
    if (current == null) {
      return;
    }
    current = current[pathSegment];
  }
  return current as T | undefined;
}

export function subtractSelectionSets(
  selectionSetA: SelectionSetNode,
  selectionSetB: SelectionSetNode,
) {
  return visit(selectionSetA, {
    [Kind.FIELD]: {
      enter(node, _key, _parent, path) {
        if (
          !node.selectionSet &&
          getByPath<SelectionNode[]>(selectionSetB, path.slice(0, -1))?.some(
            selection => selection.kind === Kind.FIELD && selection.name.value === node.name.value,
          )
        ) {
          return null;
        }
      },
    },
    [Kind.SELECTION_SET]: {
      leave(node) {
        if (node.selections.length === 0) {
          return null;
        }
      },
    },
    [Kind.INLINE_FRAGMENT]: {
      leave(node) {
        if (node.selectionSet?.selections.length === 0) {
          return null;
        }
      },
    },
  });
}
