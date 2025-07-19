import { AsyncFetchFn } from '@graphql-tools/executor-http';
import { fetch } from '@whatwg-node/fetch';

export const defaultAsyncFetch: AsyncFetchFn = fetch;
