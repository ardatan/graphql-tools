import {
  FieldNode,
  FragmentDefinitionNode,
  getNamedType,
  GraphQLField,
  GraphQLObjectType,
  GraphQLSchema,
  Kind,
  SelectionNode,
} from 'graphql';
import { StitchingInfo } from '@graphql-tools/delegate';
import { collectSubFields } from '@graphql-tools/utils';

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
        const unavailableFields = extractUnavailableFields(field, subFieldNode);
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

export function extractUnavailableFields(field: GraphQLField<any, any>, fieldNode: FieldNode) {
  if (fieldNode.selectionSet) {
    const fieldType = getNamedType(field.type);
    // TODO: Only object types are supported
    if (!('getFields' in fieldType)) {
      return [];
    }
    const subFields = fieldType.getFields();
    const unavailableSelections: SelectionNode[] = [];
    for (const selection of fieldNode.selectionSet.selections) {
      if (selection.kind === Kind.FIELD) {
        const selectionField = subFields[selection.name.value];
        if (!selectionField) {
          unavailableSelections.push(selection);
        } else {
          const unavailableSubFields = extractUnavailableFields(selectionField, selection);
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
        // TODO: Support for inline fragments
      }
    }
    if (
      unavailableSelections.length === 1 &&
      unavailableSelections[0].kind === Kind.FIELD &&
      unavailableSelections[0].name.value === '__typename'
    ) {
      return [];
    }
    return unavailableSelections;
  }
  return [];
}
