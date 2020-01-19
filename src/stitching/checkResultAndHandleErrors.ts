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
} from '../Interfaces';
import resolveFromParentTypename from './resolveFromParentTypename';
import { setErrors, setSubschemas } from './proxiedResult';
import { mergeDeep } from '../utils';

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
  const subschemas = [subschema];

  return handleResult(data, errors, subschemas, context, info, returnType, skipTypeMerging);
}

export function handleResult(
  result: any,
  errors: ReadonlyArray<GraphQLError>,
  subschemas: Array<GraphQLSchema | SubschemaConfig>,
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
    return handleObject(type, result, errors, subschemas, context, info, skipTypeMerging);
  } else if (isListType(type)) {
    return handleList(type, result, errors, subschemas, context, info, skipTypeMerging);
  }
}

export function makeObjectProxiedResult(
  object: any,
  errors: ReadonlyArray<GraphQLError>,
  subschemas: Array<GraphQLSchema | SubschemaConfig>,
) {
  setErrors(object, errors.map(error => {
    return relocatedError(
      error,
      error.nodes,
      error.path ? error.path.slice(1) : undefined
    );
  }));
  setSubschemas(object, subschemas);
}

export function handleObject(
  type: GraphQLCompositeType,
  object: any,
  errors: ReadonlyArray<GraphQLError>,
  subschemas: Array<GraphQLSchema | SubschemaConfig>,
  context: Record<string, any>,
  info: IGraphQLToolsResolveInfo,
  skipTypeMerging?: boolean,
) {
  makeObjectProxiedResult(object, errors, subschemas);
  if (skipTypeMerging || !info.mergeInfo) {
    return object;
  } else {
    return mergeFields(
      type,
      object,
      subschemas,
      context,
      info,
    );
  }
}

function handleList(
  type: GraphQLList<any>,
  list: Array<any>,
  errors: ReadonlyArray<GraphQLError>,
  subschemas: Array<GraphQLSchema | SubschemaConfig>,
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
    subschemas,
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
  subschemas: Array<GraphQLSchema | SubschemaConfig>,
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
    return handleObject(type, listMember, errors, subschemas, context, info, skipTypeMerging);
  } else if (isListType(type)) {
    return handleList(type, listMember, errors, subschemas, context, info, skipTypeMerging);
  }
}

function mergeFields(
  type: GraphQLCompositeType,
  object: any,
  subschemas: Array<GraphQLSchema | SubschemaConfig>,
  context: Record<string, any>,
  info: IGraphQLToolsResolveInfo,
): any {
  let typeName: string;
  if (isAbstractType(type)) {
    typeName = info.schema.getTypeMap()[resolveFromParentTypename(object)].name;
  } else {
    typeName = type.name;
  }

  const initialSchemas =
    info.mergeInfo.mergedTypes[typeName] &&
    info.mergeInfo.mergedTypes[typeName].subschemas;
  if (initialSchemas) {
    const remainingSubschemas = initialSchemas.filter(
      subschema => !subschemas.includes(subschema)
    );
    if (remainingSubschemas.length) {
      const maybePromises = remainingSubschemas.map(subschema => {
        return subschema.mergedTypeConfigs[typeName].mergedTypeResolver(subschema, object, context, info);
      });

      let containsPromises = false; {
        for (const maybePromise of maybePromises) {
          if (maybePromise instanceof Promise) {
            containsPromises = true;
            break;
          }
        }
      }
      if (containsPromises) {
        return Promise.all(maybePromises).
          then(results => results.reduce((acc: any, r: ExecutionResult) => mergeDeep(acc, r), object));
      } else {
        return maybePromises.reduce((acc: any, r: ExecutionResult) => mergeDeep(acc, r), object);
      }
    }
  }

  return object;
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
