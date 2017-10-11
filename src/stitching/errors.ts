import { GraphQLResolveInfo, responsePathAsArray } from 'graphql';
import { locatedError } from 'graphql/error';

const ERROR_SYMBOL = Symbol('Schema Merging Error');

export function annotateWithChildrenErrors(
  object: any,
  childrenErrors: Array<{ path?: Array<string | number> }>,
): any {
  if (childrenErrors && childrenErrors.length > 0) {
    if (Array.isArray(object)) {
      const byIndex = {};
      childrenErrors.forEach(error => {
        const index = error.path[1];
        const current = byIndex[index] || [];
        current.push({
          ...error,
          path: error.path.slice(1),
        });
        byIndex[index] = current;
      });
      return object.map((item, index) =>
        annotateWithChildrenErrors(item, byIndex[index]),
      );
    } else {
      return {
        ...object,
        [ERROR_SYMBOL]: childrenErrors.map(error => ({
          ...error,
          path: error.path.slice(1),
        })),
      };
    }
  } else {
    return object;
  }
}

export function getErrorsFromParent(
  object: any,
  fieldName: string,
): {
  ownError?: any;
  childrenErrors?: Array<{ path?: Array<string | number> }>;
} {
  const errors = (object && object[ERROR_SYMBOL]) || [];
  const childrenErrors: Array<{ path?: Array<string | number> }> = [];
  for (const error of errors) {
    if (error.path.length === 1 && error.path[0] === fieldName) {
      return {
        ownError: error,
      };
    } else if (error.path[0] === fieldName) {
      childrenErrors.push(error);
    }
  }
  return {
    childrenErrors,
  };
}

export function checkResultAndHandleErrors(
  result: any,
  info: GraphQLResolveInfo,
  fieldName?: string,
): any {
  if (!fieldName) {
    fieldName = info.fieldNodes[0].alias
      ? info.fieldNodes[0].alias.value
      : info.fieldName;
  }
  if (result.errors && (!result.data || result.data[fieldName] == null)) {
    const errorMessage = result.errors
      .map((error: { message: string }) => error.message)
      .join('\n');
    throw locatedError(
      errorMessage,
      info.fieldNodes,
      responsePathAsArray(info.path),
    );
  } else {
    let resultObject = result.data[fieldName];
    if (result.errors) {
      resultObject = annotateWithChildrenErrors(
        resultObject,
        result.errors as Array<{ path?: Array<string> }>,
      );
    }
    return resultObject;
  }
}
