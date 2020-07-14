/* eslint-disable no-case-declarations */
import { print, IntrospectionOptions, DocumentNode, GraphQLResolveInfo, Kind } from 'graphql';
import {
  SchemaPointerSingle,
  Source,
  DocumentLoader,
  SingleFileOptions,
  observableToAsyncIterable,
  ExecutionResult,
} from '@graphql-tools/utils';
import { isWebUri } from 'valid-url';
import { fetch as crossFetch } from 'cross-fetch';
import { AsyncExecutor, Subscriber } from '@graphql-tools/delegate';
import { introspectSchema, wrapSchema } from '@graphql-tools/wrap';
import { SubscriptionClient } from 'subscriptions-transport-ws';
import { w3cwebsocket } from 'websocket';

export type FetchFn = typeof import('cross-fetch').fetch;

type Headers = Record<string, string> | Array<Record<string, string>>;

/**
 * Additional options for loading from a URL
 */
export interface LoadFromUrlOptions extends SingleFileOptions, Partial<IntrospectionOptions> {
  /**
   * Additional headers to include when querying the original schema
   */
  headers?: Headers;
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
   * Whether to enable subscriptions on the loaded schema
   */
  enableSubscriptions?: boolean;
  /**
   * Custom WebSocket implementation used by the loaded schema if subscriptions
   * are enabled
   */
  webSocketImpl?: typeof w3cwebsocket | string;
  /**
   * Whether to use the GET HTTP method for queries when querying the original schema
   */
  useGETForQueries?: boolean;
}

/**
 * This loader loads a schema from a URL. The loaded schema is a fully-executable,
 * remote schema since it's created using [@graphql-tools/wrap](remote-schemas).
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

  buildAsyncExecutor({
    pointer,
    fetch,
    extraHeaders,
    defaultMethod,
    useGETForQueries,
  }: {
    pointer: string;
    fetch: typeof crossFetch;
    extraHeaders: any;
    defaultMethod: 'GET' | 'POST';
    useGETForQueries: boolean;
  }): AsyncExecutor {
    const HTTP_URL = pointer.replace('ws:', 'http:').replace('wss:', 'https:');
    return async ({ document, variables }: { document: DocumentNode; variables: any; info: GraphQLResolveInfo }) => {
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

      let fetchResult: Response;
      const query = print(document);
      switch (method) {
        case 'GET':
          const urlObj = new URL(HTTP_URL);
          urlObj.searchParams.set('query', query);
          urlObj.searchParams.set(variables, JSON.stringify(variables));
          const finalUrl = urlObj.toString();
          fetchResult = await fetch(finalUrl, {
            method: 'GET',
            headers: extraHeaders,
          });
          break;
        case 'POST':
          fetchResult = await fetch(HTTP_URL, {
            method: 'POST',
            body: JSON.stringify({
              query,
              variables,
            }),
            headers: extraHeaders,
          });
          break;
      }
      return fetchResult.json();
    };
  }

  buildSubscriber(pointer: string, webSocketImpl: typeof w3cwebsocket): Subscriber {
    const WS_URL = pointer.replace('http:', 'ws:').replace('https:', 'wss:');
    const subscriptionClient = new SubscriptionClient(WS_URL, {}, webSocketImpl);
    return async <TReturn, TArgs>({ document, variables }: { document: DocumentNode; variables: TArgs }) => {
      return observableToAsyncIterable(
        subscriptionClient.request({
          query: document,
          variables,
        })
      ) as AsyncIterator<ExecutionResult<TReturn>>;
    };
  }

  async getExecutorAndSubscriber(
    pointer: SchemaPointerSingle,
    options: LoadFromUrlOptions
  ): Promise<{ executor: AsyncExecutor; subscriber: Subscriber }> {
    let headers = {};
    let fetch = crossFetch;
    let defaultMethod: 'GET' | 'POST' = 'POST';
    let webSocketImpl = w3cwebsocket;

    if (options) {
      if (Array.isArray(options.headers)) {
        headers = options.headers.reduce((prev: any, v: any) => ({ ...prev, ...v }), {});
      } else if (typeof options.headers === 'object') {
        headers = options.headers;
      }

      if (options.customFetch) {
        if (typeof options.customFetch === 'string') {
          const [moduleName, fetchFnName] = options.customFetch.split('#');
          fetch = await import(moduleName).then(module => (fetchFnName ? module[fetchFnName] : module));
        } else {
          fetch = options.customFetch;
        }
      }

      if (options.webSocketImpl) {
        if (typeof options.webSocketImpl === 'string') {
          const [moduleName, webSocketImplName] = options.webSocketImpl.split('#');
          webSocketImpl = await import(moduleName).then(module =>
            webSocketImplName ? module[webSocketImplName] : module
          );
        } else {
          webSocketImpl = options.webSocketImpl;
        }
      }

      if (options.method) {
        defaultMethod = options.method;
      }
    }

    const extraHeaders = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...headers,
    };

    const executor = this.buildAsyncExecutor({
      pointer,
      fetch,
      extraHeaders,
      defaultMethod,
      useGETForQueries: options.useGETForQueries,
    });

    let subscriber: Subscriber;

    if (options.enableSubscriptions) {
      subscriber = this.buildSubscriber(pointer, webSocketImpl);
    }

    return {
      executor,
      subscriber,
    };
  }

  async getSubschemaConfig(pointer: SchemaPointerSingle, options: LoadFromUrlOptions) {
    const { executor, subscriber } = await this.getExecutorAndSubscriber(pointer, options);
    return {
      schema: await introspectSchema(executor),
      executor,
      subscriber,
    };
  }

  async load(pointer: SchemaPointerSingle, options: LoadFromUrlOptions): Promise<Source> {
    const subschemaConfig = await this.getSubschemaConfig(pointer, options);

    const remoteExecutableSchema = wrapSchema(subschemaConfig);

    return {
      location: pointer,
      schema: remoteExecutableSchema,
    };
  }

  loadSync(): never {
    throw new Error('Loader Url has no sync mode');
  }
}
