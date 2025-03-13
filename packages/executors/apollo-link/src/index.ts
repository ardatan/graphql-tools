import * as apolloImport from '@apollo/client';
import { ExecutionRequest, Executor, isAsyncIterable } from '@graphql-tools/utils';

const apollo: typeof apolloImport = (apolloImport as any)?.default ?? apolloImport;

function createApolloRequestHandler(executor: Executor): apolloImport.RequestHandler {
  return function ApolloRequestHandler(operation) {
    return new apollo.Observable(observer => {
      const executionRequest: ExecutionRequest = {
        document: operation.query,
        variables: operation.variables,
        operationName: operation.operationName,
        extensions: operation.extensions,
        context: operation.getContext(),
      };

      let disposed = false;
      let dispose = () => {
        disposed = true;
      };
      (async function execution() {
        const results = await executor(executionRequest);

        // request couldve been disposed before getting results
        if (disposed) return;

        if (isAsyncIterable(results)) {
          const asyncIterator = results[Symbol.asyncIterator]();
          dispose = () => {
            asyncIterator.return?.();
          };
          try {
            for await (const result of { [Symbol.asyncIterator]: () => asyncIterator }) {
              observer.next(result);
            }
          } catch (e) {
            observer.error(e);
          }
        } else {
          observer.next(results);
        }
      })()
        .then(() => observer.complete())
        .catch(e => observer.error(e));

      return () => dispose();
    });
  };
}

export class ExecutorLink extends apollo.ApolloLink {
  constructor(executor: Executor) {
    super(createApolloRequestHandler(executor));
  }
}
