import { ExecutionRequest, Executor, ExecutionResult } from '@graphql-tools/utils';
import { Repeater } from '@repeaterjs/repeater';
import { print } from 'graphql';
import { createClient } from 'graphql-ws';
import WebSocket from 'isomorphic-ws';

export function buildGraphQLWSExecutor(
  url: string,
  webSocketImpl = WebSocket,
  connectionParams?: Record<string, any>
): Executor {
  const graphqlWSClient = createClient({
    url,
    webSocketImpl,
    connectionParams,
    lazy: true,
  });
  return function GraphQLWSExecutor<
    TData,
    TArgs extends Record<string, any>,
    TRoot,
    TExtensions extends Record<string, any>
  >({
    document,
    variables,
    operationName,
    extensions,
  }: ExecutionRequest<TArgs, any, TRoot, TExtensions>): Repeater<ExecutionResult<TData>> {
    const query = print(document);
    return new Repeater(function repeaterExecutor(push, stop) {
      const unsubscribe = graphqlWSClient.subscribe<TData, TExtensions>(
        {
          query,
          variables,
          operationName,
          extensions,
        },
        {
          next(data) {
            return push(data);
          },
          error(error) {
            return stop(error);
          },
          complete() {
            return stop();
          },
        }
      );
      return stop.finally(unsubscribe);
    });
  };
}
