import { GraphQLError, GraphQLSchema } from 'graphql';

import { RESPONSE_KEY_SUBSCHEMA_MAP_SYMBOL, OBJECT_SUBSCHEMA_SYMBOL, UNPATHED_ERRORS_SYMBOL } from './symbols';
import { ExternalObject, SubschemaConfig } from './types';

export function isExternalObject(data: any): data is ExternalObject {
  return data[UNPATHED_ERRORS_SYMBOL] !== undefined;
}

export function annotateExternalObject(
  object: any,
  errors: Array<GraphQLError>,
  objectSubschema: GraphQLSchema | SubschemaConfig,
  subschemaMap?: Record<string, GraphQLSchema | SubschemaConfig>
): ExternalObject {
  Object.defineProperties(object, {
    [UNPATHED_ERRORS_SYMBOL]: { value: errors },
    [OBJECT_SUBSCHEMA_SYMBOL]: { value: objectSubschema },
    [RESPONSE_KEY_SUBSCHEMA_MAP_SYMBOL]: { value: subschemaMap ?? Object.create(null) },
  });
  return object;
}

export function getUnpathedErrors(object: ExternalObject): Array<GraphQLError> {
  return object[UNPATHED_ERRORS_SYMBOL];
}

export function getObjectSubchema(object: ExternalObject): GraphQLSchema | SubschemaConfig {
  return object[OBJECT_SUBSCHEMA_SYMBOL];
}

export function getSubschemaMap(object: ExternalObject): Record<string, GraphQLSchema | SubschemaConfig> {
  return object[RESPONSE_KEY_SUBSCHEMA_MAP_SYMBOL];
}

export function getSubschema(object: ExternalObject, responseKey: string): GraphQLSchema | SubschemaConfig {
  return object[RESPONSE_KEY_SUBSCHEMA_MAP_SYMBOL][responseKey] ?? object[OBJECT_SUBSCHEMA_SYMBOL];
}
