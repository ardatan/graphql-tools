import { GraphQLSchema, GraphQLError, GraphQLObjectType, SelectionSetNode } from 'graphql';

import {
  slicedError,
  extendedError,
  mergeDeep,
  relocatedError,
  GraphQLExecutionContext,
  collectFields,
} from '@graphql-tools/utils';

import { SubschemaConfig, ExternalData } from './types';
import { OBJECT_SUBSCHEMA_SYMBOL, FIELD_SUBSCHEMA_MAP_SYMBOL, ERROR_SYMBOL } from './symbols';

export function isExternalData(data: any): data is ExternalData {
  return data[ERROR_SYMBOL] !== undefined;
}

export function annotateExternalData(
  data: any,
  errors: Array<GraphQLError>,
  subschema: GraphQLSchema | SubschemaConfig
): ExternalData {
  Object.defineProperties(data, {
    [OBJECT_SUBSCHEMA_SYMBOL]: { value: subschema },
    [FIELD_SUBSCHEMA_MAP_SYMBOL]: { value: Object.create(null) },
    [ERROR_SYMBOL]: { value: errors },
  });
  return data;
}

export function getSubschema(data: ExternalData, responseKey: string): GraphQLSchema | SubschemaConfig {
  return data[FIELD_SUBSCHEMA_MAP_SYMBOL][responseKey] ?? data[OBJECT_SUBSCHEMA_SYMBOL];
}

export function getErrors(data: ExternalData, pathSegment: string): Array<GraphQLError> {
  const errors = data == null ? data : data[ERROR_SYMBOL];

  if (!Array.isArray(errors)) {
    return null;
  }

  const fieldErrors = [];

  for (const error of errors) {
    if (!error.path || error.path[0] === pathSegment) {
      fieldErrors.push(error);
    }
  }

  return fieldErrors;
}

export function getErrorsByPathSegment(errors: ReadonlyArray<GraphQLError>): Record<string, Array<GraphQLError>> {
  const record = Object.create(null);
  errors.forEach(error => {
    if (!error.path || error.path.length < 2) {
      return;
    }

    const pathSegment = error.path[1];

    const current = pathSegment in record ? record[pathSegment] : [];
    current.push(slicedError(error));
    record[pathSegment] = current;
  });

  return record;
}

export function mergeExternalData(
  schema: GraphQLSchema,
  path: Array<string | number>,
  typeName: string,
  target: ExternalData,
  sources: Array<ExternalData>,
  selectionSets: Array<SelectionSetNode>
): ExternalData {
  const results: Array<any> = [];
  let errors: Array<GraphQLError> = [];

  sources.forEach((source, index) => {
    if (source instanceof GraphQLError) {
      const selectionSet = selectionSets[index];
      const fieldNodes = collectFields(
        {
          schema,
          variableValues: {},
          fragments: {},
        } as GraphQLExecutionContext,
        schema.getType(typeName) as GraphQLObjectType,
        selectionSet,
        Object.create(null),
        Object.create(null)
      );
      const nullResult = {};
      Object.keys(fieldNodes).forEach(responseKey => {
        errors.push(relocatedError(source, [responseKey]));
        nullResult[responseKey] = null;
      });
      results.push(nullResult);
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
      graphQLToolsMergedPath: error.path != null ? [...path, ...error.path] : path,
    });
  });

  result[ERROR_SYMBOL] = target[ERROR_SYMBOL].concat(annotatedErrors);

  return result;
}
