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
  /**
   * Whether to reject unauthorized TLS certificates when connecting over `wss://`.
   * Defaults to `true`. Set to `false` only for trusted environments that use
   * self-signed certificates (for example local development).
   */
  rejectUnauthorized?: boolean;
}

function isConnectionParamsRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

export function buildWSLegacyExecutor(
  subscriptionsEndpoint: string,
  WebSocketImpl: typeof WebSocket,
  options?: LegacyWSExecutorOpts,
): DisposableExecutor {
  const disposers = new Set<() => void>();
  let operationSeq = 0;

  function baseConnectionParams(): Record<string, unknown> {
    const connectionParams = options?.connectionParams;
    if (typeof connectionParams === 'function') {
      const resolved = connectionParams();
      return isConnectionParamsRecord(resolved) ? { ...resolved } : {};
    }
    if (isConnectionParamsRecord(connectionParams)) {
      return { ...connectionParams };
    }
    return {};
  }

  function requestConnectionParams(request: ExecutionRequest): Record<string, unknown> {
    const fromExtensions = request.extensions?.['connectionParams'];
    return isConnectionParamsRecord(fromExtensions) ? { ...fromExtensions } : {};
  }

  const executor: DisposableExecutor = function legacyExecutor(request: ExecutionRequest) {
    // Bound to this execution only. A later request must not inherit keys it omits.
    const connectionParams = {
      ...baseConnectionParams(),
      ...requestConnectionParams(request),
    };
    operationSeq += 1;
    const id = `${operationSeq.toString(36)}-${Math.random().toString(36).slice(2)}`;

    return observableToAsyncIterable({
      subscribe(observer) {
        let closed = false;
        const websocket = new WebSocketImpl(subscriptionsEndpoint, 'graphql-ws', {
          followRedirects: true,
          headers: options?.headers,
          rejectUnauthorized: options?.rejectUnauthorized ?? true,
          skipUTF8Validation: true,
        });

        function closeSocket(sendStop: boolean) {
          if (closed) {
            return;
          }
          closed = true;
          disposers.delete(disposeSocket);
          if (websocket.readyState === WebSocket.OPEN) {
            if (sendStop) {
              websocket.send(
                JSON.stringify({
                  type: LEGACY_WS.STOP,
                  id,
                }),
              );
            }
            websocket.send(
              JSON.stringify({
                type: LEGACY_WS.CONNECTION_TERMINATE,
              }),
            );
          }
          websocket.terminate();
        }

        function endWithError(err: unknown) {
          if (closed) {
            return;
          }
          closeSocket(false);
          observer.error(err as Error);
          observer.complete();
        }

        function disposeSocket() {
          if (closed) {
            return;
          }
          closeSocket(false);
          observer.complete();
        }

        disposers.add(disposeSocket);

        websocket.onopen = () => {
          if (closed) {
            return;
          }
          websocket.send(
            JSON.stringify({
              type: LEGACY_WS.CONNECTION_INIT,
              payload: connectionParams,
            }),
            (error: any) => {
              if (error) {
                endWithError(error);
              }
            },
          );
        };

        websocket.onerror = event => {
          endWithError(event.error);
        };

        websocket.onclose = () => {
          if (closed) {
            return;
          }
          closed = true;
          disposers.delete(disposeSocket);
          observer.complete();
        };

        websocket.onmessage = event => {
          if (closed) {
            return;
          }
          let data: any;
          try {
            data = JSON.parse(event.data.toString('utf-8'));
          } catch (error) {
            endWithError(error);
            return;
          }
          switch (data.type) {
            case LEGACY_WS.CONNECTION_ACK: {
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
                    endWithError(error);
                  }
                },
              );
              break;
            }
            case LEGACY_WS.CONNECTION_ERROR: {
              endWithError(data.payload);
              break;
            }
            case LEGACY_WS.CONNECTION_KEEP_ALIVE: {
              break;
            }
            case LEGACY_WS.DATA: {
              if (data.id !== id) {
                break;
              }
              observer.next(data.payload);
              break;
            }
            case LEGACY_WS.ERROR: {
              if (data.id !== id) {
                break;
              }
              endWithError(data.payload);
              break;
            }
            case LEGACY_WS.COMPLETE: {
              if (data.id !== id) {
                break;
              }
              closeSocket(false);
              observer.complete();
              break;
            }
          }
        };

        return {
          unsubscribe: () => {
            closeSocket(true);
          },
        };
      },
    });
  };

  executor[Symbol.dispose] = () => {
    for (const disposeSocket of [...disposers]) {
      disposeSocket();
    }
  };

  return executor;
}
