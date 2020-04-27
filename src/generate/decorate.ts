import {
  defaultFieldResolver,
  GraphQLSchema,
  GraphQLFieldResolver,
} from 'graphql';

import { ILogger } from '../Interfaces';
import { forEachField } from '../utils/index';

import decorateWithLogger from './decorateWithLogger';

function decorateToCatchUndefined(
  fn: GraphQLFieldResolver<any, any>,
  hint: string,
): GraphQLFieldResolver<any, any> {
  const resolve = fn == null ? defaultFieldResolver : fn;
  return (root, args, ctx, info) => {
    const result = resolve(root, args, ctx, info);
    if (typeof result === 'undefined') {
      throw new Error(`Resolver for "${hint}" returned undefined`);
    }
    return result;
  };
}

export function addCatchUndefinedToSchema(schema: GraphQLSchema): void {
  forEachField(schema, (field, typeName, fieldName) => {
    const errorHint = `${typeName}.${fieldName}`;
    field.resolve = decorateToCatchUndefined(field.resolve, errorHint);
  });
}

export function addErrorLoggingToSchema(
  schema: GraphQLSchema,
  logger?: ILogger,
): void {
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
