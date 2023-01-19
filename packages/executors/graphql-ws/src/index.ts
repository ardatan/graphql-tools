import { ExecutionRequest, Executor, ExecutionResult, getOperationASTFromRequest } from '@graphql-tools/utils';
import { Repeater } from '@repeaterjs/repeater';
import { print } from 'graphql';
import { Client, ClientOptions, createClient } from 'graphql-ws';
import WebSocket from 'isomorphic-ws';

interface GraphQLWSExecutorOptions extends ClientOptions {
  onClient?: (client: Client) => void;
}

function isClient(client: Client | GraphQLWSExecutorOptions): client is Client {
  return 'subscribe' in client;
}

export function buildGraphQLWSExecutor(clientOptionsOrClient: GraphQLWSExecutorOptions | Client): Executor {
  let graphqlWSClient: Client;
  if (isClient(clientOptionsOrClient)) {
    graphqlWSClient = clientOptionsOrClient;
  } else {
    graphqlWSClient = createClient({
      webSocketImpl: WebSocket,
      lazy: true,
      ...clientOptionsOrClient,
    });
    if (clientOptionsOrClient.onClient) {
      clientOptionsOrClient.onClient(graphqlWSClient);
    }
  }
  return function GraphQLWSExecutor<
    TData,
    TArgs extends Record<string, any>,
    TRoot,
    TExtensions extends Record<string, any>
  >(
    executionRequest: ExecutionRequest<TArgs, any, TRoot, TExtensions>
  ): Repeater<ExecutionResult<TData>> | Promise<ExecutionResult<TData>> {
    const {
      document,
      variables,
      operationName,
      extensions,
      operationType = getOperationASTFromRequest(executionRequest).operation,
    } = executionRequest;
    const query = print(document);
    if (operationType === 'subscription') {
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
    }
    return new Promise((resolve, reject) => {
      const unsubscribe = graphqlWSClient.subscribe<TData, TExtensions>(
        {
          query,
          variables,
          operationName,
          extensions,
        },
        {
          next(data) {
            return resolve(data);
          },
          error(error) {
            return reject(error);
          },
          complete() {
            unsubscribe();
          },
        }
      );
    });
  };
}
