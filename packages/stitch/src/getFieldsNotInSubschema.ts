import { GraphQLSchema, FieldNode, GraphQLObjectType, FragmentDefinitionNode } from 'graphql';

import { collectFields, ExecutionContext } from 'graphql/execution/execute.js';

import { StitchingInfo } from '@graphql-tools/delegate';

function collectSubFields(
  schema: GraphQLSchema,
  type: GraphQLObjectType,
  fieldNodes: ReadonlyArray<FieldNode>,
  fragments: Record<string, FragmentDefinitionNode>,
  variableValues: Record<string, any>
): Record<string, Array<FieldNode>> {
  let subFieldNodes: Record<string, Array<FieldNode>> = Object.create(null);
  const visitedFragmentNames = Object.create(null);

  const partialExecutionContext = {
    schema,
    variableValues,
    fragments,
  } as ExecutionContext;

  for (const fieldNode of fieldNodes) {
    if (fieldNode.selectionSet) {
      subFieldNodes = collectFields(
        partialExecutionContext,
        type,
        fieldNode.selectionSet,
        subFieldNodes,
        visitedFragmentNames
      );
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
  for (const responseKey in subFieldNodes) {
    const subFieldNodesForResponseKey = subFieldNodes[responseKey];
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
