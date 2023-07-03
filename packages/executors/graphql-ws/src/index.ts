import { ExecutionRequest, Executor, ExecutionResult, getOperationASTFromRequest } from '@graphql-tools/utils';
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
  ): AsyncIterableIterator<ExecutionResult<TData>> | Promise<ExecutionResult<TData>> {
    const {
      document,
      variables,
      operationName,
      extensions,
      operationType = getOperationASTFromRequest(executionRequest).operation,
    } = executionRequest;
    const query = print(document);
    const iterableIterator = graphqlWSClient.iterate<TData, TExtensions>({
      query,
      variables,
      operationName,
      extensions,
    });
    if (operationType === 'subscription') {
      return iterableIterator;
    }
    return iterableIterator.next().then(({ value }) => value);
  };
}
