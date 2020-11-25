/* eslint-disable no-case-declarations */
import { print, IntrospectionOptions, DocumentNode, GraphQLResolveInfo, Kind, parse, buildASTSchema } from 'graphql';
import { SchemaPointerSingle, Source, DocumentLoader, SingleFileOptions } from '@graphql-tools/utils';
import { isWebUri } from 'valid-url';
import { fetch as crossFetch } from 'cross-fetch';
import { AsyncExecutor, Executor, Subscriber, SyncExecutor } from '@graphql-tools/delegate';
import { introspectSchema, wrapSchema } from '@graphql-tools/wrap';
import { createClient } from 'graphql-ws';
import WebSocket from 'isomorphic-ws';
import syncFetch from 'sync-fetch';
import isPromise from 'is-promise';

export type AsyncFetchFn = typeof import('cross-fetch').fetch;
export type SyncFetchFn = (input: RequestInfo, init?: RequestInit) => SyncResponse;
export type SyncResponse = Omit<Response, 'json' | 'text'> & {
  json: () => any;
  text: () => string;
};
export type FetchFn = AsyncFetchFn | SyncFetchFn;

type Headers = Record<string, string> | Array<Record<string, string>>;

type BuildExecutorOptions<TFetchFn> = {
  pointer: string;
  fetch: TFetchFn;
  extraHeaders: any;
  defaultMethod: 'GET' | 'POST';
  useGETForQueries: boolean;
};

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
  webSocketImpl?: typeof WebSocket | string;
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

  buildExecutor(options: BuildExecutorOptions<SyncFetchFn>): SyncExecutor;
  buildExecutor(options: BuildExecutorOptions<AsyncFetchFn>): AsyncExecutor;
  buildExecutor({
    pointer,
    fetch,
    extraHeaders,
    defaultMethod,
    useGETForQueries,
  }: {
    pointer: string;
    fetch: FetchFn;
    extraHeaders: any;
    defaultMethod: 'GET' | 'POST';
    useGETForQueries: boolean;
  }): Executor {
    const HTTP_URL = switchProtocols(pointer, {
      wss: 'https',
      ws: 'http',
    });
    const executor = ({
      document,
      variables,
    }: {
      document: DocumentNode;
      variables: any;
      info: GraphQLResolveInfo;
    }) => {
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

      let fetchResult: SyncResponse | Promise<Response>;
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
      if (isPromise(fetchResult)) {
        return fetchResult.then(res => res.json());
      }
      return fetchResult.json();
    };

    return executor;
  }

  buildSubscriber(pointer: string, webSocketImpl: typeof WebSocket): Subscriber {
    const WS_URL = switchProtocols(pointer, {
      https: 'wss',
      http: 'ws',
    });
    const subscriptionClient = createClient({
      url: WS_URL,
      webSocketImpl,
    });
    // Taken from https://www.npmjs.com/package/graphql-ws#async-iterator
    return async <TReturn, TArgs>({ document, variables }: { document: DocumentNode; variables: TArgs }) => {
      let deferred: {
        resolve: (done: boolean) => void;
        reject: (err: unknown) => void;
      } | null = null;
      const pending: TReturn[] = [];
      let throwMe: unknown = null;
      let done = false;
      const query = print(document);
      const dispose = subscriptionClient.subscribe<TReturn>(
        {
          query,
          variables: variables as any,
        },
        {
          next: data => {
            pending.push(data);
            deferred?.resolve(false);
          },
          error: err => {
            throwMe = err;
            deferred?.reject(throwMe);
          },
          complete: () => {
            done = true;
            deferred?.resolve(true);
          },
        }
      );
      return {
        [Symbol.asyncIterator]() {
          return this;
        },
        async next() {
          if (done) return { done: true, value: undefined };
          if (throwMe) throw throwMe;
          if (pending.length) return { value: pending.shift()! };
          return (await new Promise<boolean>((resolve, reject) => (deferred = { resolve, reject })))
            ? { done: true, value: undefined }
            : { value: pending.shift()! };
        },
        async return() {
          dispose();
          return { done: true, value: undefined };
        },
      };
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
    let fetch: SyncFetchFn = syncFetch;

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
          fetch = options.customFetch as SyncFetchFn;
        }
      }

      if (options.method) {
        defaultMethod = options.method;
      }
    }
    return { headers, defaultMethod, fetch };
  }

  getWebSocketImpl(
    options: LoadFromUrlOptions,
    importFn: (moduleName: string) => PromiseLike<unknown>,
    async: true
  ): PromiseLike<typeof WebSocket>;

  getWebSocketImpl(
    options: LoadFromUrlOptions,
    importFn: (moduleName: string) => unknown,
    async: false
  ): typeof WebSocket;

  getWebSocketImpl(
    options: LoadFromUrlOptions,
    importFn: (moduleName: string) => unknown | PromiseLike<unknown>,
    async: boolean
  ): typeof WebSocket | PromiseLike<typeof WebSocket> {
    if (typeof options?.webSocketImpl === 'string') {
      const [moduleName, webSocketImplName] = options.webSocketImpl.split('#');
      const importedModule = importFn(moduleName);
      if (async && isPromise(importedModule)) {
        return importedModule.then(webSocketImplName ? importedModule[webSocketImplName] : importedModule);
      } else {
        return webSocketImplName ? importedModule[webSocketImplName] : importedModule;
      }
    } else {
      const websocketImpl = options.webSocketImpl || WebSocket;
      if (async) {
        return Promise.resolve(websocketImpl);
      } else {
        return websocketImpl;
      }
    }
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

    const executor = this.buildExecutor({
      pointer,
      fetch,
      extraHeaders,
      defaultMethod,
      useGETForQueries: options.useGETForQueries,
    });

    let subscriber: Subscriber;

    if (options.enableSubscriptions) {
      const webSocketImpl = await this.getWebSocketImpl(options, (moduleName: string) => import(moduleName), true);
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

    const executor = this.buildExecutor({
      pointer,
      fetch,
      extraHeaders,
      defaultMethod,
      useGETForQueries: options.useGETForQueries,
    });

    let subscriber: Subscriber;

    if (options.enableSubscriptions) {
      const webSocketImpl = this.getWebSocketImpl(options, (moduleName: string) => require(moduleName), false);
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
      schema: introspectSchema(executor, undefined, options as IntrospectionOptions),
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
