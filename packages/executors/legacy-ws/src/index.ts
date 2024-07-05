import { print } from 'graphql';
import WebSocket from 'isomorphic-ws';
import {
  DisposableExecutor,
  ExecutionRequest,
  observableToAsyncIterable,
} from '@graphql-tools/utils';

export enum LEGACY_WS {
  CONNECTION_INIT = 'connection_init',
  CONNECTION_ACK = 'connection_ack',
  CONNECTION_ERROR = 'connection_error',
  CONNECTION_KEEP_ALIVE = 'ka',
  START = 'start',
  STOP = 'stop',
  CONNECTION_TERMINATE = 'connection_terminate',
  DATA = 'data',
  ERROR = 'error',
  COMPLETE = 'complete',
}

export interface LegacyWSExecutorOpts {
  connectionParams?: Record<string, unknown> | (() => Record<string, unknown>);
  headers?: Record<string, any>;
}

export function buildWSLegacyExecutor(
  subscriptionsEndpoint: string,
  WebSocketImpl: typeof WebSocket,
  options?: LegacyWSExecutorOpts,
): DisposableExecutor {
  let executorConnectionParams = {};
  let websocket: WebSocket | null = null;

  const ensureWebsocket = (errorHandler: (error: Error) => void = err => console.error(err)) => {
    if (websocket == null || websocket.readyState !== WebSocket.OPEN) {
      websocket = new WebSocketImpl(subscriptionsEndpoint, 'graphql-ws', {
        followRedirects: true,
        headers: options?.headers,
        rejectUnauthorized: false,
        skipUTF8Validation: true,
      });

      websocket.onopen = () => {
        let payload: any = {};
        switch (typeof options?.connectionParams) {
          case 'function':
            payload = options?.connectionParams();
            break;
          case 'object':
            payload = options?.connectionParams;
            break;
        }
        payload = Object.assign(payload, executorConnectionParams);
        websocket!.send(
          JSON.stringify({
            type: LEGACY_WS.CONNECTION_INIT,
            payload,
          }),
          (error: any) => {
            if (error) {
              errorHandler(error);
            }
          },
        );
      };

      websocket.onerror = event => {
        errorHandler(event.error);
      };

      websocket.onclose = () => {
        websocket = null;
      };
    }
  };

  const cleanupWebsocket = () => {
    if (websocket != null) {
      websocket.send(
        JSON.stringify({
          type: LEGACY_WS.CONNECTION_TERMINATE,
        }),
      );
      websocket.terminate();
      websocket = null;
    }
  };

  const executor: DisposableExecutor = function legacyExecutor(request: ExecutionRequest) {
    // additional connection params can be supplied through the "connectionParams" field in extensions.
    // TODO: connection params only from the FIRST operation in lazy mode will be used (detect connectionParams changes and reconnect, too implicit?)
    if (
      request.extensions?.['connectionParams'] &&
      typeof request.extensions?.['connectionParams'] === 'object'
    ) {
      executorConnectionParams = Object.assign(
        executorConnectionParams,
        request.extensions['connectionParams'],
      );
    }

    const id = Date.now().toString();
    return observableToAsyncIterable({
      subscribe(observer) {
        function errorHandler(err: Error) {
          observer.error(err);
        }
        ensureWebsocket();
        if (websocket == null) {
          throw new Error(`WebSocket connection is not found!`);
        }
        websocket.onmessage = event => {
          const data = JSON.parse(event.data.toString('utf-8'));
          switch (data.type) {
            case LEGACY_WS.CONNECTION_ACK: {
              if (websocket == null) {
                throw new Error(`WebSocket connection is not found!`);
              }
              websocket.send(
                JSON.stringify({
                  type: LEGACY_WS.START,
                  id,
                  payload: {
                    query: print(request.document),
                    variables: request.variables,
                    operationName: request.operationName,
                  },
                }),
                (error: any) => {
                  if (error) {
                    errorHandler(error);
                  }
                },
              );
              break;
            }
            case LEGACY_WS.CONNECTION_ERROR: {
              observer.error(data.payload);
              break;
            }
            case LEGACY_WS.CONNECTION_KEEP_ALIVE: {
              break;
            }
            case LEGACY_WS.DATA: {
              observer.next(data.payload);
              break;
            }
            case LEGACY_WS.COMPLETE: {
              if (websocket != null) {
                websocket.send(
                  JSON.stringify({
                    type: LEGACY_WS.CONNECTION_TERMINATE,
                  }),
                  (error: any) => {
                    if (error) {
                      errorHandler(error);
                    }
                  },
                );
              }
              observer.complete();
              cleanupWebsocket();
              break;
            }
          }
        };

        return {
          unsubscribe: () => {
            if (websocket?.readyState === WebSocket.OPEN) {
              websocket?.send(
                JSON.stringify({
                  type: LEGACY_WS.STOP,
                  id,
                }),
              );
            }
            cleanupWebsocket();
          },
        };
      },
    });
  };

  executor[Symbol.dispose] = cleanupWebsocket;

  return executor;
}
