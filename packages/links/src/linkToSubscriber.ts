import { ApolloLink, execute, FetchResult } from '@apollo/client/link/core';
import { Observable } from '@apollo/client/utilities';
import { observableToAsyncIterable } from '@graphql-tools/utils';
import { ExecutionResult } from 'graphql';

import { ExecutionParams } from './types';

export const linkToSubscriber = (link: ApolloLink) => async <TReturn, TArgs, TContext>(
  params: ExecutionParams<TArgs, TContext>
) => {
  const { document, variables, extensions, context, info } = params;
  return observableToAsyncIterable<ExecutionResult<TReturn> | AsyncIterator<ExecutionResult<TReturn>>>(
    execute(link, {
      query: document,
      variables,
      context: {
        graphqlContext: context,
        graphqlResolveInfo: info,
        clientAwareness: {},
      },
      extensions,
    }) as Observable<FetchResult<TReturn>>
  );
};
