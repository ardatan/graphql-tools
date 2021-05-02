// adapted from https://github.com/gatsbyjs/gatsby/blob/master/packages/gatsby-source-graphql/src/batching/merge-queries.js

import { ExecutionResult, GraphQLError } from 'graphql';

import { AsyncExecutionResult, ExecutionPatchResult, isAsyncIterable, relocatedError } from '@graphql-tools/utils';

import { ValueOrPromise } from 'value-or-promise';

import { parseKey } from './prefix';
import { split } from './split';

export function splitResult(
  mergedResult:
    | ExecutionResult
    | AsyncIterableIterator<AsyncExecutionResult>
    | Promise<ExecutionResult | AsyncIterableIterator<AsyncExecutionResult>>,
  numResults: number
): Array<
  | ExecutionResult
  | AsyncIterableIterator<AsyncExecutionResult>
  | Promise<ExecutionResult | AsyncIterableIterator<AsyncExecutionResult>>
> {
  const result = new ValueOrPromise(() => mergedResult).then(r => splitExecutionResultOrAsyncIterableIterator(r, numResults));

  const splitResults: Array<
    | ExecutionResult
    | AsyncIterableIterator<AsyncExecutionResult>
    | Promise<ExecutionResult | AsyncIterableIterator<AsyncExecutionResult>>
  > = [];
  for (let i = 0; i < numResults; i++) {
    splitResults.push(result.then(r => r[i]).resolve() as ExecutionResult
    | AsyncIterableIterator<AsyncExecutionResult>
    | Promise<ExecutionResult | AsyncIterableIterator<AsyncExecutionResult>>);
  }

  return splitResults;
}

export function splitExecutionResultOrAsyncIterableIterator(
  mergedResult: ExecutionResult | AsyncIterableIterator<AsyncExecutionResult>,
  numResults: number
): Array<ExecutionResult | AsyncIterableIterator<AsyncExecutionResult>> {
  if (isAsyncIterable(mergedResult)) {
    return split(mergedResult, numResults, originalResult => {
      const path = (originalResult as ExecutionPatchResult).path;
      if (path && path.length) {
        const { index, originalKey } = parseKey(path[0] as string);
        const newPath = ([originalKey] as Array<string | number>).concat(path.slice(1));

        const newResult: ExecutionPatchResult = {
          ...(originalResult as ExecutionPatchResult),
          path: newPath,
        };

        const errors = originalResult.errors;
        if (errors) {
          const newErrors: Array<GraphQLError> = [];
          errors.forEach(error => {
            if (error.path) {
              const parsedKey = parseKey(error.path[0] as string);
              if (parsedKey) {
                const { originalKey } = parsedKey;
                const newError = relocatedError(error, [originalKey, ...error.path.slice(1)]);
                newErrors.push(newError);
                return;
              }
            }

            newErrors.push(error);
          });
          newResult.errors = newErrors;
        }

        return [index, newResult];
      }

      let resultIndex: number;
      const newResult: ExecutionResult = { ...originalResult };
      const data = originalResult.data;
      if (data) {
        const newData = {};
        Object.keys(data).forEach(prefixedKey => {
          const { index, originalKey } = parseKey(prefixedKey);
          resultIndex = index;
          newData[originalKey] = data[prefixedKey];
        });
        newResult.data = newData;
      }

      const errors = originalResult.errors;
      if (errors) {
        const newErrors: Array<GraphQLError> = [];
        errors.forEach(error => {
          if (error.path) {
            const parsedKey = parseKey(error.path[0] as string);
            if (parsedKey) {
              const { index, originalKey } = parsedKey;
              resultIndex = index;
              const newError = relocatedError(error, [originalKey, ...error.path.slice(1)]);
              newErrors.push(newError);
              return;
            }
          }

          newErrors.push(error);
        });
        newResult.errors = newErrors;
      }

      return [resultIndex, newResult]
    });
  }

  return splitExecutionResult(mergedResult, numResults);
}

/**
 * Split and transform result of the query produced by the `merge` function
 */
export function splitExecutionResult(mergedResult: ExecutionResult, numResults: number): Array<ExecutionResult> {
  const splitResults: Array<ExecutionResult> = [];
  for (let i = 0; i < numResults; i++) {
    splitResults.push({});
  }

  const data = mergedResult.data;
  if (data) {
    Object.keys(data).forEach(prefixedKey => {
      const { index, originalKey } = parseKey(prefixedKey);
      if (!splitResults[index].data) {
        splitResults[index].data = { [originalKey]: data[prefixedKey] };
      } else {
        splitResults[index].data[originalKey] = data[prefixedKey];
      }
    });
  }

  const errors = mergedResult.errors;
  if (errors) {
    const newErrors: Record<string, Array<GraphQLError>> = Object.create(null);
    errors.forEach(error => {
      if (error.path) {
        const parsedKey = parseKey(error.path[0] as string);
        if (parsedKey) {
          const { index, originalKey } = parsedKey;
          const newError = relocatedError(error, [originalKey, ...error.path.slice(1)]);
          if (!newErrors[index]) {
            newErrors[index] = [newError];
          } else {
            newErrors[index].push(newError);
          }
          return;
        }
      }

      splitResults.forEach((_splitResult, index) => {
        if (!newErrors[index]) {
          newErrors[index] = [error];
        } else {
          newErrors[index].push(error);
        }
      });
    });

    Object.keys(newErrors).forEach(index => {
      splitResults[index].errors = newErrors[index];
    });
  }

  return splitResults;
}
