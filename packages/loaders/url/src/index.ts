import {
  buildClientSchema,
  parse,
  IntrospectionQuery,
  print,
  getIntrospectionQuery,
  IntrospectionOptions,
} from 'graphql';
import {
  SchemaPointerSingle,
  Source,
  DocumentLoader,
  SingleFileOptions,
  printSchemaWithDirectives,
} from '@graphql-tools/utils';
import { isWebUri } from 'valid-url';
import { fetch as crossFetch } from 'cross-fetch';
import { makeRemoteExecutableSchema, Executor } from '@graphql-tools/schema-stitching';

export type FetchFn = typeof import('cross-fetch').fetch;

type Headers = Record<string, string> | Array<Record<string, string>>;

export interface LoadFromUrlOptions extends SingleFileOptions, Partial<IntrospectionOptions> {
  headers?: Headers;
  customFetch?: FetchFn | string;
  method?: 'GET' | 'POST';
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

  async load(pointer: SchemaPointerSingle, options: LoadFromUrlOptions): Promise<Source> {
    let headers = {};
    let fetch = crossFetch;
    let method: 'GET' | 'POST' = 'POST';

    if (options) {
      if (Array.isArray(options.headers)) {
        headers = options.headers.reduce((prev: object, v: object) => ({ ...prev, ...v }), {});
      } else if (typeof options.headers === 'object') {
        headers = options.headers;
      }

      if (options.customFetch) {
        if (typeof options.customFetch === 'string') {
          const [moduleName, fetchFnName] = options.customFetch.split('#');
          fetch = await import(moduleName).then(module => (fetchFnName ? module[fetchFnName] : module));
        }
      }

      if (options.method) {
        method = options.method;
      }
    }

    const extraHeaders = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...headers,
    };

    const executor: Executor = async ({ document, variables }) => {
      const fetchResult = await fetch(pointer, {
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

    const body = await executor({
      document: parse(getIntrospectionQuery({ descriptions: true, ...options })),
      variables: {},
      context: {},
    });

    let errorMessage;

    if (body.errors && body.errors.length > 0) {
      errorMessage = body.errors.map((item: Error) => item.message).join(', ');
    } else if (!body.data) {
      errorMessage = JSON.stringify(body, null, 2);
    }

    if (errorMessage) {
      throw new Error('Unable to download schema from remote: ' + errorMessage);
    }

    if (!body.data.__schema) {
      throw new Error('Invalid schema provided!');
    }

    const clientSchema = buildClientSchema(body.data as IntrospectionQuery, options);
    const remoteExecutableSchema = makeRemoteExecutableSchema({
      schema: printSchemaWithDirectives(clientSchema, options), // Keep descriptions
      executor,
    });

    return {
      location: pointer,
      schema: remoteExecutableSchema,
    };
  }

  loadSync(): never {
    throw new Error('Loader Url has no sync mode');
  }
}
