import { GraphQLError } from 'graphql';

import AggregateError from '@ardatan/aggregate-error';

import { relocatedError, unextendedError } from '@graphql-tools/utils';

export function handleNull(errors: ReadonlyArray<GraphQLError>) {
  if (errors.length) {
    const graphQLToolsMergedPath = errors[0].extensions.graphQLToolsMergedPath;
    const unannotatedErrors = errors.map(error => unextendedError(error, 'graphQLToolsMergedPath'));

    if (unannotatedErrors.length > 1) {
      const combinedError = new AggregateError(unannotatedErrors);
      return new GraphQLError(
        combinedError.message,
        undefined,
        undefined,
        undefined,
        graphQLToolsMergedPath,
        combinedError
      );
    }

    const error = unannotatedErrors[0];
    return relocatedError(error, graphQLToolsMergedPath);
  }

  return null;
}
