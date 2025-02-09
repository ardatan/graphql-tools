import { createSchema, createYoga } from 'graphql-yoga';
import { buildHTTPExecutor } from '@graphql-tools/executor-http';
import { useExecutor } from '@graphql-tools/executor-yoga';
import { patchSymbols } from '@whatwg-node/disposablestack';

patchSymbols();

describe('Yoga Plugin', () => {
  it('should pass the operation correctly', async () => {
    await using actual = createYoga({
      logging: false,
      schema: createSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            hello: String
          }
        `,
        resolvers: {
          Query: {
            hello: () => 'Hello World!',
          },
        },
      }),
    });
    await using executor = buildHTTPExecutor({
      endpoint: 'http://yoga/graphql',
      fetch: actual.fetch,
    });
    await using proxy = createYoga({
      plugins: [useExecutor(executor)],
    });
    const result = await proxy.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          query Greetings {
            hello
          }
        `,
      }),
    });
    const json = await result.json();
    expect(json).toEqual({
      data: {
        hello: 'Hello World!',
      },
    });
  });
});
