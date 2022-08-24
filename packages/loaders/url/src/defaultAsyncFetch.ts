import { fetch } from '@whatwg-node/fetch';
import { GraphQLResolveInfo } from 'graphql';

export type AsyncFetchFn = (
  url: string,
  options?: RequestInit,
  context?: any,
  info?: GraphQLResolveInfo
) => Promise<Response>;
export const defaultAsyncFetch: AsyncFetchFn = async (input, init) => {
  return fetch(input, init);
};
