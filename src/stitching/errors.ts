import {
  GraphQLResolveInfo,
  responsePathAsArray,
  ExecutionResult,
  GraphQLFormattedError,
  GraphQLError,
} from 'graphql';
import { locatedError } from 'graphql/error';
import { getResponseKeyFromInfo } from './getResponseKeyFromInfo';

export let ERROR_SYMBOL: any;
if (
  (typeof global !== 'undefined' && 'Symbol' in global) ||
  (typeof window !== 'undefined' && 'Symbol' in window)
) {
  ERROR_SYMBOL = Symbol('subSchemaErrors');
} else {
  ERROR_SYMBOL = '@@__subSchemaErrors';
}

export function annotateWithChildrenErrors(
  object: any,
  childrenErrors: ReadonlyArray<GraphQLFormattedError>
): any {
  if (!childrenErrors || childrenErrors.length === 0) {
    // Nothing to see here, move along
    return object;
  }

  if (Array.isArray(object)) {
    const byIndex = {};

    childrenErrors.forEach(error => {
      if (!error.path) {
        return;
      }
      const index = error.path[1];
      const current = byIndex[index] || [];
      current.push({
        ...error,
        path: error.path.slice(1)
      });
      byIndex[index] = current;
    });

    return object.map((item, index) => annotateWithChildrenErrors(item, byIndex[index]));
  }

  return {
    ...object,
    [ERROR_SYMBOL]: childrenErrors.map(error => ({
      ...error,
      ...(error.path ? { path: error.path.slice(1) } : {})
    }))
  };
}

export function getErrorsFromParent(
  object: any,
  fieldName: string
):
  | {
      kind: 'OWN';
      error: any;
    }
  | {
      kind: 'CHILDREN';
      errors?: Array<GraphQLFormattedError>;
    } {
  const errors = (object && object[ERROR_SYMBOL]) || [];
  const childrenErrors: Array<GraphQLFormattedError> = [];

  for (const error of errors) {
    if (!error.path || (error.path.length === 1 && error.path[0] === fieldName)) {
      return {
        kind: 'OWN',
        error
      };
    } else if (error.path[0] === fieldName) {
      childrenErrors.push(error);
    }
  }

  return {
    kind: 'CHILDREN',
    errors: childrenErrors
  };
}

class CombinedError extends Error {
  public errors: ReadonlyArray<GraphQLError>;
  constructor(message: string, errors: ReadonlyArray<GraphQLError>) {
    super(message);
    this.errors = errors;
  }
}

export function checkResultAndHandleErrors(
  result: ExecutionResult,
  info: GraphQLResolveInfo,
  responseKey?: string
): any {
  if (!responseKey) {
    responseKey = getResponseKeyFromInfo(info);
  }

  if (result.errors && (!result.data || result.data[responseKey] == null)) {
    // apollo-link-http & http-link-dataloader need the
    // result property to be passed through for better error handling.
    // If there is only one error, which contains a result property, pass the error through
    const newError =
      result.errors.length === 1 && hasResult(result.errors[0])
        ? new GraphQLError(
            result.errors[0].message,
            null,
            null,
            null,
            result.errors[0].path,
            result.errors[0],
            result.errors[0].extensions
          )
        : new CombinedError(concatErrors(result.errors), result.errors);
    throw locatedError(newError, info.fieldNodes, responsePathAsArray(info.path));
  }

  let resultObject = result.data[responseKey];
  if (result.errors) {
    resultObject = annotateWithChildrenErrors(resultObject, result.errors as ReadonlyArray<GraphQLFormattedError>);
  }
  return resultObject;
}

function concatErrors(errors: ReadonlyArray<GraphQLError>) {
  return errors.map(error => error.message).join('\n');
}

function hasResult(error: any) {
  return error.result || error.extensions || (error.originalError && error.originalError.result);
}
