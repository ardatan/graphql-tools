import { fetch } from 'cross-undici-fetch';

export type AsyncFetchFn = typeof fetch;
export const defaultAsyncFetch: AsyncFetchFn = async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
  return fetch(input, init);
};
