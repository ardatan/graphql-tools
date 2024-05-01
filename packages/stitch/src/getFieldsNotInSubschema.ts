import {
  FieldNode,
  FragmentDefinitionNode,
  getNamedType,
  GraphQLField,
  GraphQLInterfaceType,
  GraphQLNamedOutputType,
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLSchema,
  isInterfaceType,
  isLeafType,
  isObjectType,
  isUnionType,
  Kind,
  SelectionNode,
  SelectionSetNode,
} from 'graphql';
import { StitchingInfo } from '@graphql-tools/delegate';
import { collectSubFields, Maybe } from '@graphql-tools/utils';

export function getFieldsNotInSubschema(
  schema: GraphQLSchema,
  stitchingInfo: StitchingInfo,
  gatewayType: GraphQLObjectType,
  subschemaType: GraphQLObjectType,
  fieldNodes: FieldNode[],
  fragments: Record<string, FragmentDefinitionNode>,
  variableValues: Record<string, any>,
): Array<FieldNode> {
  const { fields: subFieldNodesByResponseKey } = collectSubFields(
    schema,
    fragments,
    variableValues,
    gatewayType,
    fieldNodes,
  );

  // TODO: Verify whether it is safe that extensions always exists.
  const fieldNodesByField = stitchingInfo?.fieldNodesByField;

  const fields = subschemaType.getFields();

  const fieldsNotInSchema = new Set<FieldNode>();
  for (const [, subFieldNodes] of subFieldNodesByResponseKey) {
    const fieldName = subFieldNodes[0].name.value;
    if (!fields[fieldName]) {
      for (const subFieldNode of subFieldNodes) {
        fieldsNotInSchema.add(subFieldNode);
      }
    } else {
      const field = fields[fieldName];
      for (const subFieldNode of subFieldNodes) {
        const unavailableFields = extractUnavailableFields(
          schema,
          field,
          subFieldNode,
          (fieldType, selection) => !fieldNodesByField?.[fieldType.name]?.[selection.name.value],
        );
        if (unavailableFields.length) {
          fieldsNotInSchema.add({
            ...subFieldNode,
            selectionSet: {
              kind: Kind.SELECTION_SET,
              selections: unavailableFields,
            },
          });
        }
      }
    }
    const fieldNodesForField = fieldNodesByField?.[gatewayType.name]?.[fieldName];
    if (fieldNodesForField) {
      for (const fieldNode of fieldNodesForField) {
        if (fieldNode.name.value !== '__typename' && !fields[fieldNode.name.value]) {
          // consider node that depends on something not in the schema as not in the schema
          for (const subFieldNode of subFieldNodes) {
            fieldsNotInSchema.add(subFieldNode);
          }
          fieldsNotInSchema.add(fieldNode);
        }
      }
    }
  }

  return Array.from(fieldsNotInSchema);
}

export function extractUnavailableFieldsFromSelectionSet(
  schema: GraphQLSchema,
  fieldType: GraphQLNamedOutputType,
  fieldSelectionSet: SelectionSetNode,
  shouldAdd: (fieldType: GraphQLObjectType | GraphQLInterfaceType, selection: FieldNode) => boolean,
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
        !(isInterfaceType(subFieldType) && isObjectType(subFieldType)) ||
        subFieldType === fieldType ||
        (isInterfaceType(fieldType) && schema.isSubType(fieldType, subFieldType))
      ) {
        const unavailableFields = extractUnavailableFieldsFromSelectionSet(
          schema,
          fieldType,
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
      } else {
        unavailableSelections.push(selection);
      }
    }
  }
  return unavailableSelections;
}

export function extractUnavailableFields(
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
}
