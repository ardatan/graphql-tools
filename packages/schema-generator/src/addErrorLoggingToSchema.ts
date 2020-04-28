import { GraphQLSchema } from 'graphql';
import { forEachField, ILogger } from '@graphql-tools/utils';
import { decorateWithLogger } from './decorateWithLogger';

export function addErrorLoggingToSchema(schema: GraphQLSchema, logger?: ILogger): void {
  if (!logger) {
    throw new Error('Must provide a logger');
  }
  if (typeof logger.log !== 'function') {
    throw new Error('Logger.log must be a function');
  }
  forEachField(schema, (field, typeName, fieldName) => {
    const errorHint = `${typeName}.${fieldName}`;
    field.resolve = decorateWithLogger(field.resolve, logger, errorHint);
  });
}
