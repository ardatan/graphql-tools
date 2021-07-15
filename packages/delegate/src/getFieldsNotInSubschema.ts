import { GraphQLSchema, FieldNode, GraphQLObjectType, GraphQLResolveInfo } from 'graphql';

import { Maybe } from '@graphql-tools/utils';

import { isSubschemaConfig } from './subschemaConfig';
import { MergedTypeInfo, SubschemaConfig, StitchingInfo } from './types';
import { memoizeInfoAnd2Objects } from './memoize';
import { collectFields, ExecutionContext } from 'graphql/execution/execute.js';

function collectSubFields(info: GraphQLResolveInfo, typeName: string): Record<string, Array<FieldNode>> {
  let subFieldNodes: Record<string, Array<FieldNode>> = Object.create(null);
  const visitedFragmentNames = Object.create(null);

  const type = info.schema.getType(typeName) as GraphQLObjectType;
  const partialExecutionContext = {
    schema: info.schema,
    variableValues: info.variableValues,
    fragments: info.fragments,
  } as ExecutionContext;

  for (const fieldNode of info.fieldNodes) {
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

export const getFieldsNotInSubschema = memoizeInfoAnd2Objects(function (
  info: GraphQLResolveInfo,
  subschema: GraphQLSchema | SubschemaConfig<any, any, any, any>,
  mergedTypeInfo: MergedTypeInfo
): Array<FieldNode> {
  const typeMap = isSubschemaConfig(subschema) ? mergedTypeInfo.typeMaps.get(subschema) : subschema.getTypeMap();
  if (!typeMap) {
    return [];
  }
  const typeName = mergedTypeInfo.typeName;
  const fields = (typeMap[typeName] as GraphQLObjectType).getFields();

  const subFieldNodes = collectSubFields(info, typeName);

  // TODO: Verify whether it is safe that extensions always exists.
  const stitchingInfo: Maybe<StitchingInfo> = info.schema.extensions?.['stitchingInfo'];
  const fieldNodesByField = stitchingInfo?.fieldNodesByField;

  let fieldsNotInSchema: Array<FieldNode> = [];
  const additionalFieldNodes: Set<FieldNode> = new Set();
  for (const responseKey in subFieldNodes) {
    const subFieldNodesForResponseKey = subFieldNodes[responseKey];
    const fieldName = subFieldNodesForResponseKey[0].name.value;
    if (!(fieldName in fields)) {
      fieldsNotInSchema = fieldsNotInSchema.concat(subFieldNodesForResponseKey);
    }
    const fieldNodesForField = fieldNodesByField?.[typeName]?.[fieldName];
    if (fieldNodesForField) {
      for (const fieldNode of fieldNodesForField) {
        if (!(fieldNode.name.value in fields)) {
          additionalFieldNodes.add(fieldNode);
        }
      }
    }
  }

  return fieldsNotInSchema.concat(Array.from(additionalFieldNodes));
});
