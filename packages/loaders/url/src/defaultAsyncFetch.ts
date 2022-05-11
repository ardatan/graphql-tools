import { fetch } from 'cross-undici-fetch';

export type AsyncFetchFn = typeof fetch;
export const defaultAsyncFetch: AsyncFetchFn = async (input, init) => {
  return fetch(input, init);
};
