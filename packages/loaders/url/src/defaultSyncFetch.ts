import syncFetchImported from '@ardatan/sync-fetch';
import { SyncFetchFn, SyncResponse } from '@graphql-tools/executor-http';

export const defaultSyncFetch: SyncFetchFn = (input: RequestInfo, init?: RequestInit): SyncResponse => {
  if (typeof input === 'string') {
    delete init?.signal;
  } else {
    delete (input as any).signal;
  }
  return syncFetchImported(input, init);
};
