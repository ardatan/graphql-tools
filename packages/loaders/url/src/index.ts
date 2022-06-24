/* eslint-disable no-case-declarations */
/// <reference lib="dom" />
import { print, IntrospectionOptions, GraphQLError, buildASTSchema, buildSchema } from 'graphql';

import {
  AsyncExecutor,
  Executor,
  SyncExecutor,
  Source,
  Loader,
  BaseLoaderOptions,
  observableToAsyncIterable,
  isAsyncIterable,
  ExecutionRequest,
  parseGraphQLSDL,
  getOperationASTFromRequest,
  Observer,
} from '@graphql-tools/utils';
import { introspectSchema, wrapSchema } from '@graphql-tools/wrap';
import { ClientOptions, createClient } from 'graphql-ws';
import WebSocket from 'isomorphic-ws';
import { extractFiles, isExtractableFile } from 'extract-files';
import { ValueOrPromise } from 'value-or-promise';
import { isLiveQueryOperationDefinitionNode } from '@n1ru4l/graphql-live-query';
import { AsyncFetchFn, defaultAsyncFetch } from './defaultAsyncFetch.js';
import { defaultSyncFetch, SyncFetchFn } from './defaultSyncFetch.js';
import { handleMultipartMixedResponse } from './handleMultipartMixedResponse.js';
import { handleEventStreamResponse } from './event-stream/handleEventStreamResponse.js';
import { addCancelToResponseStream } from './addCancelToResponseStream.js';
import { AbortController, FormData, File } from 'cross-undici-fetch';
import { isBlob, isGraphQLUpload, isPromiseLike, LEGACY_WS } from './utils.js';

export type FetchFn = AsyncFetchFn | SyncFetchFn;

export type AsyncImportFn = (moduleName: string) => PromiseLike<any>;
export type SyncImportFn = (moduleName: string) => any;

const asyncImport: AsyncImportFn = (moduleName: string) => import(moduleName);
const syncImport: SyncImportFn = (moduleName: string) => require(moduleName);

interface ExecutionResult<TData = { [key: string]: any }, TExtensions = { [key: string]: any }> {
  errors?: ReadonlyArray<GraphQLError>;
  data?: TData;
  extensions?: TExtensions;
}

type HeadersConfig = Record<string, string>;

interface ExecutionExtensions {
  headers?: HeadersConfig;
  endpoint?: string;
}

export enum SubscriptionProtocol {
  WS = 'WS',
  /**
   * Use legacy web socket protocol `graphql-ws` instead of the more current standard `graphql-transport-ws`
   */
  LEGACY_WS = 'LEGACY_WS',
  /**
   * Use SSE for subscription instead of WebSocket
   */
  SSE = 'SSE',
  /**
   * Use `graphql-sse` for subscriptions
   */
  GRAPHQL_SSE = 'GRAPHQL_SSE',
}

/**
 * Additional options for loading from a URL
 */
export interface LoadFromUrlOptions extends BaseLoaderOptions, Partial<IntrospectionOptions> {
  /**
   * Additional headers to include when querying the original schema
   */
  headers?: HeadersConfig;
  /**
   * A custom `fetch` implementation to use when querying the original schema.
   * Defaults to `cross-fetch`
   */
  customFetch?: FetchFn | string;
  /**
   * HTTP method to use when querying the original schema.
   */
  method?: 'GET' | 'POST';
  /**
   * Custom WebSocket implementation used by the loaded schema if subscriptions
   * are enabled
   */
  webSocketImpl?: typeof WebSocket | string;
  /**
   * Whether to use the GET HTTP method for queries when querying the original schema
   */
  useGETForQueries?: boolean;
  /**
   * Use multipart for POST requests
   */
  multipart?: boolean;
  /**
   * Handle URL as schema SDL
   */
  handleAsSDL?: boolean;
  /**
   * Regular HTTP endpoint; defaults to the pointer
   */
  endpoint?: string;
  /**
   * Subscriptions endpoint; defaults to the endpoint given as HTTP endpoint
   */
  subscriptionsEndpoint?: string;
  /**
   * Use specific protocol for subscriptions
   */
  subscriptionsProtocol?: SubscriptionProtocol;
  /**
   * @deprecated This is no longer used. Will be removed in the next release
   */
  graphqlSseOptions?: any;
  /**
   * Retry attempts
   */
  retry?: number;
  /**
   * Timeout in milliseconds
   */
  timeout?: number;
  /**
   * Request Credentials
   */
  credentials?: RequestCredentials;
  /**
   * Connection Parameters for WebSockets connection
   */
  connectionParams?: any;
  /**
   * Enable Batching
   */
  batch?: boolean;
}

