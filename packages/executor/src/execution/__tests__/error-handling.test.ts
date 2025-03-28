import { createServer, Server } from 'http';
import { AddressInfo } from 'net';
import { parse } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createGraphQLError, isAsyncIterable } from '@graphql-tools/utils';
import { normalizedExecutor } from '../normalizedExecutor';

describe('Error Handling', () => {
  it('handles errors that are not Error instance', async () => {
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          throwMe: String
        }
      `,
      resolvers: {
        Query: {
          throwMe: () => {
            throw 'This is not an error instance';
          },
        },
      },
    });
    const result = await normalizedExecutor({
      schema,
      document: parse(/* GraphQL */ `
        query {
          throwMe
        }
      `),
    });
    if (isAsyncIterable(result)) {
      throw new Error('Expected a result, but got an async iterable');
    }
    expect(result.errors?.[0]?.message).toBe('This is not an error instance');
  });
  if (globalThis.fetch != null) {
    let server: Server | undefined;
    afterEach(async () => {
      if (!server?.listening) {
        return;
      }
      if (!globalThis.Bun) {
        server.closeAllConnections();
      }
      await new Promise<void>((resolve, reject) => {
        if (!server) {
          return resolve();
        }
        server.close(err => (err ? reject(err) : resolve()));
        server = undefined;
      });
    });
    it('handles undici fetch JSON parsing errors', async () => {
      server = createServer((_, res) => {
        res.end('{ "myData": "foo"');
      });
      await new Promise<void>(resolve => {
        if (!server) {
          throw new Error('Server is not initialized');
        }
        server.listen(0, resolve);
      });
      const serverPort = (server.address() as AddressInfo).port;
      const schema = makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            myData: String
          }
        `,
        resolvers: {
          Query: {
            myData: async () => {
              const response = await fetch('http://localhost:' + serverPort);
              const resJson = await response.json();
              return resJson.myData;
            },
          },
        },
      });
      const result = await normalizedExecutor({
        schema,
        document: parse(/* GraphQL */ `
          query {
            myData
          }
        `),
      });
      if (isAsyncIterable(result)) {
        throw new Error('Expected a result, but got an async iterable');
      }
      const errorMessage = result.errors?.[0]?.message;
      if (globalThis.Bun) {
        expect(errorMessage).toBeTruthy();
      } else if (process.versions['node'].startsWith('18.')) {
        expect(errorMessage).toBe('Unexpected end of JSON input');
      } else {
        expect(errorMessage).toContain(
          "Expected ',' or '}' after property value in JSON at position 17",
        );
      }
    });
  }
  it('handles aggregated errors', async () => {
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          throwMe: String
        }
      `,
      resolvers: {
        Query: {
          throwMe: () =>
            new AggregateError(
              [new Error('This is an error'), new Error('This is another error')],
              'This is an aggregated error',
            ),
        },
      },
    });
    const result = await normalizedExecutor({
      schema,
      document: parse(/* GraphQL */ `
        query {
          throwMe
        }
      `),
    });
    if (isAsyncIterable(result)) {
      throw new Error('Expected a result, but got an async iterable');
    }
    expect(JSON.parse(JSON.stringify(result))).toEqual({
      data: {
        throwMe: null,
      },
      errors: [
        {
          locations: [
            {
              column: 11,
              line: 3,
            },
          ],
          message: 'This is an error',
          path: ['throwMe'],
        },
        {
          locations: [
            {
              column: 11,
              line: 3,
            },
          ],
          message: 'This is another error',
          path: ['throwMe'],
        },
      ],
    });
  });
});
