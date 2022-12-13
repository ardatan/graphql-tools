import { ApolloLink, FetchResult, Observable, Operation, RequestHandler } from '@apollo/client/core';
import { ExecutionRequest, Executor, isAsyncIterable } from '@graphql-tools/utils';

function createApolloRequestHandler(executor: Executor): RequestHandler {
  return function ApolloRequestHandler(operation: Operation): Observable<FetchResult> {
    return new Observable(observer => {
      const executionRequest: ExecutionRequest = {
        document: operation.query,
        variables: operation.variables,
        operationName: operation.operationName,
        extensions: operation.extensions,
        context: operation.getContext(),
      };
      Promise.resolve(executor(executionRequest))
        .then(async results => {
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
        })
        .catch(error => {
          if (!observer.closed) {
            observer.error(error);
          }
        });
    });
  };
}

export class ExecutorLink extends ApolloLink {
  constructor(executor: Executor) {
    super(createApolloRequestHandler(executor));
  }
}
