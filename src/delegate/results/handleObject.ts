import {
  GraphQLCompositeType,
  GraphQLError,
  GraphQLSchema,
  isAbstractType,
  FieldNode,
  GraphQLObjectType,
} from 'graphql';
import { ExecutionContext } from 'graphql/execution/execute';

import { collectFields } from '../../utils/collectFields';

import {
  SubschemaConfig,
  IGraphQLToolsResolveInfo,
  MergedTypeInfo,
  isSubschemaConfig,
} from '../../Interfaces';
import { setErrors, relocatedError } from '../../stitch/errors';
import { setObjectSubschema } from '../../stitch/subSchema';
import resolveFromParentTypename from '../../stitch/resolveFromParentTypename';
import { mergeFields } from '../../stitch/mergeFields';

export function handleObject(
  type: GraphQLCompositeType,
  object: any,
  errors: ReadonlyArray<GraphQLError>,
  subschema: GraphQLSchema | SubschemaConfig,
  context: Record<string, any>,
  info: IGraphQLToolsResolveInfo,
  skipTypeMerging?: boolean,
) {
  setErrors(
    object,
    errors.map((error) =>
      relocatedError(
        error,
        error.nodes,
        error.path != null ? error.path.slice(1) : undefined,
      ),
    ),
  );

  setObjectSubschema(object, subschema);

  if (skipTypeMerging || !info.mergeInfo) {
    return object;
  }

  const typeName = isAbstractType(type)
    ? info.schema.getTypeMap()[resolveFromParentTypename(object)].name
    : type.name;
  const mergedTypeInfo = info.mergeInfo.mergedTypes[typeName];
  let targetSubschemas: Array<SubschemaConfig>;

  if (mergedTypeInfo != null) {
    targetSubschemas = mergedTypeInfo.subschemas;
  }

  if (!targetSubschemas) {
    return object;
  }

  targetSubschemas = targetSubschemas.filter((s) => s !== subschema);
  if (!targetSubschemas.length) {
    return object;
  }

  const subFields = collectSubFields(info, object.__typename);

  const selections = getFieldsNotInSubschema(
    subFields,
    subschema,
    mergedTypeInfo,
    object.__typename,
  );

  return mergeFields(
    mergedTypeInfo,
    typeName,
    object,
    selections,
    [subschema as SubschemaConfig],
    targetSubschemas,
    context,
    info,
  );
}

function collectSubFields(info: IGraphQLToolsResolveInfo, typeName: string) {
  let subFieldNodes: Record<string, Array<FieldNode>> = Object.create(null);
  const visitedFragmentNames = Object.create(null);
  info.fieldNodes.forEach((fieldNode) => {
    subFieldNodes = collectFields(
      ({
        schema: info.schema,
        variableValues: info.variableValues,
        fragments: info.fragments,
      } as unknown) as ExecutionContext,
      info.schema.getType(typeName) as GraphQLObjectType,
      fieldNode.selectionSet,
      subFieldNodes,
      visitedFragmentNames,
    );
  });
  return subFieldNodes;
}

function getFieldsNotInSubschema(
  subFieldNodes: Record<string, Array<FieldNode>>,
  subschema: GraphQLSchema | SubschemaConfig,
  mergedTypeInfo: MergedTypeInfo,
  typeName: string,
): Array<FieldNode> {
  const typeMap = isSubschemaConfig(subschema)
    ? mergedTypeInfo.typeMaps.get(subschema)
    : subschema.getTypeMap();
  const fields = (typeMap[typeName] as GraphQLObjectType).getFields();

  const fieldsNotInSchema: Array<FieldNode> = [];
  Object.keys(subFieldNodes).forEach((responseName) => {
    subFieldNodes[responseName].forEach((subFieldNode) => {
      if (!(subFieldNode.name.value in fields)) {
        fieldsNotInSchema.push(subFieldNode);
      }
    });
  });

  return fieldsNotInSchema;
}
