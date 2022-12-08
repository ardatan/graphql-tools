import {
  ExecutionResult,
  AsyncExecutor,
  createGraphQLError,
  ExecutionRequest,
  Executor,
  getOperationASTFromRequest,
  SyncExecutor,
} from '@graphql-tools/utils';
import { GraphQLResolveInfo, print } from 'graphql';
import { isLiveQueryOperationDefinitionNode } from './isLiveQueryOperationDefinitionNode.js';
import { prepareGETUrl } from './prepareGETUrl.js';
import { ValueOrPromise } from 'value-or-promise';
import { createFormDataFromVariables } from './createFormDataFromVariables.js';
import { handleEventStreamResponse } from './handleEventStreamResponse.js';
import { handleMultipartMixedResponse } from './handleMultipartMixedResponse.js';
import { fetch as defaultFetch, AbortController } from '@whatwg-node/fetch';
import { cancelNeeded } from './addCancelToResponseStream.js';

export type SyncFetchFn = (url: string, init?: RequestInit, context?: any, info?: GraphQLResolveInfo) => SyncResponse;
export type SyncResponse = Omit<Response, 'json' | 'text'> & {
  json: () => any;
  text: () => string;
};

export type AsyncFetchFn = (
  url: string,
  options?: RequestInit,
  context?: any,
  info?: GraphQLResolveInfo
) => Promise<Response>;

export type FetchFn = AsyncFetchFn | SyncFetchFn;

export type AsyncImportFn = (moduleName: string) => PromiseLike<any>;
export type SyncImportFn = (moduleName: string) => any;

export interface HTTPExecutorOptions {
  endpoint?: string;
  fetch?: FetchFn;
  /**
   * Whether to use the GET HTTP method for queries when querying the original schema
   */
  useGETForQueries?: boolean;
  /**
   * Additional headers to include when querying the original schema
   */
  headers?: HeadersConfig;
  /**
   * HTTP method to use when querying the original schema.
   */
  method?: 'GET' | 'POST';
  /**
   * Timeout in milliseconds
   */
  timeout?: number;
  /**
   * Request Credentials (default: 'same-origin')
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Request/credentials
   */
  credentials?: RequestCredentials;
  /**
   * Retry attempts
   */
  retry?: number;
}

export type HeadersConfig = Record<string, string>;

export function buildHTTPExecutor(
  options?: Omit<HTTPExecutorOptions, 'fetch'> & { fetch: SyncFetchFn }
): SyncExecutor<any, HTTPExecutorOptions>;

export function buildHTTPExecutor(
  options?: Omit<HTTPExecutorOptions, 'fetch'> & { fetch: AsyncFetchFn }
): AsyncExecutor<any, HTTPExecutorOptions>;

export function buildHTTPExecutor(options?: HTTPExecutorOptions): Executor<any, HTTPExecutorOptions> {
  const executor = (request: ExecutionRequest<any, any, any, HTTPExecutorOptions>) => {
    const fetchFn = request.extensions?.fetch ?? options?.fetch ?? defaultFetch;
    let controller: AbortController | undefined;
    let method = request.extensions?.method || options?.method || 'POST';

    const operationAst = getOperationASTFromRequest(request);
    const operationType = operationAst.operation;

    if ((options?.useGETForQueries || request.extensions?.useGETForQueries) && operationType === 'query') {
      method = 'GET';
    }

    let accept = 'application/graphql-response+json, application/json, multipart/mixed';
    if (operationType === 'subscription' || isLiveQueryOperationDefinitionNode(operationAst)) {
      method = 'GET';
      accept = 'text/event-stream';
    }

    const endpoint = request.extensions?.endpoint || options?.endpoint || '/graphql';
    const headers = Object.assign(
      {
        accept,
      },
      options?.headers,
      request.extensions?.headers || {}
    );

    const query = print(request.document);
    const requestBody = {
      query,
      variables: request.variables,
      operationName: request.operationName,
      extensions: request.extensions,
    };

    let timeoutId: any;
    if (options?.timeout) {
      controller = new AbortController();
      timeoutId = setTimeout(() => {
        if (!controller?.signal.aborted) {
          controller?.abort();
        }
      }, options.timeout);
    }

    if (!controller && cancelNeeded()) {
      controller = new AbortController();
    }

    return new ValueOrPromise(() => {
      switch (method) {
        case 'GET': {
          const finalUrl = prepareGETUrl({
            baseUrl: endpoint,
            ...requestBody,
          });
          return fetchFn(
            finalUrl,
            {
              method: 'GET',
              ...(options?.credentials != null ? { credentials: options.credentials } : {}),
              headers,
              signal: controller?.signal,
            },
            request.context,
            request.info
          );
        }
        case 'POST':
          return new ValueOrPromise(() => createFormDataFromVariables(requestBody))
            .then(
              body =>
                fetchFn(
                  endpoint,
                  {
                    method: 'POST',
                    ...(options?.credentials != null ? { credentials: options.credentials } : {}),
                    body,
                    headers: {
                      ...headers,
                      ...(typeof body === 'string' ? { 'content-type': 'application/json' } : {}),
                    },
                    signal: controller?.signal,
                  },
                  request.context,
                  request.info
                ) as any
            )
            .resolve();
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
          return handleEventStreamResponse(fetchResult, controller);
        } else if (contentType?.includes('multipart/mixed')) {
          return handleMultipartMixedResponse(fetchResult, controller);
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
      .catch((e: any) => {
        if (typeof e === 'string') {
          return {
            errors: [
              createGraphQLError(e, {
                extensions: {
                  requestBody,
                },
              }),
            ],
          };
        } else if (e.name === 'GraphQLError') {
          return {
            errors: [e],
          };
        } else if (e.name === 'TypeError' && e.message === 'fetch failed') {
          return {
            errors: [
              createGraphQLError(`fetch failed to ${endpoint}`, {
                extensions: {
                  requestBody,
                },
                originalError: e,
              }),
            ],
          };
        } else if (e.message) {
          return {
            errors: [
              createGraphQLError(e.message, {
                extensions: {
                  requestBody,
                },
                originalError: e,
              }),
            ],
          };
        } else {
          return {
            errors: [
              createGraphQLError('Unknown error', {
                extensions: {
                  requestBody,
                },
                originalError: e,
              }),
            ],
          };
        }
      })
      .resolve();
  };

  if (options?.retry != null) {
    return function retryExecutor(request: ExecutionRequest) {
      let result: ExecutionResult<any> | undefined;
      let attempt = 0;
      function retryAttempt(): Promise<ExecutionResult<any>> | ExecutionResult<any> {
        attempt++;
        if (attempt > options!.retry!) {
          if (result != null) {
            return result;
          }
          return {
            errors: [createGraphQLError('No response returned from fetch')],
          };
        }
        return new ValueOrPromise(() => executor(request))
          .then(res => {
            result = res;
            if (result?.errors?.length) {
              return retryAttempt();
            }
            return result;
          })
          .resolve();
      }
      return retryAttempt();
    };
  }

  return executor;
}

export { isLiveQueryOperationDefinitionNode };
