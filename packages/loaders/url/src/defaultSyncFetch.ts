import syncFetchImported from '@ardatan/sync-fetch';
import { GraphQLResolveInfo } from 'graphql';

export const defaultSyncFetch: SyncFetchFn = (input: RequestInfo, init?: RequestInit): SyncResponse => {
  if (typeof input === 'string') {
    delete init?.signal;
  } else {
    delete (input as any).signal;
  }
  return syncFetchImported(input, init);
};

export type SyncFetchFn = (url: string, init?: RequestInit, context?: any, info?: GraphQLResolveInfo) => SyncResponse;
export type SyncResponse = Omit<Response, 'json' | 'text'> & {
  json: () => any;
  text: () => string;
};
