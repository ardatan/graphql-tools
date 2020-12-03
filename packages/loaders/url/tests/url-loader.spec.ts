import '../../../testing/to-be-similar-gql-doc';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { UrlLoader } from '../src';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import nock from 'nock';
import { mockGraphQLServer } from '../../../testing/utils';
import { cwd } from 'process';
import { execute, subscribe, parse, print, ExecutionResult, introspectionFromSchema } from 'graphql';
import { GraphQLUpload } from 'graphql-upload';
import { createReadStream , readFileSync } from 'fs';
import { join } from 'path';
import { useServer } from 'graphql-ws/lib/use/ws';
import { WebSocket, Server as WSServer } from 'mock-socket';

const SHOULD_NOT_GET_HERE_ERROR = 'SHOULD_NOT_GET_HERE';

describe('Schema URL Loader', () => {
  const loader = new UrlLoader();

  const testTypeDefs = /* GraphQL */ `
schema { query: CustomQuery
mutation: Mutation
subscription: Subscription }
"""The \`Upload\` scalar type represents a file upload."""
scalar Upload
"""Test type comment"""
type CustomQuery {
  """Test field comment"""
  a(testVariable: String): String
}
type Mutation {
  uploadFile(file: Upload): File
}
type File {
  filename: String
  mimetype: String
  encoding: String
  content: String
}
type Subscription {
  testMessage: TestMessgae
}
type TestMessgae {
  number: Int
}
`.trim();

  const testResolvers = {
    CustomQuery: {
      a: (_: never, { testVariable }: { testVariable: string }) => testVariable || 'a',
    },
    Upload: GraphQLUpload,
    File: {
      content: (file: any) => {
        const stream: NodeJS.ReadableStream = file.createReadStream();
        return new Promise((resolve, reject) => {
          let data = "";

          // eslint-disable-next-line no-return-assign
          stream.on("data", chunk => data += chunk);
          stream.on("end", () => resolve(data));
          stream.on("error", error => reject(error));
        });
      }
    },
    Mutation: {
      uploadFile: async (_: never, { file }: any) => file
    },
    Subscription: {
      testMessage: {
        subscribe: () => {
          const numbers = [0,1,2];
          const asyncIterator = {
            next: async () => {
              if (numbers.length === 0) {
                return { value: null, done: true };
              }
              const number = numbers.shift();
              return { value: { number }, done: false };
            }
          };

          return {
            // Note that async iterables use `Symbol.asyncIterator`, **not**
            // `Symbol.iterator`.
            [Symbol.asyncIterator]: () => asyncIterator
          };
        },
        resolve: (payload: any) => payload,
      }
    }
  };

  const testSchema = makeExecutableSchema({ typeDefs: testTypeDefs, resolvers: testResolvers });

  const testHost = `http://localhost:3000`;
  const testPath = '/graphql';
  const testPathChecker = (path: string) => {
    return path.startsWith(testPath);
  };
  const testUrl = `${testHost}${testPath}`;

  describe('handle', () => {

    it('Should throw an error when introspection is not valid', async () => {
      const brokenData = { data: {} };
      const scope = nock(testHost).post(testPathChecker).reply(200, brokenData);

      try {
        await loader.load(testUrl, {});
        throw new Error(SHOULD_NOT_GET_HERE_ERROR);
      } catch (e) {
        expect(e.message).not.toBe(SHOULD_NOT_GET_HERE_ERROR);
        expect(e.message).toBe('Could not obtain introspection result, received: ' + JSON.stringify(brokenData));
      }

      scope.done();
    });

    it('Should return a valid schema when request is valid', async () => {
      const server = mockGraphQLServer({ schema: testSchema, host: testHost, path: testPathChecker });

      const schema = await loader.load(testUrl, {});

      server.done();

      expect(schema.schema).toBeDefined();
      expect(printSchemaWithDirectives(schema.schema)).toBe(testTypeDefs);
    });

    it('Should pass default headers', async () => {
      let headers: Record<string, string> = {};

      const server = mockGraphQLServer({
        schema: testSchema,
        host: testHost,
        path: testPathChecker,
        intercept(ctx) {
          headers = ctx.req.headers;
        },
      });

      const schema = await loader.load(testUrl, {});

      server.done();

      expect(schema).toBeDefined();
      expect(schema.schema).toBeDefined();
      expect(printSchemaWithDirectives(schema.schema)).toBe(testTypeDefs);

      expect(headers.accept).toContain(`application/json`);
      expect(headers['content-type']).toContain(`application/json`);
    });

    it('Should pass extra headers when they are specified as object', async () => {
      let headers: Record<string, string> = {};
      const server = mockGraphQLServer({
        schema: testSchema,
        host: testHost,
        path: testPathChecker,
        intercept(ctx) {
          headers = ctx.req.headers;
        },
      });

      const schema = await loader.load(testUrl, { headers: { Auth: '1' } });

      server.done();

      expect(schema).toBeDefined();
      expect(schema.schema).toBeDefined();
      expect(printSchemaWithDirectives(schema.schema)).toBe(testTypeDefs);

      expect(headers.accept).toContain(`application/json`);
      expect(headers['content-type']).toContain(`application/json`);
      expect(headers.auth).toContain(`1`);
    });

    it('Should pass extra headers when they are specified as array', async () => {
      let headers: Record<string, string> = {};
      const server = mockGraphQLServer({
        schema: testSchema,
        host: testHost,
        path: testPathChecker,
        intercept(ctx) {
          headers = ctx.req.headers;
        },
      });
      const schema = await loader.load(testUrl, { headers: [{ A: '1' }, { B: '2', C: '3' }] });

      server.done();

      expect(schema).toBeDefined();
      expect(schema.schema).toBeDefined();
      expect(printSchemaWithDirectives(schema.schema)).toBe(testTypeDefs);

      expect(headers.accept).toContain(`application/json`);
      expect(headers['content-type']).toContain(`application/json`);
      expect(headers.a).toContain(`1`);
      expect(headers.b).toContain(`2`);
      expect(headers.c).toContain(`3`);
    });

    it('Should utilize extra introspection options', async () => {
      const server = mockGraphQLServer({ schema: testSchema, host: testHost, path: testPathChecker });
      const source = await loader.load(testUrl, { descriptions: false });

      server.done();

      expect(source).toBeDefined();
      expect(source.schema.getQueryType().description).toBeUndefined();
    });

    it('Absolute file path should not be accepted as URL', async () => {
      expect(await loader.canLoad(cwd(), {})).toBeFalsy();
    });
    it('should handle useGETForQueries correctly', async () => {
      const server = mockGraphQLServer({ schema: testSchema, host: testHost, path: testPathChecker, method: 'GET' });

      const source = await loader.load(testUrl, {
        descriptions: false,
        useGETForQueries: true,
      });

      server.done();

      const testVariableValue = 'A';

      const server2 = mockGraphQLServer({ schema: testSchema, host: testHost, path: testPathChecker, method: 'GET' });

      const result = await execute({
        schema: source.schema,
        document: parse(/* GraphQL */ `
          query TestQuery($testVariable: String) {
            a(testVariable: $testVariable)
          }
        `),
        variableValues: {
          testVariable: testVariableValue,
        },
      });

      server2.done();

      expect(result?.errors).toBeFalsy();

      expect(result?.data?.a).toBe(testVariableValue);
    });

    it('Should preserve "ws" and "http" in the middle of a pointer', async () => {
      const address = {
        host: 'http://foo.ws:8080',
        path: '/graphql',
      };
      const url = address.host + address.path;
      const server = mockGraphQLServer({ schema: testSchema, host: address.host, path: address.path });
      const result = await loader.load(url, {});

      server.done();

      expect(result.schema).toBeDefined();
      expect(printSchemaWithDirectives(result.schema)).toBe(testTypeDefs);
    });

    it('Should replace ws:// with http:// in buildAsyncExecutor', async () => {
      const address = {
        host: 'ws://foo:8080',
        path: '/graphql',
      };
      const url = address.host + address.path;
      const server = mockGraphQLServer({
        schema: testSchema,
        host: address.host.replace('ws', 'http'),
        path: address.path,
      });
      const result = await loader.load(url, {});

      server.done();

      expect(result.schema).toBeDefined();
      expect(printSchemaWithDirectives(result.schema)).toBeSimilarGqlDoc(testTypeDefs);
    });

    it('Should replace wss:// with https:// in buildAsyncExecutor', async () => {
      const address = {
        host: 'wss://foo:8080',
        path: '/graphql',
      };
      const url = address.host + address.path;
      const server = mockGraphQLServer({
        schema: testSchema,
        host: address.host.replace('wss', 'https'),
        path: address.path,
      });
      const result = await loader.load(url, {});

      server.done();

      expect(result.schema).toBeDefined();
      expect(printSchemaWithDirectives(result.schema)).toBe(testTypeDefs);
    });
    it('should handle .graphql files', async () => {
      const testHost = 'http://localhost:3000';
      const testPath = '/schema.graphql';
      const server = nock(testHost).get(testPath).reply(200, testTypeDefs);
      const result = await loader.load(testHost + testPath, {});

      server.done();

      expect(result.schema).toBeDefined();
      expect(printSchemaWithDirectives(result.schema)).toBeSimilarGqlDoc(testTypeDefs);

      expect(result.document).toBeDefined();
      expect(print(result.document)).toBeSimilarGqlDoc(testTypeDefs);
    })
    it.skip('should handle subscriptions', async (done) => {
      const testUrl = 'ws://localhost:8080';
      const { schema } = await loader.load(testUrl, {
        enableSubscriptions: true,
        customFetch: async () => ({
          json: async () => ({
            data: introspectionFromSchema(testSchema),
          })
        }) as any,
        webSocketImpl: WebSocket,
      });

      const wsServer = new WSServer(testUrl);

      useServer(
        {
          schema, // from the previous step
          execute,
          subscribe,
        },
        wsServer,
      );

      const asyncIterator = await subscribe({
        schema,
        document: parse(/* GraphQL */`
          subscription TestMessage {
            testMessage {
              number
            }
          }
        `),
        contextValue: {},
      }) as AsyncIterableIterator<ExecutionResult>;

      expect(asyncIterator['errors']).toBeFalsy();
      expect(asyncIterator['errors']?.length).toBeFalsy();


      // eslint-disable-next-line no-inner-declarations
      async function getNextResult() {
        const result = await asyncIterator.next();
        expect(result?.done).toBeFalsy();
        return result?.value?.data?.testMessage?.number;
      }

      expect(await getNextResult()).toBe(0);
      expect(await getNextResult()).toBe(1);
      expect(await getNextResult()).toBe(2);

      await asyncIterator.return();
      wsServer.stop(done);
    });
    it('should handle multipart requests', async () => {
      let server = mockGraphQLServer({ schema: testSchema, host: testHost, path: testPathChecker, method: 'POST' });

      const { schema } = await loader.load(testUrl, {
        multipart: true,
      });

      server.done();

      server = mockGraphQLServer({ schema: testSchema, host: testHost, path: testPathChecker, method: 'POST' })

      const fileName = 'testfile.txt';

      const absoluteFilePath = join(__dirname, fileName);

      const result = await execute({
        schema,
        document: parse(/* GraphQL */`
          mutation UploadFile($file: Upload!) {
            uploadFile(file: $file) {
              filename
              content
            }
          }
        `),
        variableValues: {
          file: createReadStream(absoluteFilePath),
        },
      })

      server.done();

      const content = readFileSync(absoluteFilePath, 'utf8')

      expect(result.errors).toBeFalsy();
      expect(result.data.uploadFile?.filename).toBe(fileName);
      expect(result.data.uploadFile?.content).toBe(content);
    });
  });
});
