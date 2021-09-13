/// <reference types="ws" />
/// <reference lib="dom" />
import { IntrospectionOptions } from 'graphql';
import { AsyncExecutor, SyncExecutor, Source, Loader, BaseLoaderOptions } from '@graphql-tools/utils';
import { ClientOptions } from 'graphql-ws';
import WebSocket from 'isomorphic-ws';
import FormData from 'form-data';
import { FetchEventSourceInit } from '@ardatan/fetch-event-source';
import { ConnectionParamsOptions } from 'subscriptions-transport-ws';
export declare type AsyncFetchFn = typeof import('cross-fetch').fetch;
export declare type SyncFetchFn = (input: RequestInfo, init?: RequestInit) => SyncResponse;
export declare type SyncResponse = Omit<Response, 'json' | 'text'> & {
  json: () => any;
  text: () => string;
};
export declare type FetchFn = AsyncFetchFn | SyncFetchFn;
export declare type AsyncImportFn = (moduleName: string) => PromiseLike<any>;
export declare type SyncImportFn = (moduleName: string) => any;
declare type HeadersConfig = Record<string, string>;
interface ExecutionExtensions {
  headers?: HeadersConfig;
}
export declare enum SubscriptionProtocol {
  WS = 'WS',
  /**
   * Use legacy web socket protocol `graphql-ws` instead of the more current standard `graphql-transport-ws`
   */
  LEGACY_WS = 'LEGACY_WS',
  /**
   * Use SSE for subscription instead of WebSocket
   */
  SSE = 'SSE',
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
   * Additional options to pass to the constructor of the underlying EventSource instance.
   */
  eventSourceOptions?: FetchEventSourceInit;
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
export declare class UrlLoader implements Loader<LoadFromUrlOptions> {
  canLoad(pointer: string, options: LoadFromUrlOptions): Promise<boolean>;
  canLoadSync(pointer: string, _options: LoadFromUrlOptions): boolean;
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
  }): FormData | Promise<FormData>;
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
  }): string;
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
  buildWSExecutor(
    subscriptionsEndpoint: string,
    webSocketImpl: typeof WebSocket,
    connectionParams?: ClientOptions['connectionParams']
  ): AsyncExecutor;
  buildWSLegacyExecutor(
    subscriptionsEndpoint: string,
    webSocketImpl: typeof WebSocket,
    connectionParams?: ConnectionParamsOptions
  ): AsyncExecutor;
  buildSSEExecutor(
    endpoint: string,
    fetch: AsyncFetchFn,
    options?: Omit<LoadFromUrlOptions, 'subscriptionEndpoint'>
  ): AsyncExecutor<any, ExecutionExtensions>;
  getFetch(customFetch: LoadFromUrlOptions['customFetch'], importFn: AsyncImportFn): PromiseLike<AsyncFetchFn>;
  getFetch(customFetch: LoadFromUrlOptions['customFetch'], importFn: SyncImportFn): SyncFetchFn;
  private getDefaultMethodFromOptions;
  getWebSocketImpl(importFn: AsyncImportFn, options?: LoadFromUrlOptions): PromiseLike<typeof WebSocket>;
  getWebSocketImpl(importFn: SyncImportFn, options?: LoadFromUrlOptions): typeof WebSocket;
  buildSubscriptionExecutor(
    subscriptionsEndpoint: string,
    fetch: AsyncFetchFn,
    options?: Omit<LoadFromUrlOptions, 'subscriptionsEndpoint'>
  ): Promise<AsyncExecutor>;
  getExecutorAsync(endpoint: string, options?: Omit<LoadFromUrlOptions, 'endpoint'>): Promise<AsyncExecutor>;
  getExecutorSync(endpoint: string, options: Omit<LoadFromUrlOptions, 'endpoint'>): SyncExecutor;
  handleSDL(pointer: string, fetch: SyncFetchFn, options: LoadFromUrlOptions): Source;
  handleSDL(pointer: string, fetch: AsyncFetchFn, options: LoadFromUrlOptions): Promise<Source>;
  load(pointer: string, options: LoadFromUrlOptions): Promise<Source[]>;
  loadSync(pointer: string, options: LoadFromUrlOptions): Source[];
}
export {};
