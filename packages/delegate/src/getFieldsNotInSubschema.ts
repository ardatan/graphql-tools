import { GraphQLSchema, FieldNode, GraphQLObjectType, FragmentDefinitionNode } from 'graphql';

import { isSubschemaConfig } from './subschemaConfig';
import { MergedTypeInfo, SubschemaConfig, StitchingInfo } from './types';
import { collectFields, ExecutionContext } from 'graphql/execution/execute.js';

function collectSubFields(
  schema: GraphQLSchema,
  typeName: string,
  fieldNodes: ReadonlyArray<FieldNode>,
  fragments: Record<string, FragmentDefinitionNode>,
  variableValues: Record<string, any>
): Record<string, Array<FieldNode>> {
  let subFieldNodes: Record<string, Array<FieldNode>> = Object.create(null);
  const visitedFragmentNames = Object.create(null);

  const type = schema.getType(typeName) as GraphQLObjectType;
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
  mergedTypeInfo: MergedTypeInfo,
  typeName: string,
  subschema: GraphQLSchema | SubschemaConfig<any, any, any, any>,
  fieldNodes: ReadonlyArray<FieldNode>,
  fragments: Record<string, FragmentDefinitionNode>,
  variableValues: Record<string, any>
): Array<FieldNode> {
  const typeMap = isSubschemaConfig(subschema) ? mergedTypeInfo.typeMaps.get(subschema) : subschema.getTypeMap();
  if (!typeMap) {
    return [];
  }

  const fields = (typeMap[typeName] as GraphQLObjectType).getFields();

  const subFieldNodes = collectSubFields(schema, typeName, fieldNodes, fragments, variableValues);

  // TODO: Verify whether it is safe that extensions always exists.
  const fieldNodesByField = stitchingInfo?.fieldNodesByField;

  const fieldsNotInSchema = new Set<FieldNode>();
  for (const responseKey in subFieldNodes) {
    const subFieldNodesForResponseKey = subFieldNodes[responseKey];
    const fieldName = subFieldNodesForResponseKey[0].name.value;
    if (!fields[fieldName]) {
      for (const subFieldNodeForResponseKey of subFieldNodesForResponseKey) {
        fieldsNotInSchema.add(subFieldNodeForResponseKey);
      }
    }
    const fieldNodesForField = fieldNodesByField?.[typeName]?.[fieldName];
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
