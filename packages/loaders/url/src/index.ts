/* eslint-disable no-case-declarations */
import { print, IntrospectionOptions, DocumentNode, GraphQLResolveInfo, Kind, parse, buildASTSchema } from 'graphql';
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
import { AsyncExecutor, Subscriber, SyncExecutor } from '@graphql-tools/delegate';
import { introspectSchema, introspectSchemaSync, wrapSchema } from '@graphql-tools/wrap';
import { SubscriptionClient } from 'subscriptions-transport-ws';
import { w3cwebsocket } from 'websocket';
import syncFetch from 'sync-fetch';

export type AsyncFetchFn = typeof import('cross-fetch').fetch;
export type SyncFetchFn = (input: RequestInfo, init?: RequestInit) => SyncResponse;
export type SyncResponse = Omit<Response, 'json' | 'text'> & {
  json: () => any;
  text: () => string;
};
export type FetchFn = AsyncFetchFn | SyncFetchFn;

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
    const HTTP_URL = switchProtocols(pointer, {
      wss: 'https',
      ws: 'http',
    });
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
          if (variables && Object.keys(variables).length > 0) {
            urlObj.searchParams.set('variables', JSON.stringify(variables));
          }
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

  buildSyncExecutor({
    pointer,
    fetch,
    extraHeaders,
    defaultMethod,
    useGETForQueries,
  }: {
    pointer: string;
    fetch: SyncFetchFn;
    extraHeaders: any;
    defaultMethod: 'GET' | 'POST';
    useGETForQueries: boolean;
  }): SyncExecutor {
    const HTTP_URL = switchProtocols(pointer, {
      wss: 'https',
      ws: 'http',
    });
    return ({ document, variables }: { document: DocumentNode; variables: any; info: GraphQLResolveInfo }) => {
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

      let fetchResult: SyncResponse;
      const query = print(document);
      switch (method) {
        case 'GET':
          const urlObj = new URL(HTTP_URL);
          urlObj.searchParams.set('query', query);
          if (variables && Object.keys(variables).length > 0) {
            urlObj.searchParams.set('variables', JSON.stringify(variables));
          }
          const finalUrl = urlObj.toString();
          fetchResult = fetch(finalUrl, {
            method: 'GET',
            headers: extraHeaders,
          });
          break;
        case 'POST':
          fetchResult = fetch(HTTP_URL, {
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
    const WS_URL = switchProtocols(pointer, {
      https: 'wss',
      http: 'ws',
    });
    const subscriptionClient = new SubscriptionClient(WS_URL, {}, webSocketImpl);
    return async <TReturn, TArgs>({ document, variables }: { document: DocumentNode; variables: TArgs }) => {
      return observableToAsyncIterable(
        subscriptionClient.request({
          query: document,
          variables,
        })
      ) as AsyncIterableIterator<ExecutionResult<TReturn>>;
    };
  }

  private async getFetchAsync(options: LoadFromUrlOptions, defaultMethod: 'GET' | 'POST') {
    let headers = {};
    let fetch = crossFetch;

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
          fetch = options.customFetch as AsyncFetchFn;
        }
      }

      if (options.method) {
        defaultMethod = options.method;
      }
    }
    return { headers, defaultMethod, fetch };
  }

  private getFetchSync(options: LoadFromUrlOptions, defaultMethod: 'GET' | 'POST') {
    let headers = {};
    let fetch = syncFetch;

    if (options) {
      if (Array.isArray(options.headers)) {
        headers = options.headers.reduce((prev: any, v: any) => ({ ...prev, ...v }), {});
      } else if (typeof options.headers === 'object') {
        headers = options.headers;
      }

      if (options.customFetch) {
        if (typeof options.customFetch === 'string') {
          const [moduleName, fetchFnName] = options.customFetch.split('#');
          const module = require(moduleName);
          fetch = fetchFnName ? module[fetchFnName] : module;
        } else {
          fetch = options.customFetch as AsyncFetchFn;
        }
      }

      if (options.method) {
        defaultMethod = options.method;
      }
    }
    return { headers, defaultMethod, fetch };
  }

  async getWebSocketImplAsync(options: LoadFromUrlOptions) {
    let webSocketImpl = w3cwebsocket;
    if (typeof options.webSocketImpl === 'string') {
      const [moduleName, webSocketImplName] = options.webSocketImpl.split('#');
      webSocketImpl = await import(moduleName).then(module => (webSocketImplName ? module[webSocketImplName] : module));
    } else {
      webSocketImpl = options.webSocketImpl;
    }
    return webSocketImpl;
  }

  getWebSocketImplSync(options: LoadFromUrlOptions) {
    let webSocketImpl = w3cwebsocket;
    if (typeof options.webSocketImpl === 'string') {
      const [moduleName, webSocketImplName] = options.webSocketImpl.split('#');
      const module = require(moduleName);
      webSocketImpl = webSocketImplName ? module[webSocketImplName] : module;
    } else {
      webSocketImpl = options.webSocketImpl;
    }
    return webSocketImpl;
  }

  async getExecutorAndSubscriberAsync(
    pointer: SchemaPointerSingle,
    options: LoadFromUrlOptions
  ): Promise<{ executor: AsyncExecutor; subscriber: Subscriber }> {
    const { headers, defaultMethod, fetch } = await this.getFetchAsync(options, 'POST');

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
      const webSocketImpl = await this.getWebSocketImplAsync(options);
      subscriber = this.buildSubscriber(pointer, webSocketImpl);
    }

    return {
      executor,
      subscriber,
    };
  }

  getExecutorAndSubscriberSync(
    pointer: SchemaPointerSingle,
    options: LoadFromUrlOptions
  ): { executor: SyncExecutor; subscriber: Subscriber } {
    const { headers, defaultMethod, fetch } = this.getFetchSync(options, 'POST');

    const extraHeaders = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...headers,
    };

    const executor = this.buildSyncExecutor({
      pointer,
      fetch,
      extraHeaders,
      defaultMethod,
      useGETForQueries: options.useGETForQueries,
    });

    let subscriber: Subscriber;

    if (options.enableSubscriptions) {
      const webSocketImpl = this.getWebSocketImplSync(options);
      subscriber = this.buildSubscriber(pointer, webSocketImpl);
    }

    return {
      executor,
      subscriber,
    };
  }

  async getSubschemaConfigAsync(pointer: SchemaPointerSingle, options: LoadFromUrlOptions) {
    const { executor, subscriber } = await this.getExecutorAndSubscriberAsync(pointer, options);
    return {
      schema: await introspectSchema(executor, undefined, options as IntrospectionOptions),
      executor,
      subscriber,
    };
  }

  getSubschemaConfigSync(pointer: SchemaPointerSingle, options: LoadFromUrlOptions) {
    const { executor, subscriber } = this.getExecutorAndSubscriberSync(pointer, options);
    return {
      schema: introspectSchemaSync(executor, undefined, options as IntrospectionOptions),
      executor,
      subscriber,
    };
  }

  async handleSDLAsync(pointer: SchemaPointerSingle, options: LoadFromUrlOptions) {
    const { fetch, defaultMethod, headers } = await this.getFetchAsync(options, 'GET');
    const response = await fetch(pointer, {
      method: defaultMethod,
      headers,
    });
    const schemaString = await response.text();
    const document = parse(schemaString, options);
    const schema = buildASTSchema(document, options);
    return {
      document,
      schema,
    };
  }

  handleSDLSync(pointer: SchemaPointerSingle, options: LoadFromUrlOptions) {
    const { fetch, defaultMethod, headers } = this.getFetchSync(options, 'GET');
    const response = fetch(pointer, {
      method: defaultMethod,
      headers,
    });
    const schemaString = response.text();
    const document = parse(schemaString, options);
    const schema = buildASTSchema(document, options);
    return {
      document,
      schema,
    };
  }

  async load(pointer: SchemaPointerSingle, options: LoadFromUrlOptions): Promise<Source> {
    if (pointer.endsWith('.graphql')) {
      const { document, schema } = await this.handleSDLAsync(pointer, options);
      return {
        location: pointer,
        document,
        schema,
      };
    }
    const subschemaConfig = await this.getSubschemaConfigAsync(pointer, options);

    const remoteExecutableSchema = wrapSchema(subschemaConfig);

    return {
      location: pointer,
      schema: remoteExecutableSchema,
    };
  }

  loadSync(pointer: SchemaPointerSingle, options: LoadFromUrlOptions): Source {
    if (pointer.endsWith('.graphql')) {
      const { document, schema } = this.handleSDLSync(pointer, options);
      return {
        location: pointer,
        document,
        schema,
      };
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
  const protocols: [string, string][] = Object.keys(protocolMap).map(source => [source, protocolMap[source]]);
  return protocols.reduce(
    (prev, [source, target]) => prev.replace(`${source}://`, `${target}://`).replace(`${source}:\\`, `${target}:\\`),
    pointer
  );
}
