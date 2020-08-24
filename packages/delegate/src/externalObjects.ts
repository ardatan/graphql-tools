import { GraphQLSchema, GraphQLError, GraphQLObjectType, SelectionSetNode } from 'graphql';

import { mergeDeep, relocatedError, GraphQLExecutionContext, collectFields } from '@graphql-tools/utils';

import { SubschemaConfig, ExternalObject } from './types';
import { OBJECT_SUBSCHEMA_SYMBOL, FIELD_SUBSCHEMA_MAP_SYMBOL, UNPATHED_ERRORS_SYMBOL } from './symbols';

export function isExternalObject(data: any): data is ExternalObject {
  return data[UNPATHED_ERRORS_SYMBOL] !== undefined;
}

export function annotateExternalObject(
  object: any,
  errors: Array<GraphQLError>,
  subschema: GraphQLSchema | SubschemaConfig
): ExternalObject {
  Object.defineProperties(object, {
    [OBJECT_SUBSCHEMA_SYMBOL]: { value: subschema },
    [FIELD_SUBSCHEMA_MAP_SYMBOL]: { value: Object.create(null) },
    [UNPATHED_ERRORS_SYMBOL]: { value: errors },
  });
  return object;
}

export function getSubschema(object: ExternalObject, responseKey: string): GraphQLSchema | SubschemaConfig {
  return object[FIELD_SUBSCHEMA_MAP_SYMBOL][responseKey] ?? object[OBJECT_SUBSCHEMA_SYMBOL];
}

export function getUnpathedErrors(object: ExternalObject): Array<GraphQLError> {
  return object[UNPATHED_ERRORS_SYMBOL];
}

export function mergeExternalObjects(
  schema: GraphQLSchema,
  path: Array<string | number>,
  typeName: string,
  target: ExternalObject,
  sources: Array<ExternalObject>,
  selectionSets: Array<SelectionSetNode>
): ExternalObject {
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
        nullResult[responseKey] = relocatedError(source, path.concat([responseKey]));
      });
      results.push(nullResult);
    } else {
      errors = errors.concat(source[UNPATHED_ERRORS_SYMBOL]);
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

  result[UNPATHED_ERRORS_SYMBOL] = target[UNPATHED_ERRORS_SYMBOL].concat(errors);

  return result;
}