function isCompatibleUri(uri: string): boolean {
  try {
    // eslint-disable-next-line no-new
    new URL(uri);
    return true;
  } catch {
    return false;
  }
}

/**
 * This loader loads a schema from a URL. The loaded schema is a fully-executable,
 * remote schema since it's created using [@graphql-tools/wrap](/docs/remote-schemas).
 *
 * ```
 * const schema = await loadSchema('http://localhost:3000/graphql', {
 *   loaders: [
 *     new UrlLoader(),
 *   ]
 * });
 * ```
 */
export class UrlLoader implements Loader<LoadFromUrlOptions> {
  createFormDataFromVariables<TVariables>({
    query,
    variables,
    operationName,
    extensions,
  }: {
    query: string;
    variables: TVariables;
    operationName?: string;
    extensions?: any;
  }) {
    const vars = Object.assign({}, variables);
    const { clone, files } = extractFiles(
      vars,
      'variables',
      ((v: any) =>
        isExtractableFile(v) ||
        v?.promise ||
        isAsyncIterable(v) ||
        v?.then ||
        typeof v?.arrayBuffer === 'function') as any
    );
    const map: Record<number, string[]> = {};
    const uploads: any[] = [];
    let currIndex = 0;
    for (const [file, curr] of files) {
      map[currIndex] = curr;
      uploads[currIndex] = file;
      currIndex++;
    }
    const form = new FormData();
    form.append(
      'operations',
      JSON.stringify({
        query,
        variables: clone,
        operationName,
        extensions,
      })
    );
    form.append('map', JSON.stringify(map));
    function handleUpload(upload: any, i: number): void | PromiseLike<void> {
      const indexStr = i.toString();
      if (upload != null) {
        const filename = upload.filename || upload.name || upload.path || `blob-${indexStr}`;
        if (isPromiseLike(upload)) {
          return upload.then((resolvedUpload: any) => handleUpload(resolvedUpload, i));
          // If Blob
        } else if (isBlob(upload)) {
          return upload.arrayBuffer().then((arrayBuffer: ArrayBuffer) => {
            form.append(indexStr, new File([arrayBuffer], filename, { type: upload.type }), filename);
          });
        } else if (isGraphQLUpload(upload)) {
          const stream = upload.createReadStream();
          const chunks: number[] = [];
          return Promise.resolve().then(async () => {
            for await (const chunk of stream) {
              if (chunk) {
                chunks.push(...chunk);
              }
            }
            const blobPart = new Uint8Array(chunks);
            form.append(indexStr, new File([blobPart], filename, { type: upload.mimetype }), filename);
          });
        } else {
          form.append(indexStr, new File([upload], filename), filename);
        }
      }
    }
    return ValueOrPromise.all(uploads.map((upload, i) => new ValueOrPromise(() => handleUpload(upload, i))))
      .then(() => form)
      .resolve();
  }

  prepareGETUrl({
    baseUrl,
    query,
    variables,
    operationName,
    extensions,
  }: {
    baseUrl: string;
    query: string;
    variables: any;
    operationName?: string;
    extensions?: any;
  }) {
    const HTTP_URL = switchProtocols(baseUrl, {
      wss: 'https',
      ws: 'http',
    });
    const dummyHostname = 'https://dummyhostname.com';
    const validUrl = HTTP_URL.startsWith('http')
      ? HTTP_URL
      : HTTP_URL.startsWith('/')
      ? `${dummyHostname}${HTTP_URL}`
      : `${dummyHostname}/${HTTP_URL}`;
    const urlObj = new URL(validUrl);
    urlObj.searchParams.set('query', query);
    if (variables && Object.keys(variables).length > 0) {
      urlObj.searchParams.set('variables', JSON.stringify(variables));
    }
    if (operationName) {
      urlObj.searchParams.set('operationName', operationName);
    }
    if (extensions) {
      urlObj.searchParams.set('extensions', JSON.stringify(extensions));
    }
    const finalUrl = urlObj.toString().replace(dummyHostname, '');
    return finalUrl;
  }

