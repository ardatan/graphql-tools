import { print } from 'graphql';
import { Client, ClientOptions, createClient } from 'graphql-ws';
import WebSocket from 'isomorphic-ws';
import {
  DisposableExecutor,
  ExecutionRequest,
  getOperationASTFromRequest,
  memoize1,
} from '@graphql-tools/utils';

const defaultPrintFn = memoize1(print);

interface GraphQLWSExecutorOptions extends ClientOptions {
  onClient?: (client: Client) => void;
  print?: typeof print;
}

function isClient(client: Client | GraphQLWSExecutorOptions): client is Client {
  return 'subscribe' in client;
}

export function buildGraphQLWSExecutor(
  clientOptionsOrClient: GraphQLWSExecutorOptions | Client,
): DisposableExecutor {
  let graphqlWSClient: Client;
  let executorConnectionParams = {};
  let printFn = defaultPrintFn;
  if (isClient(clientOptionsOrClient)) {
    graphqlWSClient = clientOptionsOrClient;
  } else {
    if (clientOptionsOrClient.print) {
      printFn = clientOptionsOrClient.print;
    }
    graphqlWSClient = createClient({
      ...clientOptionsOrClient,
      webSocketImpl: WebSocket,
      lazy: true,
      connectionParams: () => {
        const optionsConnectionParams =
          (typeof clientOptionsOrClient.connectionParams === 'function'
            ? clientOptionsOrClient.connectionParams()
            : clientOptionsOrClient.connectionParams) || {};
        return Object.assign(optionsConnectionParams, executorConnectionParams);
      },
    });
    if (clientOptionsOrClient.onClient) {
      clientOptionsOrClient.onClient(graphqlWSClient);
    }
  }
  const executor = function GraphQLWSExecutor<
    TData,
    TArgs extends Record<string, any>,
    TRoot,
    TExtensions extends Record<string, any>,
  >(executionRequest: ExecutionRequest<TArgs, any, TRoot, TExtensions>) {
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
    const query = printFn(document);
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
  const disposableExecutor: DisposableExecutor = executor;
  disposableExecutor[Symbol.asyncDispose] = function disposeWS() {
    return graphqlWSClient.dispose();
  };
  return disposableExecutor;
}
