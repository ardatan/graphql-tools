import syncFetchImported from '@ardatan/sync-fetch';

export const defaultSyncFetch: SyncFetchFn = (input: RequestInfo, init?: RequestInit): SyncResponse => {
  if (typeof input === 'string') {
    delete init?.signal;
  } else {
    delete (input as any).signal;
  }
  return syncFetchImported(input, init);
};

export type SyncFetchFn = (input: RequestInfo, init?: RequestInit) => SyncResponse;
export type SyncResponse = Omit<Response, 'json' | 'text'> & {
  json: () => any;
  text: () => string;
};
