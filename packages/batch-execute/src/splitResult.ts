// adapted from https://github.com/gatsbyjs/gatsby/blob/master/packages/gatsby-source-graphql/src/batching/merge-queries.js

import { ExecutionResult, GraphQLError } from 'graphql';

import { relocatedError } from '@graphql-tools/utils';

import { parseKey } from './prefix';

/**
 * Split and transform result of the query produced by the `merge` function
 */
export function splitResult(mergedResult: ExecutionResult, numResults: number): Array<ExecutionResult> {
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
