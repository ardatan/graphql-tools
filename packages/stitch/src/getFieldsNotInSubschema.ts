import {
  FieldNode,
  FragmentDefinitionNode,
  GraphQLField,
  GraphQLNamedOutputType,
  GraphQLObjectType,
  GraphQLSchema,
  isAbstractType,
  Kind,
} from 'graphql';
import { extractUnavailableFields, StitchingInfo } from '@graphql-tools/delegate';
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
  let { fields: subFieldNodesByResponseKey, patches } = collectSubFields(
    schema,
    fragments,
    variableValues,
    gatewayType,
    fieldNodes,
  );

  let mapChanged = false;

  // Collect deferred fields
  if (patches.length) {
    subFieldNodesByResponseKey = new Map(subFieldNodesByResponseKey);
    for (const patch of patches) {
      for (const [responseKey, fields] of patch.fields) {
        if (!mapChanged) {
          subFieldNodesByResponseKey = new Map(subFieldNodesByResponseKey);
          mapChanged = true;
        }
        const existingSubFieldNodes = subFieldNodesByResponseKey.get(responseKey);
        if (existingSubFieldNodes) {
          existingSubFieldNodes.push(...fields);
        } else {
          subFieldNodesByResponseKey.set(responseKey, fields);
        }
      }
    }
  }

  const fieldsNotInSchema = new Set<FieldNode>();
  if (isAbstractType(gatewayType)) {
    fieldsNotInSchema.add({
      kind: Kind.FIELD,
      name: {
        kind: Kind.NAME,
        value: '__typename',
      },
    });
    for (const possibleType of schema.getPossibleTypes(gatewayType)) {
      const { fields: subFieldNodesOfPossibleType, patches } = collectSubFields(
        schema,
        fragments,
        variableValues,
        possibleType,
        fieldNodes,
      );

      for (const patch of patches) {
        for (const [responseKey, fields] of patch.fields) {
          if (!mapChanged) {
            subFieldNodesByResponseKey = new Map(subFieldNodesByResponseKey);
            mapChanged = true;
          }
          const existingSubFieldNodes = subFieldNodesByResponseKey.get(responseKey);
          if (existingSubFieldNodes) {
            existingSubFieldNodes.push(...fields);
          } else {
            subFieldNodesByResponseKey.set(responseKey, fields);
          }
        }
      }

      for (const [responseKey, subFieldNodes] of subFieldNodesOfPossibleType) {
        if (!mapChanged) {
          subFieldNodesByResponseKey = new Map(subFieldNodesByResponseKey);
          mapChanged = true;
        }
        const existingSubFieldNodes = subFieldNodesByResponseKey.get(responseKey);
        if (existingSubFieldNodes) {
          existingSubFieldNodes.push(...subFieldNodes);
        } else {
          subFieldNodesByResponseKey.set(responseKey, subFieldNodes);
        }
      }
    }
  }

  // TODO: Verify whether it is safe that extensions always exists.
  const fieldNodesByField = stitchingInfo?.fieldNodesByField;
  const shouldAdd = (fieldType: GraphQLNamedOutputType, selection: FieldNode) =>
    !fieldNodesByField?.[fieldType.name]?.[selection.name.value];

  const fields = subschemaType.getFields();

  for (const [, subFieldNodes] of subFieldNodesByResponseKey) {
    const fieldName = subFieldNodes[0].name.value;

    if (!fields[fieldName]) {
      for (const subFieldNode of subFieldNodes) {
        fieldsNotInSchema.add(subFieldNode);
      }
    } else {
      const field = fields[fieldName];
      for (const subFieldNode of subFieldNodes) {
        const unavailableFields = extractUnavailableFields(schema, field, subFieldNode, shouldAdd);
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
    let addedSubFieldNodes = false;
    const fieldNodesByFieldForType = fieldNodesByField?.[gatewayType.name];
    const visitedFieldNames = new Set<string>();
    if (fieldNodesByFieldForType) {
      addMissingRequiredFields({
        fieldName,
        fields,
        fieldsNotInSchema,
        visitedFieldNames,
        onAdd: () => {
          if (!addedSubFieldNodes) {
            for (const subFieldNode of subFieldNodes) {
              fieldsNotInSchema.add(subFieldNode);
            }
            addedSubFieldNodes = true;
          }
        },
        fieldNodesByField: fieldNodesByFieldForType,
      });
    }
  }
  return Array.from(fieldsNotInSchema);
}

function addMissingRequiredFields({
  fieldName,
  fields,
  fieldsNotInSchema,
  onAdd,
  fieldNodesByField,
  visitedFieldNames,
}: {
  fieldName: string;
  fields: Record<string, GraphQLField<any, any>>;
  fieldsNotInSchema: Set<FieldNode>;
  onAdd: VoidFunction;
  fieldNodesByField: Record<string, FieldNode[]>;
  visitedFieldNames: Set<string>;
}) {
  if (visitedFieldNames.has(fieldName)) {
    return;
  }
  visitedFieldNames.add(fieldName);
  const fieldNodesForField = fieldNodesByField?.[fieldName];
  if (fieldNodesForField) {
    for (const fieldNode of fieldNodesForField) {
      if (fieldNode.name.value !== '__typename' && !fields[fieldNode.name.value]) {
        onAdd();
        fieldsNotInSchema.add(fieldNode);
        addMissingRequiredFields({
          fieldName: fieldNode.name.value,
          fields,
          fieldsNotInSchema,
          onAdd,
          fieldNodesByField,
          visitedFieldNames,
        });
      }
    }
  }
}
