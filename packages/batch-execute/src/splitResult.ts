// adapted from https://github.com/gatsbyjs/gatsby/blob/master/packages/gatsby-source-graphql/src/batching/merge-queries.js

import { GraphQLError } from 'graphql';

import { createGraphQLError, ExecutionResult, relocatedError } from '@graphql-tools/utils';

import { parseKey } from './prefix.js';

/**
 * Split and transform result of the query produced by the `merge` function
 */
export function splitResult({ data, errors }: ExecutionResult, numResults: number): Array<ExecutionResult> {
  const splitResults: Array<ExecutionResult> = [];
  for (let i = 0; i < numResults; i++) {
    splitResults.push({});
  }

  if (data) {
    for (const prefixedKey in data) {
      const { index, originalKey } = parseKey(prefixedKey);
      const result = splitResults[index];
      if (result == null) {
        continue;
      }
      if (result.data == null) {
        result.data = { [originalKey]: data[prefixedKey] };
      } else {
        result.data[originalKey] = data[prefixedKey];
      }
    }
  }

  if (errors) {
    for (const error of errors) {
      if (error.path) {
        const parsedKey = parseKey(error.path[0] as string);
        const { index, originalKey } = parsedKey;
        const newError = relocatedError(error, [originalKey, ...error.path.slice(1)]);
        const resultErrors = (splitResults[index].errors = (splitResults[index].errors || []) as GraphQLError[]);
        resultErrors.push(newError);
      } else {
        splitResults.forEach(result => {
          const resultErrors = (result.errors = (result.errors || []) as GraphQLError[]);
          resultErrors.push(createGraphQLError(error.message));
        });
      }
    }
  }

  return splitResults;
}
