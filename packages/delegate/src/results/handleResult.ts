import {
  GraphQLResolveInfo,
  getNullableType,
  isCompositeType,
  isLeafType,
  isListType,
  GraphQLError,
  GraphQLSchema,
  responsePathAsArray,
} from 'graphql';

import { SubschemaConfig } from '../types';

import { handleNull } from './handleNull';
import { handleObject } from './handleObject';
import { handleList } from './handleList';
import { extendedError } from '@graphql-tools/utils';

export function handleResult(
  result: any,
  errors: ReadonlyArray<GraphQLError>,
  subschema: GraphQLSchema | SubschemaConfig,
  context: Record<string, any>,
  info: GraphQLResolveInfo,
  returnType = info.returnType,
  skipTypeMerging?: boolean
): any {
  const annotatedErrors = errors.map(error => {
    if (error.extensions?.graphQLToolsMergedPath == null) {
      return extendedError(error, {
        ...error.extensions,
        graphQLToolsMergedPath:
          info == null
            ? error.path
            : error.path != null
            ? [...responsePathAsArray(info.path), ...error.path.slice(1)]
            : responsePathAsArray(info.path),
      });
    }
    return error;
  });

  const type = getNullableType(returnType);

  if (result == null) {
    return handleNull(annotatedErrors);
  }

  if (isLeafType(type)) {
    return type.parseValue(result);
  } else if (isCompositeType(type)) {
    return handleObject(type, result, annotatedErrors, subschema, context, info, skipTypeMerging);
  } else if (isListType(type)) {
    return handleList(type, result, annotatedErrors, subschema, context, info, skipTypeMerging);
  }
}
