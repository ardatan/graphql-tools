import { ExecutionResult } from '@graphql-tools/utils';
import { Response } from '@whatwg-node/fetch';
import { parse } from 'graphql';
import { buildHTTPExecutor } from '../src/index.js';

describe('buildHTTPExecutor', () => {
  it('method should be POST for mutations even if useGETForQueries=true', async () => {
    const executor = buildHTTPExecutor({
      useGETForQueries: true,
      fetch(_url, init) {
        return new Response(JSON.stringify({ data: init }), {
          headers: { 'Content-Type': 'application/json' },
        });
      },
    });

    const mutation = parse(/* GraphQL */ `
      mutation {
        doSomething
      }
    `);

    const res = (await executor({ document: mutation })) as ExecutionResult;
    expect(res.data.method).toBe('POST');
  });
});
