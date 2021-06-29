/* eslint-disable no-case-declarations */
/// <reference lib="dom" />
import { print, IntrospectionOptions, Kind, GraphQLError } from 'graphql';

import {
  AsyncExecutor,
  Executor,
  SyncExecutor,
  SchemaPointerSingle,
  Source,
  DocumentLoader,
  SingleFileOptions,
  observableToAsyncIterable,
  isAsyncIterable,
  ExecutionParams,
  mapAsyncIterator,
  withCancel,
  parseGraphQLSDL,
  Maybe,
} from '@graphql-tools/utils';
import { isWebUri } from 'valid-url';
import { fetch as crossFetch } from 'cross-fetch';
import { SubschemaConfig } from '@graphql-tools/delegate';
import { introspectSchema, wrapSchema } from '@graphql-tools/wrap';
import { ClientOptions, createClient } from 'graphql-ws';
import WebSocket from 'isomorphic-ws';
import syncFetch from 'sync-fetch';
import isPromise from 'is-promise';
import { extractFiles, isExtractableFile } from 'extract-files';
import FormData from 'form-data';
import { fetchEventSource, FetchEventSourceInit } from '@microsoft/fetch-event-source';
import { ConnectionParamsOptions, SubscriptionClient as LegacySubscriptionClient } from 'subscriptions-transport-ws';
import AbortController from 'abort-controller';
import { meros } from 'meros';
import _ from 'lodash';

export type AsyncFetchFn = typeof import('cross-fetch').fetch;
export type SyncFetchFn = (input: RequestInfo, init?: RequestInit) => SyncResponse;
export type SyncResponse = Omit<Response, 'json' | 'text'> & {
  json: () => any;
  text: () => string;
};
export type FetchFn = AsyncFetchFn | SyncFetchFn;

type BuildExecutorOptions<TFetchFn = FetchFn> = {
  pointer: string;
  fetch: TFetchFn;
  extraHeaders?: HeadersConfig;
  defaultMethod: 'GET' | 'POST';
  useGETForQueries?: Maybe<boolean>;
  multipart?: Maybe<boolean>;
};

// TODO: Should the types here be changed to T extends Record<string, any> ?
export type AsyncImportFn<T = unknown> = (moduleName: string) => PromiseLike<T>;
// TODO: Should the types here be changed to T extends Record<string, any> ?
export type SyncImportFn<T = unknown> = (moduleName: string) => T;

const asyncImport: AsyncImportFn = (moduleName: string) => import(moduleName);
const syncImport: SyncImportFn = (moduleName: string) => require(moduleName);

interface ExecutionResult<TData = { [key: string]: any }, TExtensions = { [key: string]: any }> {
  errors?: ReadonlyArray<GraphQLError>;
  data?: TData;
  extensions?: TExtensions;
}

interface ExecutionPatchResult<TData = { [key: string]: any }, TExtensions = { [key: string]: any }> {
  errors?: ReadonlyArray<GraphQLError>;
  data?: TData;
  path?: ReadonlyArray<string | number>;
  label?: string;
  hasNext: boolean;
  extensions?: TExtensions;
}

type HeadersConfig = Record<string, string>;

interface ExecutionExtensions {
  headers?: HeadersConfig;
}

/**
 * Additional options for loading from a URL
 */
export interface LoadFromUrlOptions extends SingleFileOptions, Partial<IntrospectionOptions> {
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
   * Use SSE for subscription instead of WebSocket
   */
  useSSEForSubscription?: boolean;
  /**
   * Use legacy web socket protocol `graphql-ws` instead of the more current standard `graphql-transport-ws`
   */
  useWebSocketLegacyProtocol?: boolean;
  /**
   * Additional options to pass to the constructor of the underlying EventSource instance.
   */
  eventSourceOptions?: FetchEventSourceInit;
  /**
   * Handle URL as schema SDL
   */
  handleAsSDL?: boolean;
  /**
   * Subscriptions endpoint; defaults to the endpoint given as pointer
   */
  subscriptionsEndpoint?: string;
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
export class UrlLoader implements DocumentLoader<LoadFromUrlOptions> {
  loaderId(): string {
    return 'url';
  }

  async canLoad(pointer: SchemaPointerSingle, options: LoadFromUrlOptions): Promise<boolean> {
    return this.canLoadSync(pointer, options);
  }

