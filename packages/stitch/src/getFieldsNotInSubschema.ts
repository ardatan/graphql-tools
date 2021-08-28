import { GraphQLSchema, FieldNode, GraphQLObjectType, FragmentDefinitionNode } from 'graphql';

import { StitchingInfo } from '@graphql-tools/delegate';
import { collectFields } from '@graphql-tools/utils';

function collectSubFields(
  schema: GraphQLSchema,
  type: GraphQLObjectType,
  fieldNodes: ReadonlyArray<FieldNode>,
  fragments: Record<string, FragmentDefinitionNode>,
  variableValues: Record<string, any>
): Map<string, ReadonlyArray<FieldNode>> {
  let subFieldNodes = new Map<string, FieldNode[]>();
  const visitedFragmentNames = new Set<string>();

  for (const fieldNode of fieldNodes) {
    if (fieldNode.selectionSet) {
      subFieldNodes = collectFields(
        schema,
        variableValues,
        fragments,
        type,
        fieldNode.selectionSet,
        subFieldNodes,
        visitedFragmentNames
      ) as Map<string, FieldNode[]>;
    }
  }

  return subFieldNodes;
}

export function getFieldsNotInSubschema(
  schema: GraphQLSchema,
  stitchingInfo: StitchingInfo,
  gatewayType: GraphQLObjectType,
  subschemaType: GraphQLObjectType,
  fieldNodes: ReadonlyArray<FieldNode>,
  fragments: Record<string, FragmentDefinitionNode>,
  variableValues: Record<string, any>
): Array<FieldNode> {
  const subFieldNodes = collectSubFields(schema, gatewayType, fieldNodes, fragments, variableValues);

  // TODO: Verify whether it is safe that extensions always exists.
  const fieldNodesByField = stitchingInfo?.fieldNodesByField;

  const fields = subschemaType.getFields();

  const fieldsNotInSchema = new Set<FieldNode>();
  for (const [, subFieldNodesForResponseKey] of subFieldNodes) {
    const fieldName = subFieldNodesForResponseKey[0].name.value;
    if (!fields[fieldName]) {
      for (const subFieldNodeForResponseKey of subFieldNodesForResponseKey) {
        fieldsNotInSchema.add(subFieldNodeForResponseKey);
      }
    }
    const fieldNodesForField = fieldNodesByField?.[gatewayType.name]?.[fieldName];
    if (fieldNodesForField) {
      for (const fieldNode of fieldNodesForField) {
        if (!fields[fieldNode.name.value]) {
          fieldsNotInSchema.add(fieldNode);
        }
      }
    }
  }

  return Array.from(fieldsNotInSchema);
}
