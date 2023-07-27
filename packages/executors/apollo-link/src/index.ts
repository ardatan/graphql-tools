import * as apolloImport from '@apollo/client';
import { ExecutionRequest, Executor, isAsyncIterable } from '@graphql-tools/utils';

const apollo: typeof apolloImport = (apolloImport as any)?.default ?? apolloImport;

function createApolloRequestHandler(executor: Executor): apolloImport.RequestHandler {
  return function ApolloRequestHandler(
    operation: apolloImport.Operation,
  ): apolloImport.Observable<apolloImport.FetchResult> {
    return new apollo.Observable(observer => {
      Promise.resolve().then(async () => {
        const executionRequest: ExecutionRequest = {
          document: operation.query,
          variables: operation.variables,
          operationName: operation.operationName,
          extensions: operation.extensions,
          context: operation.getContext(),
        };
        try {
          const results = await executor(executionRequest);
          if (isAsyncIterable(results)) {
            for await (const result of results) {
              if (observer.closed) {
                return;
              }
              observer.next(result);
            }
            observer.complete();
          } else if (!observer.closed) {
            observer.next(results);
            observer.complete();
          }
        } catch (e) {
          if (!observer.closed) {
            observer.error(e);
          }
        }
      });
    });
  };
}

export class ExecutorLink extends apollo.ApolloLink {
  constructor(executor: Executor) {
    super(createApolloRequestHandler(executor));
  }
}
