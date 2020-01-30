import {
  GraphQLResolveInfo,
  responsePathAsArray,
  getNullableType,
  isCompositeType,
  isLeafType,
  isListType,
  ExecutionResult,
  GraphQLCompositeType,
  GraphQLError,
  GraphQLList,
  GraphQLOutputType,
  GraphQLType,
  GraphQLSchema,
  FieldNode,
  isAbstractType,
  GraphQLObjectType,
} from 'graphql';
import { getResponseKeyFromInfo } from './getResponseKeyFromInfo';
import {
  relocatedError,
  combineErrors,
  getErrorsByPathSegment,
} from './errors';
import {
  SubschemaConfig,
  IGraphQLToolsResolveInfo,
  isSubschemaConfig,
  MergedTypeInfo,
} from '../Interfaces';
import resolveFromParentTypename from './resolveFromParentTypename';
import { setErrors, setObjectSubschema } from './proxiedResult';
import { mergeFields } from './mergeFields';
import { collectFields, ExecutionContext } from 'graphql/execution/execute';

export function checkResultAndHandleErrors(
  result: ExecutionResult,
  context: Record<string, any>,
  info: GraphQLResolveInfo,
  responseKey?: string,
  subschema?: GraphQLSchema | SubschemaConfig,
  returnType: GraphQLOutputType = info.returnType,
  skipTypeMerging?: boolean,
): any {
  if (!responseKey) {
    responseKey = getResponseKeyFromInfo(info);
  }

  const errors = result.errors || [];
  const data = result.data && result.data[responseKey];

  return handleResult(data, errors, subschema, context, info, returnType, skipTypeMerging);
}

export function handleResult(
  result: any,
  errors: ReadonlyArray<GraphQLError>,
  subschema: GraphQLSchema | SubschemaConfig,
  context: Record<string, any>,
  info: IGraphQLToolsResolveInfo,
  returnType = info.returnType,
  skipTypeMerging?: boolean,
): any {
  const type = getNullableType(returnType);

  if (result == null) {
    return handleNull(info.fieldNodes, responsePathAsArray(info.path), errors);
  }

  if (isLeafType(type)) {
    return type.parseValue(result);
  } else if (isCompositeType(type)) {
    return handleObject(type, result, errors, subschema, context, info, skipTypeMerging);
  } else if (isListType(type)) {
    return handleList(type, result, errors, subschema, context, info, skipTypeMerging);
  }
}

function handleList(
  type: GraphQLList<any>,
  list: Array<any>,
  errors: ReadonlyArray<GraphQLError>,
  subschema: GraphQLSchema | SubschemaConfig,
  context: Record<string, any>,
  info: IGraphQLToolsResolveInfo,
  skipTypeMerging?: boolean,
) {
  const childErrors = getErrorsByPathSegment(errors);

  list = list.map((listMember, index) => handleListMember(
    getNullableType(type.ofType),
    listMember,
    index,
    childErrors[index] || [],
    subschema,
    context,
    info,
    skipTypeMerging,
  ));

  return list;
}

function handleListMember(
  type: GraphQLType,
  listMember: any,
  index: number,
  errors: ReadonlyArray<GraphQLError>,
  subschema: GraphQLSchema | SubschemaConfig,
  context: Record<string, any>,
  info: IGraphQLToolsResolveInfo,
  skipTypeMerging?: boolean,
): any {
  if (listMember == null) {
    return handleNull(info.fieldNodes, [...responsePathAsArray(info.path), index], errors);
  }

  if (isLeafType(type)) {
    return type.parseValue(listMember);
  } else if (isCompositeType(type)) {
    return handleObject(type, listMember, errors, subschema, context, info, skipTypeMerging);
  } else if (isListType(type)) {
    return handleList(type, listMember, errors, subschema, context, info, skipTypeMerging);
  }
}

export function handleObject(
  type: GraphQLCompositeType,
  object: any,
  errors: ReadonlyArray<GraphQLError>,
  subschema: GraphQLSchema | SubschemaConfig,
  context: Record<string, any>,
  info: IGraphQLToolsResolveInfo,
  skipTypeMerging?: boolean,
) {
  setErrors(object, errors.map(error => {
    return relocatedError(
      error,
      error.nodes,
      error.path ? error.path.slice(1) : undefined
    );
  }));

  setObjectSubschema(object, subschema);

  if (skipTypeMerging || !info.mergeInfo) {
    return object;
  }

  const typeName =
    isAbstractType(type) ?
      info.schema.getTypeMap()[resolveFromParentTypename(object)].name :
      type.name;
  const mergedTypeInfo = info.mergeInfo.mergedTypes[typeName];
  let targetSubschemas = mergedTypeInfo && mergedTypeInfo.subschemas;

  if (!targetSubschemas) {
    return object;
  }

  targetSubschemas = targetSubschemas.filter(s => s !== subschema);
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
  info.fieldNodes.forEach(fieldNode => {
    subFieldNodes = collectFields(
      { schema: info.schema, variableValues: info.variableValues, fragments: info.fragments } as ExecutionContext,
      info.schema.getType(typeName) as GraphQLObjectType<any, any>,
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
  const typeMap = isSubschemaConfig(subschema) ?
    mergedTypeInfo.typeMaps.get(subschema) : subschema.getTypeMap();
  const fields = (typeMap[typeName] as GraphQLObjectType).getFields();

  const fieldsNotInSchema: Array<FieldNode> = [];
  Object.keys(subFieldNodes).forEach(responseName => {
    subFieldNodes[responseName].forEach(subFieldNode => {
      if (!fields[subFieldNode.name.value]) {
        fieldsNotInSchema.push(subFieldNode);
      }
    });
  });

  return fieldsNotInSchema;
}

export function handleNull(
  fieldNodes: ReadonlyArray<FieldNode>,
  path: Array<string | number>,
  errors: ReadonlyArray<GraphQLError>,
) {
  if (errors.length) {
    if (errors.some(error => !error.path || error.path.length < 2)) {
      return relocatedError(
        combineErrors(errors),
        fieldNodes,
        path,
      );

    } else if (errors.some(error => typeof error.path[1] === 'string')) {
      const childErrors = getErrorsByPathSegment(errors);

      const result = Object.create(null);
      Object.keys(childErrors).forEach(pathSegment => {
        result[pathSegment] = handleNull(fieldNodes, [...path, pathSegment], childErrors[pathSegment]);
      });

      return result;

    } else {
      const childErrors = getErrorsByPathSegment(errors);

      const result = new Array;
      Object.keys(childErrors).forEach(pathSegment => {
        result.push(handleNull(fieldNodes, [...path, parseInt(pathSegment, 10)], childErrors[pathSegment]));
      });

      return result;
    }
  } else {
    return null;
  }
}
