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
  it('handle unexpected json responses', async () => {
    const executor = buildHTTPExecutor({
      fetch: () => new Response('NOT JSON'),
    });
    const result = await executor({
      document: parse(/* GraphQL */ `
        query {
          hello
        }
      `),
    });
    expect(result).toMatchObject({
      errors: [
        {
          message: 'Unexpected response: "NOT JSON"',
        },
      ],
    });
  });
  it('handle responses other than 2XX', async () => {
    const executor = buildHTTPExecutor({
      fetch: (_url, init) => new Response(JSON.stringify({ data: init }), { status: 500 }),
    });
    const result = await executor({
      document: parse(/* GraphQL */ `
        query {
          hello
        }
      `),
    });
    expect(result).toMatchObject({
      errors: [
        {
          message: 'Internal Server Error',
        },
      ],
    });
  });
});
