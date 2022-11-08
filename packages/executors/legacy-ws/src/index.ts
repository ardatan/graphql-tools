import { ExecutionRequest, ExecutionResult, Executor, observableToAsyncIterable, Observer } from '@graphql-tools/utils';
import { print } from 'graphql';
import WebSocket from 'isomorphic-ws';

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
  connectionParams?: Record<string, any>;
  headers?: Record<string, any>;
}

export function buildWSLegacyExecutor(
  subscriptionsEndpoint: string,
  WebSocketImpl: typeof WebSocket,
  options?: LegacyWSExecutorOpts
): Executor {
  const observerById = new Map<string, Observer<ExecutionResult<any>>>();

  let websocket: WebSocket | null = null;

  const ensureWebsocket = () => {
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
      websocket!.send(
        JSON.stringify({
          type: LEGACY_WS.CONNECTION_INIT,
          payload,
        })
      );
    };
  };

  const cleanupWebsocket = () => {
    if (websocket != null && observerById.size === 0) {
      websocket.send(
        JSON.stringify({
          type: LEGACY_WS.CONNECTION_TERMINATE,
        })
      );
      websocket.terminate();
      websocket = null;
    }
  };

  return function legacyExecutor(request: ExecutionRequest) {
    const id = Date.now().toString();
    return observableToAsyncIterable({
      subscribe(observer) {
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
                })
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
              if (websocket == null) {
                throw new Error(`WebSocket connection is not found!`);
              }
              websocket.send(
                JSON.stringify({
                  type: LEGACY_WS.CONNECTION_TERMINATE,
                })
              );
              observer.complete();
              cleanupWebsocket();
              break;
            }
          }
        };

        return {
          unsubscribe: () => {
            websocket?.send(
              JSON.stringify({
                type: LEGACY_WS.STOP,
                id,
              })
            );
            cleanupWebsocket();
          },
        };
      },
    });
  };
}
