import { parse } from 'graphql';
import { buildHTTPExecutor, SyncFetchFn } from '../src/index.js';

describe('buildHTTPExecutor', () => {
  it('should be a GET operation when useGETForQueries=true', async () => {
    const syncFetch: SyncFetchFn = (input, init) => {
      return {
        ...new Response(),
        url: input,
        headers: new Headers(init?.headers),
        text: () => JSON.stringify({ data: init }),
      };
    };

    const executor = buildHTTPExecutor({
      useGETForQueries: true,
      fetch: syncFetch,
    });

    const mutation = parse(/* GraphQL */ `
      mutation {
        doSomething
      }
    `);

    const res = executor({ document: mutation });
    expect(res.data.method).toBe('POST');
  });
});