  buildHTTPExecutor(
    endpoint: string,
    fetch: SyncFetchFn,
    options?: LoadFromUrlOptions
  ): SyncExecutor<any, ExecutionExtensions>;

  buildHTTPExecutor(
    endpoint: string,
    fetch: AsyncFetchFn,
    options?: LoadFromUrlOptions
  ): AsyncExecutor<any, ExecutionExtensions>;

  buildHTTPExecutor(
    initialEndpoint: string,
    fetch: FetchFn,
    options?: LoadFromUrlOptions
  ): Executor<any, ExecutionExtensions> {
    const defaultMethod = this.getDefaultMethodFromOptions(options?.method, 'POST');
    const HTTP_URL = switchProtocols(initialEndpoint, {
      wss: 'https',
      ws: 'http',
    });
    const executor = (request: ExecutionRequest<any, any, any, ExecutionExtensions>) => {
      const controller = new AbortController();
      let method = defaultMethod;

      const operationAst = getOperationASTFromRequest(request);
      const operationType = operationAst.operation;

      if (options?.useGETForQueries && operationType === 'query') {
        method = 'GET';
      }

      let accept = 'application/json, multipart/mixed';
      if (operationType === 'subscription' || isLiveQueryOperationDefinitionNode(operationAst)) {
        method = 'GET';
        accept = 'text/event-stream';
      }

      const endpoint = request.extensions?.endpoint || HTTP_URL;
      const headers = Object.assign({}, options?.headers, request.extensions?.headers || {});

      const query = print(request.document);
      const requestBody = {
        query,
        variables: request.variables,
        operationName: request.operationName,
        extensions: request.extensions,
      };

      let timeoutId: any;
      if (options?.timeout) {
        timeoutId = setTimeout(() => {
          if (!controller.signal.aborted) {
            controller.abort();
          }
        }, options.timeout);
      }

      const credentials = options?.credentials || 'same-origin';

      return new ValueOrPromise(() => {
        switch (method) {
          case 'GET':
            const finalUrl = this.prepareGETUrl({
              baseUrl: endpoint,
              ...requestBody,
            });
            return fetch(finalUrl, {
              method: 'GET',
              credentials,
              headers: {
                accept,
                ...headers,
              },
              signal: controller.signal,
            });
          case 'POST':
            if (options?.multipart) {
              return new ValueOrPromise(() => this.createFormDataFromVariables(requestBody))
                .then(
                  form =>
                    fetch(endpoint, {
                      method: 'POST',
                      credentials,
                      body: form as any,
                      headers: {
                        accept,
                        ...headers,
                      },
                      signal: controller.signal,
                    }) as any
                )
                .resolve();
            } else {
              return fetch(endpoint, {
                method: 'POST',
                credentials,
                body: JSON.stringify(requestBody),
                headers: {
                  accept,
                  'content-type': 'application/json',
                  ...headers,
                },
                signal: controller.signal,
              });
            }
        }
      })
        .then((fetchResult: Response): any => {
          if (timeoutId != null) {
            clearTimeout(timeoutId);
          }

          // Retry should respect HTTP Errors
          if (options?.retry != null && !fetchResult.status.toString().startsWith('2')) {
            throw new Error(fetchResult.statusText || `HTTP Error: ${fetchResult.status}`);
          }

          const contentType = fetchResult.headers.get('content-type');

          if (contentType?.includes('text/event-stream')) {
            return handleEventStreamResponse(fetchResult).then(resultStream =>
              addCancelToResponseStream(resultStream, controller)
            );
          } else if (contentType?.includes('multipart/mixed')) {
            return handleMultipartMixedResponse(fetchResult).then(resultStream =>
              addCancelToResponseStream(resultStream, controller)
            );
          }

          return fetchResult.text();
        })
        .then(result => {
          if (typeof result === 'string') {
            if (result) {
              return JSON.parse(result);
            }
          } else {
            return result;
          }
        })
        .resolve();
    };

    if (options?.retry != null) {
      return function retryExecutor(request: ExecutionRequest) {
        let result: ExecutionResult<any> | undefined;
        let error: Error | undefined;
        let attempt = 0;
        function retryAttempt(): Promise<ExecutionResult<any>> | ExecutionResult<any> {
          attempt++;
          if (attempt > options!.retry!) {
            if (result != null) {
              return result;
            }
            if (error != null) {
              throw error;
            }
            throw new Error('No result');
          }
          return new ValueOrPromise(() => executor(request))
            .then(res => {
              result = res;
              if (result?.errors?.length) {
                return retryAttempt();
              }
              return result;
            })
            .catch((e: any) => {
              error = e;
              return retryAttempt();
            })
            .resolve();
        }
        return retryAttempt();
      };
    }

    return executor;
  }

