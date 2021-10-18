/* eslint-disable no-case-declarations */
/// <reference lib="dom" />
import { print, IntrospectionOptions, GraphQLError, buildASTSchema, buildSchema, getOperationAST } from 'graphql';

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
} from '@graphql-tools/utils';
import { isWebUri } from 'valid-url';
import { introspectSchema, wrapSchema } from '@graphql-tools/wrap';
import { ClientOptions, createClient } from 'graphql-ws';
import { ClientOptions as GraphQLSSEClientOptions, createClient as createGraphQLSSEClient } from 'graphql-sse';
import WebSocket from 'isomorphic-ws';
import isPromise from 'is-promise';
import { extractFiles, isExtractableFile } from 'extract-files';
import FormData from 'form-data';
import { ConnectionParamsOptions, SubscriptionClient as LegacySubscriptionClient } from 'subscriptions-transport-ws';
import AbortController from 'abort-controller';
import _ from 'lodash';
import { ValueOrPromise } from 'value-or-promise';
import { isLiveQueryOperationDefinitionNode } from '@n1ru4l/graphql-live-query';
import { AsyncFetchFn, defaultAsyncFetch } from './defaultAsyncFetch';
import { defaultSyncFetch, SyncFetchFn } from './defaultSyncFetch';
import { handleMultipartMixedResponse } from './handleMultipartMixedResponse';
import { handleEventStreamResponse } from './event-stream/handleEventStreamResponse';
import { addCancelToResponseStream } from './addCancelToResponseStream';

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
   * Additional options to pass to the graphql-sse client.
   */
  graphqlSseOptions?: Omit<GraphQLSSEClientOptions, 'url' | 'headers' | 'fetchFn' | 'abortControllerImpl'>;
}

