import { GraphQLError, GraphQLResolveInfo, responsePathAsArray, SelectionSetNode, GraphQLObjectType } from 'graphql';

import {
  mergeDeep,
  ERROR_SYMBOL,
  extendedError,
  collectFields,
  GraphQLExecutionContext,
  relocatedError,
} from '@graphql-tools/utils';

import { SubschemaConfig } from '../types';
import { OBJECT_SUBSCHEMA_SYMBOL, FIELD_SUBSCHEMA_MAP_SYMBOL } from '../symbols';

export function mergeProxiedResults(
  info: GraphQLResolveInfo,
  target: any,
  sources: Array<any>,
  selectionSets: Array<SelectionSetNode>
): any {
  const results: Array<any> = [];
  let errors: Array<GraphQLError> = [];

  const path = responsePathAsArray(info.path);

  sources.forEach((source, index) => {
    if (source instanceof GraphQLError) {
      const selectionSet = selectionSets[index];
      const fieldNodes = collectFields(
        {
          schema: info.schema,
          variableValues: {},
          fragments: {},
        } as GraphQLExecutionContext,
        info.schema.getType(target.__typename) as GraphQLObjectType,
        selectionSet,
        Object.create(null),
        Object.create(null)
      );
      const nullResult = {};
      Object.keys(fieldNodes).forEach(responseKey => {
        errors.push(relocatedError(source, [responseKey]));
        nullResult[responseKey] = null;
      });
    } else {
      errors = errors.concat(source[ERROR_SYMBOL]);
      results.push(source);
    }
  });

  const fieldSubschemaMap = results.reduce((acc: Record<any, SubschemaConfig>, source: any) => {
    const subschema = source[OBJECT_SUBSCHEMA_SYMBOL];
    Object.keys(source).forEach(key => {
      acc[key] = subschema;
    });
    return acc;
  }, {});

  const result = results.reduce(mergeDeep, target);
  result[FIELD_SUBSCHEMA_MAP_SYMBOL] = target[FIELD_SUBSCHEMA_MAP_SYMBOL]
    ? Object.assign({}, target[FIELD_SUBSCHEMA_MAP_SYMBOL], fieldSubschemaMap)
    : fieldSubschemaMap;

  const annotatedErrors = errors.map(error => {
    return extendedError(error, {
      ...error.extensions,
      graphQLToolsMergedPath: error.path != null ? [...path, ...error.path] : responsePathAsArray(info.path),
    });
  });

  result[ERROR_SYMBOL] = target[ERROR_SYMBOL].concat(annotatedErrors);

  return result;
}
