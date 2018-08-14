import { GraphQLResolveInfo, responsePathAsArray, ExecutionResult, GraphQLFormattedError, GraphQLError } from 'graphql';
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

export function annotateWithChildrenErrors(object: any, childrenErrors: Array<GraphQLFormattedError>): any {
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
  } else if (typeof (object) === 'object') {
    // decorate the children object
    return {
      ...object,
      [ERROR_SYMBOL]: childrenErrors.map(error => ({
        ...error,
        ...(error.path ? { path: error.path.slice(1) } : {}),
      }))
    };
  }
  // return this value anyway, either it is a primitive value or there is nothing wrong at all
  return object;
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

class ResultError extends Error {
  public errors: Error[];
  constructor(error: Error, errors: Error[]) {
    super(error.message);
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
    // both apollo-link-http & http-link-dataloader needed the
    // result property to be passed through for better error handling.

    let newError: Error = null; // Error instance that will be promoted later for a located error

    const currentPath = responsePathAsArray(info.path);
    // If there is only one error, which contains a result property
    if (result.errors.length === 1 && hasResult(result.errors[0])) {
      // Pass the error through
      newError = result.errors[0];
    } else {
      // If an error path exists, the result is probably coming from a remote schema/Apollo server,
      // so use the provided error in the result instead
      const joinedCurrentPath = currentPath.join('.'); // Cache the joined path for comparison
      const originalError = result.errors.find(
        (error: GraphQLError) => error.path && error.path.join('.') === joinedCurrentPath
      );
      newError = new ResultError(
        !!originalError // If we do have an error that matches the path of the current key
          ? originalError // Pass the original error
          : new Error(concatErrors(result.errors))  // otherwise fallback to concancate the error
        , result.errors
      );
    }

    throw locatedError(newError, info.fieldNodes, currentPath);
  }
  let resultObject = result.data[responseKey];
  if (result.errors) {
    resultObject = annotateWithChildrenErrors(resultObject, result.errors as Array<GraphQLFormattedError>);
  }
  return resultObject;
}

function concatErrors(errors: Error[]) {
  return errors.map(error => error.message).join('\n');
}

function hasResult(error: any) {
  return error.result || (error.originalError && error.originalError.result);
}
