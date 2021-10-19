import { fetch as crossFetch } from 'cross-fetch';

export type AsyncFetchFn = typeof crossFetch;
export const defaultAsyncFetch: AsyncFetchFn = async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
  if (typeof fetch !== 'undefined') {
    return fetch(input, init);
  }
  return crossFetch(input, init);
};
