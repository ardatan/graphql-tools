import {
  GraphQLResolveInfo,
  responsePathAsArray,
  getNullableType,
  isObjectType,
  isListType,
  ExecutionResult,
  GraphQLError,
  ASTNode
} from 'graphql';
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

export function relocatedError(
  originalError: Error | GraphQLError,
  nodes: ReadonlyArray<ASTNode>,
  path: ReadonlyArray<string | number>
): GraphQLError {
  if (Array.isArray((originalError as GraphQLError).path)) {
    return new GraphQLError(
      (originalError as GraphQLError).message,
      (originalError as GraphQLError).nodes,
      (originalError as GraphQLError).source,
      (originalError as GraphQLError).positions,
      path ? path : (originalError as GraphQLError).path,
      (originalError as GraphQLError).originalError,
      (originalError as GraphQLError).extensions
    );
  }

  return new GraphQLError(
    originalError && originalError.message,
    (originalError && (originalError as any).nodes) || nodes,
    originalError && (originalError as any).source,
    originalError && (originalError as any).positions,
    path,
    originalError,
  );
}

export function annotateWithChildrenErrors(object: any, childrenErrors: ReadonlyArray<GraphQLError>): any {
  if (!Array.isArray(childrenErrors)) {
    object[ERROR_SYMBOL] = [];
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
      current.push(
        relocatedError(
          error,
          error.nodes,
          error.path ? error.path.slice(1) : undefined
        )
      );
      byIndex[index] = current;
    });

    return object.map((item, index) => annotateWithChildrenErrors(item, byIndex[index]));
  }

  object[ERROR_SYMBOL] = childrenErrors.map(error => {
    const newError = relocatedError(
      error,
      error.nodes,
      error.path ? error.path.slice(1) : undefined
    );
    return newError;
  });

  return object;
}

export function getErrorsFromParent(
  object: any,
  fieldName: string
): Array<GraphQLError> {
  const errors = object && object[ERROR_SYMBOL];

  if (!Array.isArray(errors)) {
    return null;
  }

  const childrenErrors = [];

  for (const error of errors) {
    if (!error.path || error.path[0] === fieldName) {
      childrenErrors.push(error);
    }
  }

  return childrenErrors;
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

  if (!result.data || !result.data[responseKey]) {
    if (result.errors) {
      throw relocatedError(
        combineErrors(result.errors),
        info.fieldNodes,
        responsePathAsArray(info.path)
      );
    }
  }

  result.errors = result.errors || [];

  let resultObject = result.data[responseKey];
  const nullableType = getNullableType(info.returnType);
  if (isObjectType(nullableType) || isListType(nullableType)) {
    annotateWithChildrenErrors(resultObject, result.errors);
  }
  return resultObject;
}

export function combineErrors(errors: ReadonlyArray<GraphQLError>): GraphQLError | CombinedError {
  if (errors.length === 1) {
    return new GraphQLError(
      errors[0].message,
      errors[0].nodes,
      errors[0].source,
      errors[0].positions,
      errors[0].path,
      errors[0].originalError,
      errors[0].extensions
    );
  } else {
    return new CombinedError(errors.map(error => error.message).join('\n'), errors);
  }
}
