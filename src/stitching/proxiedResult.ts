import {
  GraphQLError,
  GraphQLSchema,
} from 'graphql';
import { SubschemaConfig } from '../Interfaces';

export let SUBSCHEMAS_SYMBOL: any;
export let ERROR_SYMBOL: any;
if (
  (typeof global !== 'undefined' && 'Symbol' in global) ||
  (typeof window !== 'undefined' && 'Symbol' in window)
) {
  SUBSCHEMAS_SYMBOL = Symbol('subschemas');
  ERROR_SYMBOL = Symbol('subschemaErrors');
} else {
  SUBSCHEMAS_SYMBOL = Symbol('subschemas');
  ERROR_SYMBOL = '@@__subschemaErrors';
}

export function isProxiedResult(result: any) {
  return result && result[ERROR_SYMBOL];
}

export function getSubschemas(result: any): Array<GraphQLSchema | SubschemaConfig> {
  return result && result[SUBSCHEMAS_SYMBOL];
}

export function setSubschemas(result: any, subschemas: Array<GraphQLSchema | SubschemaConfig>) {
  result[SUBSCHEMAS_SYMBOL] = subschemas;
}

export function setErrors(result: any, errors: Array<GraphQLError>) {
  result[ERROR_SYMBOL] = errors;
}

export function getErrors(
  result: any,
  pathSegment: string
): Array<GraphQLError> {
  const errors = result && result[ERROR_SYMBOL];

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
