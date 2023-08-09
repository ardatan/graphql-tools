import { GraphQLResolveInfo, print } from 'graphql';
import {
  AsyncExecutor,
  createGraphQLError,
  ExecutionRequest,
  ExecutionResult,
  Executor,
  getOperationASTFromRequest,
  SyncExecutor,
} from '@graphql-tools/utils';
import { fetch as defaultFetch } from '@whatwg-node/fetch';
import { createFormDataFromVariables } from './createFormDataFromVariables.js';
import { handleEventStreamResponse } from './handleEventStreamResponse.js';
import { handleMultipartMixedResponse } from './handleMultipartMixedResponse.js';
import { isLiveQueryOperationDefinitionNode } from './isLiveQueryOperationDefinitionNode.js';
import { prepareGETUrl } from './prepareGETUrl.js';

export type SyncFetchFn = (
  url: string,
  init?: RequestInit,
  context?: any,
  info?: GraphQLResolveInfo,
) => SyncResponse;
export type SyncResponse = Omit<Response, 'json' | 'text'> & {
  json: () => any;
  text: () => string;
};

export type AsyncFetchFn = (
  url: string,
  options?: RequestInit,
  context?: any,
  info?: GraphQLResolveInfo,
) => Promise<Response> | Response;

export type RegularFetchFn = (url: string) => Promise<Response> | Response;

export type FetchFn = AsyncFetchFn | SyncFetchFn | RegularFetchFn;

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
  headers?: HeadersConfig | ((executorRequest?: ExecutionRequest) => HeadersConfig);
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
  /**
   * WHATWG compatible File implementation
   * @see https://developer.mozilla.org/en-US/docs/Web/API/File
   */
  File?: typeof File;
  /**
   * WHATWG compatible FormData implementation
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FormData
   */
  FormData?: typeof FormData;
}

export type HeadersConfig = Record<string, string>;

export function buildHTTPExecutor(
  options?: Omit<HTTPExecutorOptions, 'fetch'> & { fetch: SyncFetchFn },
): SyncExecutor<any, HTTPExecutorOptions>;

export function buildHTTPExecutor(
  options?: Omit<HTTPExecutorOptions, 'fetch'> & { fetch: AsyncFetchFn },
): AsyncExecutor<any, HTTPExecutorOptions>;

export function buildHTTPExecutor(
  options?: Omit<HTTPExecutorOptions, 'fetch'> & { fetch: RegularFetchFn },
): AsyncExecutor<any, HTTPExecutorOptions>;

export function buildHTTPExecutor(
  options?: Omit<HTTPExecutorOptions, 'fetch'>,
): AsyncExecutor<any, HTTPExecutorOptions>;

