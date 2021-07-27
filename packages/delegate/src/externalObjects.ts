import { GraphQLError, GraphQLFieldMap, GraphQLObjectType, GraphQLResolveInfo, GraphQLSchema } from 'graphql';

import {
  OBJECT_SUBSCHEMA_SYMBOL,
  INITIAL_POSSIBLE_FIELDS,
  INFO_SYMBOL,
  RESPONSE_KEY_SUBSCHEMA_MAP_SYMBOL,
  UNPATHED_ERRORS_SYMBOL,
  INITIAL_PATH_SYMBOL,
} from './symbols';
import { ExternalObject, SubschemaConfig } from './types';
import { Subschema } from './Subschema';

export function isExternalObject(data: any): data is ExternalObject {
  return data[UNPATHED_ERRORS_SYMBOL] !== undefined;
}

export function createExternalObject(
  object: any,
  errors: Array<GraphQLError>,
  initialPath: Array<string | number>,
  subschema: GraphQLSchema | SubschemaConfig,
  info?: GraphQLResolveInfo
): ExternalObject {
  const schema =
    subschema instanceof Subschema ? subschema.transformedSchema : (subschema as SubschemaConfig)?.schema ?? subschema;

  const initialPossibleFields = (schema.getType(object.__typename) as GraphQLObjectType)?.getFields();

  const newObject = { ...object };

  Object.defineProperties(newObject, {
    [INITIAL_PATH_SYMBOL]: { value: initialPath },
    [OBJECT_SUBSCHEMA_SYMBOL]: { value: subschema },
    [INITIAL_POSSIBLE_FIELDS]: { value: initialPossibleFields },
    [INFO_SYMBOL]: { value: info },
    [RESPONSE_KEY_SUBSCHEMA_MAP_SYMBOL]: { value: Object.create(null) },
    [UNPATHED_ERRORS_SYMBOL]: { value: errors },
  });

  return newObject;
}

export function getInitialPath(object: ExternalObject): Array<string | number> {
  return object[INITIAL_PATH_SYMBOL];
}

export function getInitialPossibleFields(object: ExternalObject): GraphQLFieldMap<any, any> {
  return object[INITIAL_POSSIBLE_FIELDS];
}

export function getInfo(object: ExternalObject): GraphQLResolveInfo {
  return object[INFO_SYMBOL];
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
