import { buildHTTPExecutor } from '@graphql-tools/executor-http';
import { parse } from 'graphql';
import { createYoga, createSchema } from 'graphql-yoga';
import { Http2SecureServer, createSecureServer } from 'http2'; // change this to http and it works.
import { AddressInfo } from 'net';
import pem from 'pem';

describe('fetch-h2 compatibility', () => {
  const schema = createSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        echo(message: String): String
      }
    `,
    resolvers: {
      Query: {
        echo: (_, { message }) => `echo: ${message}`,
      },
    },
  });

  const yoga = createYoga({
    schema,
    graphqlEndpoint: '/graphql',
  });

  let server: Http2SecureServer;

  beforeAll(done => {
    pem.createCertificate({ days: 1, selfSigned: true }, (err, keys) => {
      if (err) {
        throw err;
      }
      server = createSecureServer(
        {
          key: keys.serviceKey,
          cert: keys.certificate,
          allowHTTP1: true,
        },
        yoga
      ).listen(0, done);
    });
  });

  afterAll(done => {
    server.close(done);
  });

  it('make a request to a yoga server', async () => {
    const executor = buildHTTPExecutor({
      endpoint: `https://localhost:${(server.address() as AddressInfo).port}/graphql`,
    });

    const resp = await executor({
      document: parse(`{ echo(message: "hello") }`),
    });

    expect(resp).toEqual({ data: { echo: 'echo: hello' } });
  });
});