  canLoadSync(pointer: SchemaPointerSingle, _options: LoadFromUrlOptions): boolean {
    return !!isWebUri(pointer);
  }

  async createFormDataFromVariables<TVariables>({
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
    const uploads: any = new Map(Array.from(files.keys()).map((u, i) => [i, u]));
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
    await Promise.all(
      Array.from(uploads.entries()).map(async (params: unknown) => {
        let [i, u] = params as any;
        if (isPromise(u)) {
          u = await u;
        }
        if (u?.promise) {
          const upload = await u.promise;
          const stream = upload.createReadStream();
          form.append(i.toString(), stream, {
            filename: upload.filename,
            contentType: upload.mimetype,
          } as any);
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
    );
    return form;
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

  buildExecutor(options: BuildExecutorOptions<SyncFetchFn>): SyncExecutor<any, ExecutionExtensions>;
  buildExecutor(options: BuildExecutorOptions<AsyncFetchFn>): AsyncExecutor<any, ExecutionExtensions>;
  buildExecutor({
    pointer,
    fetch,
    extraHeaders,
    defaultMethod,
    useGETForQueries,
    multipart,
  }: BuildExecutorOptions): Executor<any, ExecutionExtensions> {
    const HTTP_URL = switchProtocols(pointer, {
      wss: 'https',
      ws: 'http',
    });
    const executor = ({
      document,
      variables,
      operationName,
      extensions,
    }: ExecutionParams<any, any, any, ExecutionExtensions>) => {
      const controller = new AbortController();
      let method = defaultMethod;
      if (useGETForQueries) {
        method = 'GET';
        for (const definition of document.definitions) {
          if (definition.kind === Kind.OPERATION_DEFINITION) {
            if (definition.operation !== 'query') {
              method = defaultMethod;
            }
          }
        }
      }

      const headers = Object.assign({}, extraHeaders, extensions?.headers || {});

      let fetchResult: SyncResponse | Promise<Response>;
      const query = print(document);
      switch (method) {
        case 'GET':
          const finalUrl = this.prepareGETUrl({ baseUrl: pointer, query, variables, operationName, extensions });
          fetchResult = fetch(finalUrl, {
            method: 'GET',
            credentials: 'include',
            headers: {
              accept: 'application/json',
              ...headers,
            },
          });
          break;
        case 'POST':
          if (multipart) {
            fetchResult = this.createFormDataFromVariables({ query, variables, operationName, extensions }).then(form =>
              (fetch as AsyncFetchFn)(HTTP_URL, {
                method: 'POST',
                credentials: 'include',
                body: form as any,
                headers: {
                  accept: 'application/json',
                  ...headers,
                },
                signal: controller.signal,
              })
            );
          } else {
            fetchResult = fetch(HTTP_URL, {
              method: 'POST',
              credentials: 'include',
              body: JSON.stringify({
                query,
                variables,
                operationName,
                extensions,
              }),
              headers: {
                accept: 'application/json, multipart/mixed',
                'content-type': 'application/json',
                ...headers,
              },
              signal: controller.signal,
            });
          }
          break;
      }
      if (isPromise(fetchResult)) {
        return fetchResult.then(async res => {
          const response: ExecutionResult = {};
          const maybeStream = await meros<ExecutionPatchResult>(res);
          if (isAsyncIterable(maybeStream)) {
            return withCancel(
              mapAsyncIterator(maybeStream, part => {
                if (part.json) {
                  const chunk = part.body;
                  if (chunk.path) {
                    if (chunk.data) {
                      const path: Array<string | number> = ['data'];
                      _.merge(response, _.set({}, path.concat(chunk.path), chunk.data));
                    }

                    if (chunk.errors) {
                      response.errors = (response.errors || []).concat(chunk.errors);
                    }
                  } else {
                    if (chunk.data) {
                      response.data = chunk.data;
                    }
                    if (chunk.errors) {
                      response.errors = chunk.errors;
                    }
                  }
                  return response;
                }
              }),
              () => controller.abort()
            );
          } else {
            return maybeStream.json();
          }
        });
      }
      return fetchResult.json();
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

    return async <TReturn, TArgs>({ document, variables, operationName }: ExecutionParams<TArgs>) => {
      return observableToAsyncIterable(
        subscriptionClient.request({
          query: document,
          variables,
          operationName,
        })
      ) as AsyncIterableIterator<ExecutionResult<TReturn>>;
    };
  }

  buildSSEExecutor(
    pointer: string,
    extraHeaders: HeadersConfig | undefined,
    fetch: AsyncFetchFn,
    options: Maybe<FetchEventSourceInit>
  ): AsyncExecutor<any, ExecutionExtensions> {
    return async ({ document, variables, extensions }) => {
      const controller = new AbortController();
      const query = print(document);
      const finalUrl = this.prepareGETUrl({ baseUrl: pointer, query, variables });
      return observableToAsyncIterable({
        subscribe: observer => {
          const headers = Object.assign({}, extraHeaders || {}, extensions?.headers || {});
          fetchEventSource(finalUrl, {
            credentials: 'include',
            headers,
            method: 'GET',
            onerror: error => {
              observer.error(error);
            },
            onmessage: event => {
              observer.next(JSON.parse(event.data || '{}'));
            },
            onopen: async response => {
              const contentType = response.headers.get('content-type');
              if (!contentType?.startsWith('text/event-stream')) {
                let error;
                try {
                  const { errors } = await response.json();
                  error = errors[0];
                } catch (error) {
                  // Failed to parse body
                }

                if (error) {
                  throw error;
                }

                throw new Error(`Expected content-type to be ${'text/event-stream'} but got "${contentType}".`);
              }
            },
            fetch,
            signal: controller.signal,
            ...options,
          });
          return {
            unsubscribe: () => controller.abort(),
          };
        },
      });
    };
  }

  getFetch(
    customFetch: LoadFromUrlOptions['customFetch'],
    importFn: AsyncImportFn,
    async: true
  ): PromiseLike<AsyncFetchFn>;

  getFetch(customFetch: LoadFromUrlOptions['customFetch'], importFn: SyncImportFn, async: false): SyncFetchFn;

  getFetch(
    customFetch: LoadFromUrlOptions['customFetch'],
    importFn: SyncImportFn | AsyncImportFn,
    async: boolean
  ): SyncFetchFn | PromiseLike<AsyncFetchFn> {
    if (customFetch) {
      if (typeof customFetch === 'string') {
        const [moduleName, fetchFnName] = customFetch.split('#');
        const moduleResult = importFn(moduleName);
        if (isPromise(moduleResult)) {
          return moduleResult.then(module => (fetchFnName ? (module as Record<string, any>)[fetchFnName] : module));
        } else {
          return fetchFnName ? (module as Record<string, any>)[fetchFnName] : moduleResult;
        }
      } else {
        return customFetch as any;
      }
    }
    return async ? (typeof fetch === 'undefined' ? crossFetch : fetch) : syncFetch;
  }

  private getDefaultMethodFromOptions(method: LoadFromUrlOptions['method'], defaultMethod: 'GET' | 'POST') {
    if (method) {
      defaultMethod = method;
    }
    return defaultMethod;
  }

  getWebSocketImpl(options: LoadFromUrlOptions, importFn: AsyncImportFn): PromiseLike<typeof WebSocket>;

  getWebSocketImpl(options: LoadFromUrlOptions, importFn: SyncImportFn): typeof WebSocket;

  getWebSocketImpl(
    options: LoadFromUrlOptions,
    importFn: SyncImportFn | AsyncImportFn
  ): typeof WebSocket | PromiseLike<typeof WebSocket> {
    if (typeof options?.webSocketImpl === 'string') {
      const [moduleName, webSocketImplName] = options.webSocketImpl.split('#');
      const importedModule = importFn(moduleName);
      if (isPromise(importedModule)) {
        return importedModule.then(webSocketImplName ? importedModule[webSocketImplName] : importedModule);
      } else {
        return webSocketImplName ? (importedModule as Record<string, any>)[webSocketImplName] : importedModule;
      }
    } else {
      const websocketImpl = options.webSocketImpl || WebSocket;
      return websocketImpl;
    }
  }

  async getExecutorAsync(pointer: SchemaPointerSingle, options: LoadFromUrlOptions = {}): Promise<AsyncExecutor> {
    const fetch = await this.getFetch(options.customFetch, asyncImport, true);
    const defaultMethod = this.getDefaultMethodFromOptions(options.method, 'POST');

    const httpExecutor = this.buildExecutor({
      pointer,
      fetch,
      extraHeaders: options.headers,
      defaultMethod,
      useGETForQueries: options.useGETForQueries,
      multipart: options.multipart,
    });

    let subscriptionExecutor: AsyncExecutor;

    const subscriptionsEndpoint = options.subscriptionsEndpoint || pointer;
    if (options.useSSEForSubscription) {
      subscriptionExecutor = this.buildSSEExecutor(
        subscriptionsEndpoint,
        options.headers,
        fetch,
        options.eventSourceOptions
      );
    } else {
      const webSocketImpl = await this.getWebSocketImpl(options, asyncImport);
      const connectionParams = () => ({ headers: options.headers });
      if (options.useWebSocketLegacyProtocol) {
        subscriptionExecutor = this.buildWSLegacyExecutor(subscriptionsEndpoint, webSocketImpl, connectionParams);
      } else {
        subscriptionExecutor = this.buildWSExecutor(subscriptionsEndpoint, webSocketImpl, connectionParams);
      }
    }

    return params => {
      if (params.info?.operation.operation === 'subscription') {
        return subscriptionExecutor(params);
      }
      return httpExecutor(params);
    };
  }

  getExecutorSync(pointer: SchemaPointerSingle, options: LoadFromUrlOptions): SyncExecutor {
    const fetch = this.getFetch(options?.customFetch, syncImport, false);
    const defaultMethod = this.getDefaultMethodFromOptions(options?.method, 'POST');

    const executor = this.buildExecutor({
      pointer,
      fetch,
      extraHeaders: options.headers,
      defaultMethod,
      useGETForQueries: options.useGETForQueries,
    });

    return executor;
  }

  async getSubschemaConfigAsync(pointer: SchemaPointerSingle, options: LoadFromUrlOptions): Promise<SubschemaConfig> {
    const executor = await this.getExecutorAsync(pointer, options);
    return {
      schema: await introspectSchema(executor, undefined, options as IntrospectionOptions),
      executor,
    };
  }

  getSubschemaConfigSync(pointer: SchemaPointerSingle, options: LoadFromUrlOptions): SubschemaConfig {
    const executor = this.getExecutorSync(pointer, options);
    return {
      schema: introspectSchema(executor, undefined, options as IntrospectionOptions),
      executor,
    };
  }

  async handleSDLAsync(pointer: SchemaPointerSingle, options: LoadFromUrlOptions): Promise<Source> {
    const fetch = await this.getFetch(options?.customFetch, asyncImport, true);
    const defaultMethod = this.getDefaultMethodFromOptions(options?.method, 'GET');
    const response = await fetch(pointer, {
      method: defaultMethod,
      headers: options.headers,
    });
    const schemaString = await response.text();
    return parseGraphQLSDL(pointer, schemaString, options);
  }

  handleSDLSync(pointer: SchemaPointerSingle, options: LoadFromUrlOptions): Source {
    const fetch = this.getFetch(options?.customFetch, syncImport, false);
    const defaultMethod = this.getDefaultMethodFromOptions(options?.method, 'GET');
    const response = fetch(pointer, {
      method: defaultMethod,
      headers: options.headers,
    });
    const schemaString = response.text();
    return parseGraphQLSDL(pointer, schemaString, options);
  }

  async load(pointer: SchemaPointerSingle, options: LoadFromUrlOptions): Promise<Source> {
    if (options?.handleAsSDL || pointer.endsWith('.graphql')) {
      return this.handleSDLAsync(pointer, options);
    }

    const subschemaConfig = await this.getSubschemaConfigAsync(pointer, options);

    const remoteExecutableSchema = wrapSchema(subschemaConfig);

    return {
      location: pointer,
      schema: remoteExecutableSchema,
    };
  }

  loadSync(pointer: SchemaPointerSingle, options: LoadFromUrlOptions): Source {
    if (options?.handleAsSDL || pointer.endsWith('.graphql')) {
      return this.handleSDLSync(pointer, options);
    }

    const subschemaConfig = this.getSubschemaConfigSync(pointer, options);

    const remoteExecutableSchema = wrapSchema(subschemaConfig);

    return {
      location: pointer,
      schema: remoteExecutableSchema,
    };
  }
}

function switchProtocols(pointer: string, protocolMap: Record<string, string>): string {
  return Object.entries(protocolMap).reduce(
    (prev, [source, target]) => prev.replace(`${source}://`, `${target}://`).replace(`${source}:\\`, `${target}:\\`),
    pointer
  );
}
