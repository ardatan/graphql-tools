import { GraphQLSchema, FieldNode, GraphQLObjectType, FragmentDefinitionNode } from 'graphql';

import { StitchingInfo } from '@graphql-tools/delegate';
import { collectSubFields } from '@graphql-tools/utils';

export function getFieldsNotInSubschema(
  schema: GraphQLSchema,
  stitchingInfo: StitchingInfo,
  gatewayType: GraphQLObjectType,
  subschemaType: GraphQLObjectType,
  fieldNodes: FieldNode[],
  fragments: Record<string, FragmentDefinitionNode>,
  variableValues: Record<string, any>
): Array<FieldNode> {
  const { fields: subFieldNodesByResponseKey } = collectSubFields(
    schema,
    fragments,
    variableValues,
    gatewayType,
    fieldNodes
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