  buildWSExecutor(
    subscriptionsEndpoint: string,
    webSocketImpl: typeof WebSocket,
    connectionParams?: ClientOptions['connectionParams']
  ): Executor {
    const WS_URL = switchProtocols(subscriptionsEndpoint, {
      https: 'wss',
      http: 'ws',
    });
    const subscriptionClient = createClient({
      url: WS_URL,
      webSocketImpl,
      connectionParams,
      lazy: true,
    });
    return ({ document, variables, operationName, extensions }) => {
      const query = print(document);
      return observableToAsyncIterable({
        subscribe: observer => {
          const unsubscribe = subscriptionClient.subscribe(
            {
              query,
              variables: variables as Record<string, any>,
              operationName,
              extensions,
            },
            observer
          );
          return {
            unsubscribe,
          };
        },
      });
    };
  }

  buildWSLegacyExecutor(
    subscriptionsEndpoint: string,
    WebSocketImpl: typeof WebSocket,
    options?: LoadFromUrlOptions
  ): Executor {
    const WS_URL = switchProtocols(subscriptionsEndpoint, {
      https: 'wss',
      http: 'ws',
    });

    const observerById = new Map<string, Observer<ExecutionResult<any>>>();

    let websocket: WebSocket | null = null;

    const ensureWebsocket = () => {
      websocket = new WebSocketImpl(WS_URL, 'graphql-ws', {
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

  getFetch(
    customFetch: LoadFromUrlOptions['customFetch'],
    importFn: AsyncImportFn
  ): PromiseLike<AsyncFetchFn> | AsyncFetchFn;

  getFetch(customFetch: LoadFromUrlOptions['customFetch'], importFn: SyncImportFn): SyncFetchFn;

  getFetch(
    customFetch: LoadFromUrlOptions['customFetch'],
    importFn: SyncImportFn | AsyncImportFn
  ): FetchFn | PromiseLike<AsyncFetchFn> {
    if (customFetch) {
      if (typeof customFetch === 'string') {
        const [moduleName, fetchFnName] = customFetch.split('#');
        return new ValueOrPromise(() => importFn(moduleName))
          .then(module => (fetchFnName ? (module as Record<string, any>)[fetchFnName] : module))
          .resolve();
      } else if (typeof customFetch === 'function') {
        return customFetch;
      }
    }
    if (importFn === asyncImport) {
      return defaultAsyncFetch;
    } else {
      return defaultSyncFetch;
    }
  }

  private getDefaultMethodFromOptions(method: LoadFromUrlOptions['method'], defaultMethod: 'GET' | 'POST') {
    if (method) {
      defaultMethod = method;
    }
    return defaultMethod;
  }

  getWebSocketImpl(importFn: AsyncImportFn, options?: LoadFromUrlOptions): PromiseLike<typeof WebSocket>;

  getWebSocketImpl(importFn: SyncImportFn, options?: LoadFromUrlOptions): typeof WebSocket;

  getWebSocketImpl(
    importFn: SyncImportFn | AsyncImportFn,
    options?: LoadFromUrlOptions
  ): typeof WebSocket | PromiseLike<typeof WebSocket> {
    if (typeof options?.webSocketImpl === 'string') {
      const [moduleName, webSocketImplName] = options.webSocketImpl.split('#');
      return new ValueOrPromise(() => importFn(moduleName))
        .then(importedModule => (webSocketImplName ? importedModule[webSocketImplName] : importedModule))
        .resolve();
    } else {
      const websocketImpl = options?.webSocketImpl || WebSocket;
      return websocketImpl;
    }
  }

  buildSubscriptionExecutor(
    subscriptionsEndpoint: string,
    fetch: SyncFetchFn,
    syncImport: SyncImportFn,
    options?: LoadFromUrlOptions
  ): SyncExecutor;

  buildSubscriptionExecutor(
    subscriptionsEndpoint: string,
    fetch: AsyncFetchFn,
    asyncImport: AsyncImportFn,
    options?: LoadFromUrlOptions
  ): AsyncExecutor;

  buildSubscriptionExecutor(
    subscriptionsEndpoint: string,
    fetch: FetchFn,
    importFn: AsyncImportFn | SyncImportFn,
    options?: LoadFromUrlOptions
  ): Executor {
    if (options?.subscriptionsProtocol === SubscriptionProtocol.SSE) {
      return this.buildHTTPExecutor(subscriptionsEndpoint, fetch as any, options);
    } else if (options?.subscriptionsProtocol === SubscriptionProtocol.GRAPHQL_SSE) {
      if (!options?.subscriptionsEndpoint) {
        // when no custom subscriptions endpoint is specified,
        // graphql-sse is recommended to be used on `/graphql/stream`
        subscriptionsEndpoint += '/stream';
      }
      return this.buildHTTPExecutor(subscriptionsEndpoint, fetch as any, options);
    } else {
      const webSocketImpl$ = new ValueOrPromise(() => this.getWebSocketImpl(importFn, options));
      const executor$ = webSocketImpl$.then(webSocketImpl => {
        if (options?.subscriptionsProtocol === SubscriptionProtocol.LEGACY_WS) {
          return this.buildWSLegacyExecutor(subscriptionsEndpoint, webSocketImpl, options);
        } else {
          return this.buildWSExecutor(subscriptionsEndpoint, webSocketImpl, options?.connectionParams);
        }
      });
      return request => executor$.then(executor => executor(request)).resolve();
    }
  }

  getExecutor(
    endpoint: string,
    asyncImport: AsyncImportFn,
    options?: Omit<LoadFromUrlOptions, 'endpoint'>
  ): AsyncExecutor;

  getExecutor(endpoint: string, syncImport: SyncImportFn, options?: Omit<LoadFromUrlOptions, 'endpoint'>): SyncExecutor;
  getExecutor(
    endpoint: string,
    importFn: AsyncImportFn | SyncImportFn,
    options?: Omit<LoadFromUrlOptions, 'endpoint'>
  ): Executor {
    const fetch$ = new ValueOrPromise(() => this.getFetch(options?.customFetch, importFn));

    const httpExecutor$ = fetch$.then(fetch => {
      return this.buildHTTPExecutor(endpoint, fetch, options);
    });

    if (options?.subscriptionsEndpoint != null || options?.subscriptionsProtocol !== SubscriptionProtocol.SSE) {
      const subscriptionExecutor$ = fetch$.then(fetch => {
        const subscriptionsEndpoint = options?.subscriptionsEndpoint || endpoint;
        return this.buildSubscriptionExecutor(subscriptionsEndpoint, fetch, importFn, options);
      });

      // eslint-disable-next-line no-inner-declarations
      function getExecutorByRequest(request: ExecutionRequest<any>): ValueOrPromise<Executor> {
        const operationAst = getOperationASTFromRequest(request);
        if (
          operationAst.operation === 'subscription' ||
          isLiveQueryOperationDefinitionNode(operationAst, request.variables as Record<string, any>)
        ) {
          return subscriptionExecutor$;
        } else {
          return httpExecutor$;
        }
      }

      return request =>
        getExecutorByRequest(request)
          .then(executor => executor(request))
          .resolve();
    } else {
      return request => httpExecutor$.then(executor => executor(request)).resolve();
    }
  }

  getExecutorAsync(endpoint: string, options?: Omit<LoadFromUrlOptions, 'endpoint'>): AsyncExecutor {
    return this.getExecutor(endpoint, asyncImport, options);
  }

  getExecutorSync(endpoint: string, options?: Omit<LoadFromUrlOptions, 'endpoint'>): SyncExecutor {
    return this.getExecutor(endpoint, syncImport, options);
  }

  handleSDL(pointer: string, fetch: SyncFetchFn, options: LoadFromUrlOptions): Source;
  handleSDL(pointer: string, fetch: AsyncFetchFn, options: LoadFromUrlOptions): Promise<Source>;
  handleSDL(pointer: string, fetch: FetchFn, options: LoadFromUrlOptions): Source | Promise<Source> {
    const defaultMethod = this.getDefaultMethodFromOptions(options?.method, 'GET');
    return new ValueOrPromise<any>(() =>
      fetch(pointer, {
        method: defaultMethod,
        headers: options.headers,
      })
    )
      .then(response => response.text())
      .then(schemaString => parseGraphQLSDL(pointer, schemaString, options))
      .resolve();
  }

  async load(pointer: string, options: LoadFromUrlOptions): Promise<Source[]> {
    if (!isCompatibleUri(pointer)) {
      return [];
    }
    let source: Source = {
      location: pointer,
    };
    let executor: AsyncExecutor | undefined;
    if (options?.handleAsSDL || pointer.endsWith('.graphql') || pointer.endsWith('.graphqls')) {
      const fetch = await this.getFetch(options?.customFetch, asyncImport);
      source = await this.handleSDL(pointer, fetch, options);
      if (!source.schema && !source.document && !source.rawSDL) {
        throw new Error(`Invalid SDL response`);
      }
      source.schema =
        source.schema ||
        (source.document
          ? buildASTSchema(source.document, options)
          : source.rawSDL
          ? buildSchema(source.rawSDL, options)
          : undefined);
    } else {
      executor = this.getExecutorAsync(pointer, options);
      source.schema = await introspectSchema(executor, {}, options);
    }

    if (!source.schema) {
      throw new Error(`Invalid introspected schema`);
    }

    if (options?.endpoint) {
      executor = this.getExecutorAsync(options.endpoint, options);
    }

    if (executor) {
      source.schema = wrapSchema({
        schema: source.schema,
        executor,
        batch: options?.batch,
      });
    }

    return [source];
  }

  loadSync(pointer: string, options: LoadFromUrlOptions): Source[] {
    if (!isCompatibleUri(pointer)) {
      return [];
    }

    let source: Source = {
      location: pointer,
    };
    let executor: SyncExecutor | undefined;
    if (options?.handleAsSDL || pointer.endsWith('.graphql') || pointer.endsWith('.graphqls')) {
      const fetch = this.getFetch(options?.customFetch, syncImport);
      source = this.handleSDL(pointer, fetch, options);
      if (!source.schema && !source.document && !source.rawSDL) {
        throw new Error(`Invalid SDL response`);
      }
      source.schema =
        source.schema ||
        (source.document
          ? buildASTSchema(source.document, options)
          : source.rawSDL
          ? buildSchema(source.rawSDL, options)
          : undefined);
    } else {
      executor = this.getExecutorSync(pointer, options);
      source.schema = introspectSchema(executor, {}, options);
    }

    if (!source.schema) {
      throw new Error(`Invalid introspected schema`);
    }

    if (options?.endpoint) {
      executor = this.getExecutorSync(options.endpoint, options);
    }

    if (executor) {
      source.schema = wrapSchema({
        schema: source.schema,
        executor,
      });
    }

    return [source];
  }
}

function switchProtocols(pointer: string, protocolMap: Record<string, string>): string {
  return Object.entries(protocolMap).reduce(
    (prev, [source, target]) => prev.replace(`${source}://`, `${target}://`).replace(`${source}:\\`, `${target}:\\`),
    pointer
  );
}
