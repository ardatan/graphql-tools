import { GraphQLSchema } from 'graphql';
import { mapSchema, MapperKind } from '@graphql-tools/utils';
import { decorateWithLogger } from './decorateWithLogger';
import { ILogger } from './types';

export function addErrorLoggingToSchema(schema: GraphQLSchema, logger?: ILogger): GraphQLSchema {
  if (!logger) {
    throw new Error('Must provide a logger');
  }
  if (typeof logger.log !== 'function') {
    throw new Error('Logger.log must be a function');
  }
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig, fieldName, typeName) => ({
      ...fieldConfig,
      resolve: decorateWithLogger(fieldConfig.resolve, logger, `${typeName}.${fieldName}`),
    }),
  });
}
