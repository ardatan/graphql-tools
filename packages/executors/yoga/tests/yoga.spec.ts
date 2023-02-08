import { buildHTTPExecutor } from '@graphql-tools/executor-http';
import { useExecutor } from '@graphql-tools/executor-yoga';
import { createSchema, createYoga } from 'graphql-yoga';

describe('Yoga Plugin', () => {
  const actual = createYoga({
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
  const executor = buildHTTPExecutor({
    fetch: actual.fetch,
  });
  const proxy = createYoga({
    plugins: [useExecutor(executor)],
  });
  it('should pass the operation correctly', async () => {
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