export function buildHTTPExecutor(
  options?: HTTPExecutorOptions,
): Executor<any, HTTPExecutorOptions> {
  const executor = async (
    request: ExecutionRequest<any, any, any, HTTPExecutorOptions>,
  ): Promise<ExecutionResult<any, any> | AsyncIterableIterator<ExecutionResult<any, any>>> => {
    const controller = new AbortController();
    const fetchFn = request.extensions?.fetch ?? options?.fetch ?? defaultFetch;
    let method = request.extensions?.method || options?.method || 'POST';

    const operationAst = getOperationASTFromRequest(request);
    const operationType = operationAst.operation;

    if (
      (options?.useGETForQueries || request.extensions?.useGETForQueries) &&
      operationType === 'query'
    ) {
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
      (typeof options?.headers === 'function' ? options.headers(request) : options?.headers) || {},
      request.extensions?.headers || {},
    );

    const query = print(request.document);

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    if (options?.timeout) {
      timeoutId = setTimeout(() => {
        if (!controller.signal.aborted) {
          controller.abort('timeout');
        }
      }, options.timeout);
    }

    let fetching: Response | Promise<Response> | SyncResponse;
    switch (method) {
      case 'GET': {
        const finalUrl = prepareGETUrl({
          baseUrl: endpoint,
          query,
          variables: request.variables,
          operationName: request.operationName,
          extensions: request.extensions,
        });
        const fetchOptions: RequestInit = {
          method: 'GET',
          headers,
          signal: controller.signal,
        };
        if (options?.credentials != null) {
          fetchOptions.credentials = options.credentials;
        }
        fetching = fetchFn(finalUrl, fetchOptions, request.context, request.info);
        break;
      }
      case 'POST': {
        const body = await createFormDataFromVariables(
          {
            query,
            variables: request.variables,
            operationName: request.operationName,
            extensions: request.extensions,
          },
          {
            File: options?.File,
            FormData: options?.FormData,
          },
        );
        if (typeof body === 'string') {
          headers['content-type'] = 'application/json';
        }
        const fetchOptions: RequestInit = {
          method: 'POST',
          body,
          headers,
          signal: controller.signal,
        };
        if (options?.credentials != null) {
          fetchOptions.credentials = options.credentials;
        }
        fetching = fetchFn(endpoint, fetchOptions, request.context, request.info) as any;
        break;
      }
      default:
        throw new Error(`Unsupported request method "${method}"`);
    }

    const responseDetailsForError: {
      status?: number;
      statusText?: string;
    } = {};

    try {
      const response = await fetching;

      responseDetailsForError.status = response.status;
      responseDetailsForError.statusText = response.statusText;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Retry should respect HTTP Errors
      if (options?.retry != null && !response.status.toString().startsWith('2')) {
        throw new Error(response.statusText || `HTTP Error: ${response.status}`);
      }

      let result: ExecutionResult | AsyncIterableIterator<ExecutionResult>;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('text/event-stream')) {
        result = handleEventStreamResponse(response);
      } else if (contentType?.includes('multipart/mixed')) {
        // TODO: should we assert async response?
        result = handleMultipartMixedResponse(response as Response);
      } else {
        const text = await response.text();
        try {
          result = JSON.parse(text);
        } catch (e: any) {
          result = {
            errors: [
              createGraphQLError(`Unexpected response: "${text}"`, {
                extensions: {
                  requestBody: {
                    query,
                    operationName: request.operationName,
                  },
                  responseDetails: responseDetailsForError,
                },
                originalError: e,
              }),
            ],
          };
        }
      }

      return result;
    } catch (e: any) {
      if (typeof e === 'string') {
        return {
          errors: [
            createGraphQLError(e, {
              extensions: {
                requestBody: {
                  query,
                  operationName: request.operationName,
                },
                responseDetails: responseDetailsForError,
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
                requestBody: {
                  query,
                  operationName: request.operationName,
                },
                responseDetails: responseDetailsForError,
              },
              originalError: e,
            }),
          ],
        };
      } else if (e.name === 'AbortError' && controller.signal?.reason) {
        return {
          errors: [
            createGraphQLError('The operation was aborted. Reason: ' + controller.signal.reason, {
              extensions: {
                requestBody: {
                  query,
                  operationName: request.operationName,
                },
                responseDetails: responseDetailsForError,
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
                requestBody: {
                  query,
                  operationName: request.operationName,
                },
                responseDetails: responseDetailsForError,
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
                requestBody: {
                  query,
                  operationName: request.operationName,
                },
                responseDetails: responseDetailsForError,
              },
              originalError: e,
            }),
          ],
        };
      }
    }
  };

  if (options?.retry != null) {
    return function retryExecutor(request: ExecutionRequest) {
      let result: ExecutionResult | AsyncIterableIterator<ExecutionResult>;
      let attempt = 0;
      async function retryAttempt() {
        attempt++;
        if (attempt > options!.retry!) {
          if (result != null) {
            return result;
          }
          return {
            errors: [createGraphQLError('No response returned from fetch')],
          };
        }
        result = await executor(request);
        if (Object(result).errors?.length) {
          return retryAttempt();
        }
        return result;
      }
      return retryAttempt();
    };
  }

  return executor;
}

export { isLiveQueryOperationDefinitionNode };
