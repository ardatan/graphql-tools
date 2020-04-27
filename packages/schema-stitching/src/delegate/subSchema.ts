import { GraphQLSchema } from 'graphql';

import { SubschemaConfig } from '../Interfaces';

import { FIELD_SUBSCHEMA_MAP_SYMBOL, OBJECT_SUBSCHEMA_SYMBOL } from './symbols';

export function getSubschema(result: any, responseKey: string): GraphQLSchema | SubschemaConfig {
  const subschema = result[FIELD_SUBSCHEMA_MAP_SYMBOL] && result[FIELD_SUBSCHEMA_MAP_SYMBOL][responseKey];
  return subschema || result[OBJECT_SUBSCHEMA_SYMBOL];
}

export function setObjectSubschema(result: any, subschema: GraphQLSchema | SubschemaConfig) {
  result[OBJECT_SUBSCHEMA_SYMBOL] = subschema;
}
