import { print } from 'graphql';
import { Client, ClientOptions, createClient } from 'graphql-ws';
import WebSocket from 'isomorphic-ws';
import {
  ExecutionRequest,
  ExecutionResult,
  Executor,
  getOperationASTFromRequest,
} from '@graphql-tools/utils';

interface GraphQLWSExecutorOptions extends ClientOptions {
  onClient?: (client: Client) => void;
}

function isClient(client: Client | GraphQLWSExecutorOptions): client is Client {
  return 'subscribe' in client;
}

export function buildGraphQLWSExecutor(
  clientOptionsOrClient: GraphQLWSExecutorOptions | Client,
): Executor {
  let graphqlWSClient: Client;
  let executorConnectionParams = {};
  if (isClient(clientOptionsOrClient)) {
    graphqlWSClient = clientOptionsOrClient;
  } else {
    graphqlWSClient = createClient({
      webSocketImpl: WebSocket,
      lazy: true,
      connectionParams: () => {
        const optionsConnectionParams =
          (typeof clientOptionsOrClient.connectionParams === 'function'
            ? clientOptionsOrClient.connectionParams()
            : clientOptionsOrClient.connectionParams) || {};
        return Object.assign(optionsConnectionParams, executorConnectionParams);
      },
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
    TExtensions extends Record<string, any>,
  >(
    executionRequest: ExecutionRequest<TArgs, any, TRoot, TExtensions>,
  ): AsyncIterableIterator<ExecutionResult<TData>> | Promise<ExecutionResult<TData>> {
    const {
      document,
      variables,
      operationName,
      extensions,
      operationType = getOperationASTFromRequest(executionRequest).operation,
    } = executionRequest;
    // additional connection params can be supplied through the "connectionParams" field in extensions.
    // TODO: connection params only from the FIRST operation in lazy mode will be used (detect connectionParams changes and reconnect, too implicit?)
    if (extensions?.['connectionParams'] && typeof extensions?.['connectionParams'] === 'object') {
      executorConnectionParams = Object.assign(
        executorConnectionParams,
        extensions['connectionParams'],
      );
    }
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
