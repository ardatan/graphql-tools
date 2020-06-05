import { print, IntrospectionOptions, DocumentNode, GraphQLResolveInfo } from 'graphql';
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
import { AsyncExecutor, Subscriber, SubschemaConfig } from '@graphql-tools/delegate';
import { introspectSchema, wrapSchema } from '@graphql-tools/wrap';
import { SubscriptionClient } from 'subscriptions-transport-ws';
import { w3cwebsocket } from 'websocket';

export type FetchFn = typeof import('cross-fetch').fetch;

type Headers = Record<string, string> | Array<Record<string, string>>;

export interface LoadFromUrlOptions extends SingleFileOptions, Partial<IntrospectionOptions> {
  headers?: Headers;
  customFetch?: FetchFn | string;
  method?: 'GET' | 'POST';
  enableSubscriptions?: boolean;
  webSocketImpl?: typeof w3cwebsocket | string;
  useGETForQueries?: boolean;
}

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
    return async ({
      document,
      variables,
      info,
    }: {
      document: DocumentNode;
      variables: any;
      info: GraphQLResolveInfo;
    }) => {
      let method = defaultMethod;
      if (useGETForQueries && info.operation.operation === 'query') {
        method = 'GET';
      }
      const fetchResult = await fetch(HTTP_URL, {
        method,
        ...(method === 'POST'
          ? {
              body: JSON.stringify({ query: print(document), variables }),
            }
          : {}),
        headers: extraHeaders,
      });
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

  async getSubschemaConfig(pointer: SchemaPointerSingle, options: LoadFromUrlOptions): Promise<SubschemaConfig> {
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

    const schema = await introspectSchema(executor);

    const remoteExecutableSchemaOptions: SubschemaConfig = {
      schema,
      executor,
    };

    if (options.enableSubscriptions) {
      remoteExecutableSchemaOptions.subscriber = this.buildSubscriber(pointer, webSocketImpl);
    }

    return remoteExecutableSchemaOptions;
  }

  async load(pointer: SchemaPointerSingle, options: LoadFromUrlOptions): Promise<Source> {
    const remoteExecutableSchemaOptions = await this.getSubschemaConfig(pointer, options);
    const remoteExecutableSchema = wrapSchema(remoteExecutableSchemaOptions);

    return {
      location: pointer,
      schema: remoteExecutableSchema,
    };
  }

  loadSync(): never {
    throw new Error('Loader Url has no sync mode');
  }
}