const isCompatibleUri = (uri: string): boolean => {
  if (isWebUri(uri)) {
    return true;
  }
  // we just replace the url part, the remaining validation is the same
  const wsUri = uri.replace('wss://', 'http://').replace('ws://', 'http://');
  return !!isWebUri(wsUri);
};

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
  async canLoad(pointer: string, options: LoadFromUrlOptions): Promise<boolean> {
    return this.canLoadSync(pointer, options);
  }

  canLoadSync(pointer: string, _options: LoadFromUrlOptions): boolean {
    return isCompatibleUri(pointer);
  }

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
      ((v: any) => isExtractableFile(v) || v?.promise || isAsyncIterable(v) || isPromise(v)) as any
    );
    const map = Array.from(files.values()).reduce((prev, curr, currIndex) => {
      prev[currIndex] = curr;
      return prev;
    }, {});
    const uploads: Map<number | string, any> = new Map(Array.from(files.keys()).map((u, i) => [i, u]));
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
    return ValueOrPromise.all(
      Array.from(uploads.entries()).map(params =>
        new ValueOrPromise(() => {
          const [i, u$] = params as any;
          return new ValueOrPromise(() => u$).then(u => [i, u]).resolve();
        }).then(([i, u]) => {
          if (u?.promise) {
            return u.promise.then((upload: any) => {
              const stream = upload.createReadStream();
              form.append(i.toString(), stream, {
                filename: upload.filename,
                contentType: upload.mimetype,
              } as any);
            });
          } else {
            form.append(
              i.toString(),
              u as any,
              {
                filename: 'name' in u ? u['name'] : i,
                contentType: u.type,
              } as any
            );
          }
        })
      )
    )
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
    endpoint: string,
    fetch: FetchFn,
    options?: LoadFromUrlOptions
  ): Executor<any, ExecutionExtensions> {
    const defaultMethod = this.getDefaultMethodFromOptions(options?.method, 'POST');
    const HTTP_URL = switchProtocols(endpoint, {
      wss: 'https',
      ws: 'http',
    });
    const executor = ({
      document,
      variables,
      operationName,
      extensions,
      operationType,
    }: ExecutionRequest<any, any, any, ExecutionExtensions>) => {
      const controller = new AbortController();
      let method = defaultMethod;
      if (options?.useGETForQueries) {
        if (operationType === 'query') {
          method = 'GET';
        } else {
          method = defaultMethod;
        }
      }

      const headers = Object.assign({}, options?.headers, extensions?.headers || {});

      return new ValueOrPromise(() => {
        const query = print(document);
        switch (method) {
          case 'GET':
            const finalUrl = this.prepareGETUrl({ baseUrl: endpoint, query, variables, operationName, extensions });
            return fetch(finalUrl, {
              method: 'GET',
              credentials: 'include',
              headers: {
                accept: 'application/json',
                ...headers,
              },
            });
          case 'POST':
            if (options?.multipart) {
              return new ValueOrPromise(() =>
                this.createFormDataFromVariables({ query, variables, operationName, extensions })
              )
                .then(
                  form =>
                    fetch(HTTP_URL, {
                      method: 'POST',
                      credentials: 'include',
                      body: form as any,
                      headers: {
                        accept: 'application/json',
                        ...headers,
                      },
                      signal: controller.signal,
                    }) as any
                )
                .resolve();
            } else {
              return fetch(HTTP_URL, {
                method: 'POST',
                credentials: 'include',
                body: JSON.stringify({
                  query,
                  variables,
                  operationName,
                  extensions,
                }),
                headers: {
                  accept: 'application/json, multipart/mixed, text/event-stream',
                  'content-type': 'application/json',
                  ...headers,
                },
                signal: controller.signal,
              });
            }
        }
      })
        .then((fetchResult: Response) => {
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

          return fetchResult.json();
        })
        .resolve();
    };

    return executor;
  }

  buildWSExecutor(
    subscriptionsEndpoint: string,
    webSocketImpl: typeof WebSocket,
    connectionParams?: ClientOptions['connectionParams']
  ): AsyncExecutor {
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
    return async ({ document, variables, operationName, extensions }) => {
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
    webSocketImpl: typeof WebSocket,
    connectionParams?: ConnectionParamsOptions
  ): AsyncExecutor {
    const WS_URL = switchProtocols(subscriptionsEndpoint, {
      https: 'wss',
      http: 'ws',
    });
    const subscriptionClient = new LegacySubscriptionClient(
      WS_URL,
      {
        connectionParams,
        lazy: true,
      },
      webSocketImpl
    );

    return async <TReturn, TArgs>({ document, variables, operationName }: ExecutionRequest<TArgs>) => {
      return observableToAsyncIterable(
        subscriptionClient.request({
          query: document,
          variables,
          operationName,
        })
      ) as AsyncIterableIterator<ExecutionResult<TReturn>>;
    };
  }

  buildGraphQLSSEExecutor(
    endpoint: string,
    fetch: AsyncFetchFn,
    options: Omit<LoadFromUrlOptions, 'subscriptionEndpoint'> = {}
  ): AsyncExecutor {
    const { headers } = options;
    const client = createGraphQLSSEClient({
      ...options.graphqlSseOptions,
      url: endpoint,
      fetchFn: fetch,
      abortControllerImpl: AbortController,
      headers,
    });
    return async ({ document, variables, operationName, extensions }) => {
      return observableToAsyncIterable({
        subscribe: observer => {
          const unsubscribe = client.subscribe(
            {
              query: document,
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

  async buildSubscriptionExecutor(
    subscriptionsEndpoint: string,
    fetch: AsyncFetchFn,
    options?: LoadFromUrlOptions
  ): Promise<AsyncExecutor> {
    if (options?.subscriptionsProtocol === SubscriptionProtocol.SSE) {
      return this.buildHTTPExecutor(subscriptionsEndpoint, fetch, {
        ...options,
        method: 'GET',
      });
    } else if (options?.subscriptionsProtocol === SubscriptionProtocol.GRAPHQL_SSE) {
      if (!options?.subscriptionsEndpoint) {
        // when no custom subscriptions endpoint is specified,
        // graphql-sse is recommended to be used on `/graphql/stream`
        subscriptionsEndpoint += '/stream';
      }
      return this.buildGraphQLSSEExecutor(subscriptionsEndpoint, fetch, options);
    } else {
      const webSocketImpl = await this.getWebSocketImpl(asyncImport, options);
      const connectionParams = () => ({ headers: options?.headers });
      if (options?.subscriptionsProtocol === SubscriptionProtocol.LEGACY_WS) {
        return this.buildWSLegacyExecutor(subscriptionsEndpoint, webSocketImpl, connectionParams);
      } else {
        return this.buildWSExecutor(subscriptionsEndpoint, webSocketImpl, connectionParams);
      }
    }
  }

  async getExecutorAsync(endpoint: string, options?: Omit<LoadFromUrlOptions, 'endpoint'>): Promise<AsyncExecutor> {
    const fetch = await this.getFetch(options?.customFetch, asyncImport);
    const httpExecutor = this.buildHTTPExecutor(endpoint, fetch, options);
    const subscriptionsEndpoint = options?.subscriptionsEndpoint || endpoint;
    const subscriptionExecutor = await this.buildSubscriptionExecutor(subscriptionsEndpoint, fetch, options);

    return params => {
      const operationAst = getOperationAST(params.document, params.operationName);
      if (!operationAst) {
        throw new Error(`No valid operations found: ${params.operationName || ''}`);
      }
      if (
        operationAst.operation === 'subscription' ||
        isLiveQueryOperationDefinitionNode(operationAst, params.variables as Record<string, any>)
      ) {
        return subscriptionExecutor(params);
      }
      return httpExecutor(params);
    };
  }

  getExecutorSync(endpoint: string, options: Omit<LoadFromUrlOptions, 'endpoint'>): SyncExecutor {
    const fetch = this.getFetch(options?.customFetch, syncImport);
    const executor = this.buildHTTPExecutor(endpoint, fetch, options);

    return executor;
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
    if (!(await this.canLoad(pointer, options))) {
      return [];
    }
    let source: Source = {
      location: pointer,
    };
    const fetch = await this.getFetch(options?.customFetch, asyncImport);
    let executor = await this.getExecutorAsync(pointer, options);
    if (options?.handleAsSDL || pointer.endsWith('.graphql')) {
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
      source.schema = await introspectSchema(executor, {}, options);
    }

    if (!source.schema) {
      throw new Error(`Invalid introspected schema`);
    }

    if (options?.endpoint) {
      executor = await this.getExecutorAsync(options.endpoint, options);
    }

    source.schema = wrapSchema({
      schema: source.schema,
      executor,
    });

    return [source];
  }

  loadSync(pointer: string, options: LoadFromUrlOptions): Source[] {
    if (!this.canLoadSync(pointer, options)) {
      return [];
    }

    let source: Source = {
      location: pointer,
    };
    const fetch = this.getFetch(options?.customFetch, syncImport);
    let executor = this.getExecutorSync(pointer, options);
    if (options?.handleAsSDL || pointer.endsWith('.graphql')) {
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
      source.schema = introspectSchema(executor, {}, options);
    }

    if (!source.schema) {
      throw new Error(`Invalid introspected schema`);
    }

    if (options?.endpoint) {
      executor = this.getExecutorSync(options.endpoint, options);
    }

    source.schema = wrapSchema({
      schema: source.schema,
      executor,
    });

    return [source];
  }
}

function switchProtocols(pointer: string, protocolMap: Record<string, string>): string {
  return Object.entries(protocolMap).reduce(
    (prev, [source, target]) => prev.replace(`${source}://`, `${target}://`).replace(`${source}:\\`, `${target}:\\`),
    pointer
  );
}
