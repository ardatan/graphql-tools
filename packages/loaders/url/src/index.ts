import { IntrospectionOptions, buildASTSchema, buildSchema } from 'graphql';

import {
  AsyncExecutor,
  Executor,
  SyncExecutor,
  Source,
  Loader,
  BaseLoaderOptions,
  ExecutionRequest,
  parseGraphQLSDL,
  getOperationASTFromRequest,
} from '@graphql-tools/utils';
import { introspectSchema, wrapSchema } from '@graphql-tools/wrap';
import WebSocket from 'isomorphic-ws';
import { ValueOrPromise } from 'value-or-promise';
import { defaultAsyncFetch } from './defaultAsyncFetch.js';
import { defaultSyncFetch } from './defaultSyncFetch.js';
import { buildGraphQLWSExecutor } from '@graphql-tools/executor-graphql-ws';
import {
  AsyncFetchFn,
  buildHTTPExecutor,
  FetchFn,
  HTTPExecutorOptions,
  SyncFetchFn,
  isLiveQueryOperationDefinitionNode,
} from '@graphql-tools/executor-http';
import { buildWSLegacyExecutor } from '@graphql-tools/executor-legacy-ws';

export { FetchFn };

export type AsyncImportFn = (moduleName: string) => PromiseLike<any>;
export type SyncImportFn = (moduleName: string) => any;

const asyncImport: AsyncImportFn = (moduleName: string) => import(moduleName);
const syncImport: SyncImportFn = (moduleName: string) => require(moduleName);

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
export interface LoadFromUrlOptions extends BaseLoaderOptions, Partial<IntrospectionOptions>, HTTPExecutorOptions {
  /**
   * A custom `fetch` implementation to use when querying the original schema.
   * Defaults to `cross-fetch`
   */
  customFetch?: FetchFn | string;
  /**
   * Custom WebSocket implementation used by the loaded schema if subscriptions
   * are enabled
   */
  webSocketImpl?: typeof WebSocket | string;
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
  buildHTTPExecutor(
    endpoint: string,
    fetchFn: SyncFetchFn,
    options?: LoadFromUrlOptions
  ): SyncExecutor<any, ExecutionExtensions>;

  buildHTTPExecutor(
    endpoint: string,
    fetchFn: AsyncFetchFn,
    options?: LoadFromUrlOptions
  ): AsyncExecutor<any, ExecutionExtensions>;

  buildHTTPExecutor(
    initialEndpoint: string,
    fetchFn: FetchFn,
    options?: LoadFromUrlOptions
  ): Executor<any, ExecutionExtensions> {
    const HTTP_URL = switchProtocols(initialEndpoint, {
      wss: 'https',
      ws: 'http',
    });

    return buildHTTPExecutor({
      endpoint: HTTP_URL,
      fetch: fetchFn as any,
      ...options,
    });
  }

  buildWSExecutor(
    subscriptionsEndpoint: string,
    webSocketImpl: typeof WebSocket,
    connectionParams?: Record<string, any>
  ): Executor {
    const WS_URL = switchProtocols(subscriptionsEndpoint, {
      https: 'wss',
      http: 'ws',
    });
    return buildGraphQLWSExecutor(WS_URL, webSocketImpl, connectionParams);
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

    return buildWSLegacyExecutor(WS_URL, WebSocketImpl, options);
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
    fetch: AsyncFetchFn | SyncFetchFn,
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
        if (operationAst.operation === 'subscription' || isLiveQueryOperationDefinitionNode(operationAst)) {
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
