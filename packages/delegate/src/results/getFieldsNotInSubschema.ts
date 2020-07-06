import { GraphQLSchema, FieldNode, GraphQLObjectType, GraphQLResolveInfo } from 'graphql';

import { collectFields, GraphQLExecutionContext } from '@graphql-tools/utils';
import { isSubschemaConfig } from '../Subschema';
import { MergedTypeInfo, SubschemaConfig, StitchingInfo } from '../types';

import { memoizeInfoAnd2Objectsand1Primitive } from './memoize';

function collectSubFields(info: GraphQLResolveInfo, typeName: string): Record<string, Array<FieldNode>> {
  let subFieldNodes: Record<string, Array<FieldNode>> = Object.create(null);
  const visitedFragmentNames = Object.create(null);

  const type = info.schema.getType(typeName) as GraphQLObjectType;
  const partialExecutionContext = ({
    schema: info.schema,
    variableValues: info.variableValues,
    fragments: info.fragments,
  } as unknown) as GraphQLExecutionContext;

  info.fieldNodes.forEach(fieldNode => {
    subFieldNodes = collectFields(
      partialExecutionContext,
      type,
      fieldNode.selectionSet,
      subFieldNodes,
      visitedFragmentNames
    );
  });

  const stitchingInfo = info.schema.extensions.stitchingInfo as StitchingInfo;
  const selectionSetsByType = stitchingInfo.selectionSetsByType;
  const selectionSetsByField = stitchingInfo.selectionSetsByField;

  Object.keys(subFieldNodes).forEach(responseName => {
    const fieldName = subFieldNodes[responseName][0].name.value;
    const typeSelectionSet = selectionSetsByType[typeName];
    if (typeSelectionSet != null) {
      subFieldNodes = collectFields(
        partialExecutionContext,
        type,
        typeSelectionSet,
        subFieldNodes,
        visitedFragmentNames
      );
    }
    const fieldSelectionSet = selectionSetsByField?.[typeName]?.[fieldName];
    if (fieldSelectionSet != null) {
      subFieldNodes = collectFields(
        partialExecutionContext,
        type,
        fieldSelectionSet,
        subFieldNodes,
        visitedFragmentNames
      );
    }
  });

  return subFieldNodes;
}

export const getFieldsNotInSubschema = memoizeInfoAnd2Objectsand1Primitive(function (
  info: GraphQLResolveInfo,
  subschema: GraphQLSchema | SubschemaConfig,
  mergedTypeInfo: MergedTypeInfo,
  typeName: string
): Array<FieldNode> {
  const typeMap = isSubschemaConfig(subschema) ? mergedTypeInfo.typeMaps.get(subschema) : subschema.getTypeMap();
  const fields = (typeMap[typeName] as GraphQLObjectType).getFields();

  const subFieldNodes = collectSubFields(info, typeName);

  let fieldsNotInSchema: Array<FieldNode> = [];
  Object.keys(subFieldNodes).forEach(responseName => {
    const fieldName = subFieldNodes[responseName][0].name.value;
    if (!(fieldName in fields)) {
      fieldsNotInSchema = fieldsNotInSchema.concat(subFieldNodes[responseName]);
    }
  });

  return fieldsNotInSchema;
});
