import { createServer, Server } from 'http';
import { AddressInfo } from 'net';
import { parse } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { isAsyncIterable } from '@graphql-tools/utils';
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
    let server: Server;
    afterEach(done => {
      if (!server) {
        done();
        return;
      }
      server.closeAllConnections();
      server.close(done);
    });
    it('handles undici fetch JSON parsing errors', async () => {
      server = createServer((_, res) => {
        res.end('{ "myData": "foo"');
      });
      await new Promise<void>(resolve => {
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
      expect(result.errors?.[0]?.message).toBe(
        "Expected ',' or '}' after property value in JSON at position 17",
      );
    });
  }
});
