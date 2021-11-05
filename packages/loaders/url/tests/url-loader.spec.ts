import '../../../testing/to-be-similar-gql-doc';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { SubscriptionProtocol, UrlLoader } from '../src';
import { isAsyncIterable, printSchemaWithDirectives } from '@graphql-tools/utils';
import { cwd } from 'process';
import { execute, subscribe, parse, print, ExecutionResult, introspectionFromSchema, getIntrospectionQuery, getOperationAST } from 'graphql';
import { GraphQLUpload, graphqlUploadExpress } from 'graphql-upload';
import { createReadStream, readFileSync, } from 'fs';
import { join } from 'path';
import { useServer } from 'graphql-ws/lib/use/ws';
import { createHandler } from 'graphql-sse';
import { Server as WSServer } from 'ws';
import http from 'http';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import { defaultAsyncFetch } from '../src/defaultAsyncFetch';
import { Response } from 'cross-undici-fetch';
import express from 'express';
import { graphqlHTTP } from 'express-graphql';

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
  uploadFile(file: Upload, dummyVar: TestInput, secondDummyVar: String): File
}
type File {
  filename: String
  mimetype: String
  encoding: String
  content: String
}
type Subscription {
  testMessage: TestMessage
}
type TestMessage {
  number: Int
}
input TestInput {
  testField: String
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
          const numbers = [0, 1, 2];
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
  const testUrl = `${testHost}${testPath}`;

  function assertNonMaybe<T>(input: T): asserts input is Exclude<T, null | undefined> {
    if (input == null) {
      throw new Error("Value should be neither null nor undefined.")
    }
  }

  let httpServer: http.Server;

  afterEach(async () => {
    if (httpServer !== undefined) {
      await new Promise<void>(resolve => httpServer.close(() => resolve()))
    }
  })

  describe('handle', () => {

    it('Should throw an error when introspection is not valid', async () => {
      const brokenData = { data: {} };

      expect.assertions(1);

      try {
        await loader.load(testUrl, {
          customFetch: async () => {
            return new Response(JSON.stringify(brokenData))
          }
        });
      } catch (e: any) {
        expect(e.message).toBe('Could not obtain introspection result, received: ' + JSON.stringify(brokenData))
      }
    });

    it('Should return a valid schema when request is valid', async () => {
      const [source] = await loader.load(testUrl, {
        customFetch: async () => {
          return new Response(JSON.stringify({
            data: introspectionFromSchema(testSchema)
          }))
        }
      });
      assertNonMaybe(source.schema)
      expect(printSchemaWithDirectives(source.schema)).toBeSimilarGqlDoc(testTypeDefs);
    });

    it('Should pass default headers', async () => {
      let headers: HeadersInit = {};

      const [source] = await loader.load(testUrl, {
        customFetch: async (_, opts) => {
          headers = opts?.headers || {};
          return new Response(JSON.stringify({
            data: introspectionFromSchema(testSchema)
          }))
        }
      });

      expect(source).toBeDefined();
      assertNonMaybe(source.schema)
      expect(printSchemaWithDirectives(source.schema)).toBeSimilarGqlDoc(testTypeDefs);

      expect(Array.isArray(headers['accept']) ? headers['accept'].join(',') : headers['accept']).toContain(`application/json`);
      expect(headers['content-type']).toContain(`application/json`);
    });

    it('Should pass extra headers when they are specified as object', async () => {
      let headers: HeadersInit = {};

      const [source] = await loader.load(testUrl, {
        headers: { auth: '1' },
        customFetch: async (_, opts) => {
          headers = opts?.headers || {};
          return new Response(JSON.stringify({
            data: introspectionFromSchema(testSchema)
          }))
        }
      });

      expect(source).toBeDefined();
      assertNonMaybe(source.schema)
      expect(printSchemaWithDirectives(source.schema)).toBeSimilarGqlDoc(testTypeDefs);

      expect(Array.isArray(headers['accept']) ? headers['accept'].join(',') : headers['accept']).toContain(`application/json`);
      expect(headers['content-type']).toContain(`application/json`);
      expect(headers['auth']).toContain(`1`);
    });

    it('Should utilize extra introspection options', async () => {
      const introspectionOptions = {
        descriptions: false
      }
      const [source] = await loader.load(testUrl, {
        ...introspectionOptions,
        customFetch: async (_, opts) => {
          const receivedBody = JSON.parse(opts?.body?.toString() || '{}');
          const receivedAST = parse(receivedBody.query, {
            noLocation: true,
          });
          const expectedAST = parse(getIntrospectionQuery(introspectionOptions), {
            noLocation: true,
          })
          expect(receivedAST).toMatchObject(expectedAST);
          return new Response(JSON.stringify({
            data: introspectionFromSchema(testSchema, introspectionOptions)
          }))
        }
      });

      expect(source).toBeDefined();
      assertNonMaybe(source.schema)
      expect(source.schema.getQueryType()!.description).toBeUndefined();
    });

    it('Absolute file path should not be accepted as URL', async () => {
      expect(await loader.canLoad(cwd(), {})).toBeFalsy();
    });
    it('should handle useGETForQueries correctly', async () => {
      const [source] = await loader.load(testUrl, {
        descriptions: false,
        useGETForQueries: true,
        customFetch: async (url, opts) => {
          expect(opts?.method).toBe('GET');
          const { searchParams } = new URL(url.toString());
          const receivedQuery = searchParams.get('query')!;
          const receivedAST = parse(receivedQuery, {
            noLocation: true,
          });
          const receivedOperationName = searchParams.get('operationName');
          const receivedVariables = JSON.parse(searchParams.get('variables') || '{}');
          const operationAST = getOperationAST(receivedAST, receivedOperationName);
          expect(operationAST?.operation).toBe('query');
          const responseBody = JSON.stringify(
            await execute({
              schema: testSchema,
              document: receivedAST,
              operationName: receivedOperationName,
              variableValues: receivedVariables,
            })
          )
          return new Response(responseBody);
        }
      });

      const testVariableValue = 'A';

      assertNonMaybe(source.schema)
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

      expect(result?.errors).toBeFalsy();

      expect(result?.data?.['a']).toBe(testVariableValue);

      // 2 requests done; one for introspection and second for the actual query
      expect.assertions(6);
    });

    it('Should preserve "ws" and "http" in the middle of a pointer', async () => {
      const address = {
        host: 'http://foo.ws:8080',
        path: '/graphql',
      };
      const url = address.host + address.path;
      await loader.load(url, {
        customFetch: async url => {
          expect(url.toString()).toBe(address.host + address.path);
          return new Response(JSON.stringify({
            data: introspectionFromSchema(testSchema)
          }));
        }
      });
      expect.assertions(1);
    });

    it('Should replace ws:// with http:// in buildAsyncExecutor', async () => {
      const address = {
        host: 'ws://foo:8080',
        path: '/graphql',
      };
      const url = address.host + address.path;
      await loader.load(url, {
        customFetch: async url => {
          expect(url.toString()).toBe('http://foo:8080/graphql');
          return new Response(JSON.stringify({
            data: introspectionFromSchema(testSchema)
          }));
        }
      });
      expect.assertions(1);
    });

    it('Should replace wss:// with https:// in buildAsyncExecutor', async () => {
      const address = {
        host: 'wss://foo:8080',
        path: '/graphql',
      };
      const url = address.host + address.path;
      await loader.load(url, {
        customFetch: async url => {
          expect(url.toString()).toBe('https://foo:8080/graphql');
          return new Response(JSON.stringify({
            data: introspectionFromSchema(testSchema)
          }));
        }
      });
      expect.assertions(1);
    });
    it('should handle .graphql files', async () => {
      const testHost = 'http://localhost:3000';
      const testPath = '/schema.graphql';
      const [result] = await loader.load(testHost + testPath, {
        customFetch: async () => {
          return new Response(testTypeDefs);
        }
      });

      assertNonMaybe(result.document)
      expect(print(result.document)).toBeSimilarGqlDoc(testTypeDefs);
    })
    it('should handle results with handleAsSDL option even if it doesn\'t end with .graphql', async () => {
      const testHost = 'http://localhost:3000';
      const testPath = '/sdl';

      const [result] = await loader.load(testHost + testPath, {
        handleAsSDL: true,
        customFetch: async () => {
          return new Response(testTypeDefs);
        }
      });

      assertNonMaybe(result.document)
      expect(print(result.document)).toBeSimilarGqlDoc(testTypeDefs);
    })
    it('should handle subscriptions - new graphql-ws', async () => {
      const testUrl = 'http://localhost:8081/graphql';
      const [{ schema }] = await loader.load(testUrl, {
        customFetch: async () => new Response(JSON.stringify({
          data: introspectionFromSchema(testSchema)
        }), {
          headers: {
            'content-type': 'application/json'
          }
        }),
        subscriptionsProtocol: SubscriptionProtocol.WS
      });

      httpServer = http.createServer(function weServeSocketsOnly(_, res) {
        res.writeHead(404);
        res.end();
      });

      const wsServer = new WSServer({
        server: httpServer,
        path: '/graphql'
      });

      const subscriptionServer = useServer(
        {
          schema: testSchema, // from the previous step
          execute,
          subscribe,
        },
        wsServer,
      );

      httpServer.listen(8081);
      assertNonMaybe(schema)
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

      await asyncIterator.return!();
      await subscriptionServer.dispose();
    });
    it('should handle subscriptions - legacy subscriptions-transport-ws', async () => {
      const testUrl = 'http://localhost:8081/graphql';
      const [{ schema }] = await loader.load(testUrl, {
        customFetch: async () => new Response(JSON.stringify({
          data: introspectionFromSchema(testSchema)
        }), {
          headers: {
            'content-type': 'application/json'
          }
        }),
        subscriptionsProtocol: SubscriptionProtocol.LEGACY_WS
      });

      httpServer = http.createServer(function weServeSocketsOnly(_, res) {
        res.writeHead(404);
        res.end();
      });


      httpServer.listen(8081);

      const subscriptionServer = SubscriptionServer.create(
        {
          schema: testSchema,
          execute,
          subscribe,
        },
        {
          server: httpServer,
          path: '/graphql',
        },
      );
      assertNonMaybe(schema)
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

      await asyncIterator.return!();
      subscriptionServer.close();
    });
    it('should handle subscriptions - graphql-sse', async () => {
      const testUrl = 'http://localhost:8081/graphql';

      const [{ schema }] = await loader.load(testUrl, {
        customFetch: async (url, options) => {
          if (String(options?.body).includes('IntrospectionQuery')) {
            return new Response(JSON.stringify({
              data: introspectionFromSchema(testSchema)
            }), {
              headers: {
                'content-type': 'application/json'
              }
            })
          }
          return defaultAsyncFetch(url, options);
        },
        subscriptionsProtocol: SubscriptionProtocol.GRAPHQL_SSE
      });

      httpServer = http.createServer(createHandler({
        schema: testSchema,
      }));
      httpServer.listen(8081);

      assertNonMaybe(schema)
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

      await asyncIterator.return!();
    })
    it('should handle file uploads', async () => {

      const app = express();
      app.use(testPath, graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 10 }), graphqlHTTP({
        schema: testSchema,
      }));

      httpServer = http.createServer(app);
      httpServer.listen(3000);

      const [{ schema }] = await loader.load(testUrl, {
        multipart: true,
      });

      const fileName = 'testfile.txt';

      const absoluteFilePath = join(__dirname, fileName);

      const content = readFileSync(absoluteFilePath, 'utf8')
      assertNonMaybe(schema)
      const undici = require('undici');
      const result = await execute({
        schema,
        document: parse(/* GraphQL */`
          mutation UploadFile($file: Upload!, $nullVar: TestInput, $nonObjectVar: String) {
            uploadFile(file: $file, dummyVar: $nullVar, secondDummyVar: $nonObjectVar) {
              filename
              content
            }
          }
        `),
        variableValues: {
          file: undici.File ? new undici.File([content], fileName, { type: 'text/plain' }) : createReadStream(absoluteFilePath),
          nullVar: null,
          nonObjectVar: 'somefilename.txt'
        },
      })

      expect(result.errors).toBeFalsy();
      assertNonMaybe(result.data)
      const uploadFileData: any = result.data?.['uploadFile'];
      expect(uploadFileData?.filename).toBe(fileName);
      expect(uploadFileData?.content).toBe(content);
    });

    describe("helix compat", () => {
      it("should handle helix multipart response result", async () => {
        const chunkDatas = [
          { data: { foo: {} }, hasNext: true },
          { data: { a: 1 }, path: ["foo"], hasNext: true },
          { data: { a: 1, b: 2 }, path: ["foo"], hasNext: false }
        ];
        const expectedDatas: ExecutionResult[] = [
          {
            data: {
              foo: {}
            }
          },
          {
            data: {
              foo: {
                a: 1
              }
            }
          },
          {
            data: {
              foo: {
                a: 1,
                b: 2
              }
            }
          }
        ];
        const serverPort = 1335;
        const serverHost = "http://localhost:" + serverPort;
        httpServer = http.createServer((_, res) => {
          res.writeHead(200, {
            // prettier-ignore
            "Connection": "keep-alive",
            "Content-Type": 'multipart/mixed; boundary="-"',
            "Transfer-Encoding": "chunked",
          });

          res.write(`---`);

          chunkDatas.forEach(chunkData => sleep(300).then(() => {
            const chunk = Buffer.from(JSON.stringify(chunkData), "utf8");
            const data = ["", "Content-Type: application/json; charset=utf-8", "", chunk, "", `---`];
            res.write(data.join("\r\n"));
          }));

          sleep(1000).then(() => {
            res.write("\r\n-----\r\n");
            res.end();
          });
        });
        await new Promise<void>((resolve) => httpServer.listen(serverPort, resolve));

        const executor = await loader.getExecutorAsync(serverHost);
        const result = await executor({
          document: parse(/* GraphQL */ `
            query {
              foo {
                ... on Foo @defer {
                  a
                  b
                }
              }
            }
          `)
        });

        assertAsyncIterable(result);
        for await (const data of result) {
          expect(data).toEqual(expectedDatas.shift()!);
        }
        expect(expectedDatas.length).toBe(0);
      });

      it("should handle SSE subscription result", async () => {
        const expectedDatas: ExecutionResult[] = [
          { data: { foo: 1 } },
          { data: { foo: 2 } },
          { data: { foo: 3 } }
        ];
        const serverPort = 1336;
        const serverHost = "http://localhost:" + serverPort;

        httpServer = http.createServer((_, res) => {
          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            // prettier-ignore
            "Connection": "keep-alive",
            "Cache-Control": "no-cache",
          });

          expectedDatas.forEach(result => sleep(300).then(() => res.write(`data: ${JSON.stringify(result)}\n\n`)));

          sleep(1000).then(() => res.end());
        });

        await new Promise<void>((resolve) => httpServer.listen(serverPort, () => resolve()));

        const executor = await loader.getExecutorAsync(`${serverHost}/graphql`, {
          subscriptionsProtocol: SubscriptionProtocol.SSE
        });
        const result = await executor({
          document: parse(/* GraphQL */ ` subscription { foo } `)
        })
        assertAsyncIterable(result)

        for await (const singleResult of result) {
          expect(singleResult).toStrictEqual(expectedDatas.shift()!);
        }
        expect(expectedDatas.length).toBe(0);
      })
      it("terminates SSE subscriptions when calling return on the AsyncIterable", async () => {
        const sentDatas: ExecutionResult[] = [
          { data: { foo: 1 } },
          { data: { foo: 2 } },
          { data: { foo: 3 } },
          { data: { foo: 4 } }
        ];
        const serverPort = 1336;
        const serverHost = "http://localhost:" + serverPort;

        let serverResponseEnded$: Promise<boolean>;
        httpServer = http.createServer((_, res) => {
          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            // prettier-ignore
            "Connection": "keep-alive",
            "Cache-Control": "no-cache",
          });

          const ping = setInterval(() => {
            // Ping
            res.write(':\n\n');
          }, 50);
          sentDatas.forEach(result => sleep(300).then(() => res.write(`data: ${JSON.stringify(result)}\n\n`)));
          serverResponseEnded$ = new Promise(resolve => res.once('close', () => {
            resolve(true);
            clearInterval(ping);
          }));
        });

        await new Promise<void>((resolve) => httpServer.listen(serverPort, () => resolve()));

        const executor = await loader.getExecutorAsync(`${serverHost}/graphql`, {
          subscriptionsProtocol: SubscriptionProtocol.SSE
        });
        const result = await executor({
          document: parse(/* GraphQL */ ` subscription { foo } `)
        })
        assertAsyncIterable(result)

        const firstResult = await result.next();
        expect(firstResult.value).toStrictEqual(sentDatas[0]);
        const secondResult = await result.next();
        expect(secondResult.value).toStrictEqual(sentDatas[1]);
        // Stop the request
        await result.return!();
        const doneResult = await result.next();
        expect(doneResult).toStrictEqual({ done: true, value: undefined });
        expect(await serverResponseEnded$!).toBe(true);
      })
    })
  });
});


function assertAsyncIterable(input: unknown): asserts input is AsyncIterable<any> {
  if (isAsyncIterable(input)) {
    return
  }
  throw new Error("Expected AsyncIterable.")
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
