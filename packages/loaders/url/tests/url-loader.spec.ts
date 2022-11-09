import '../../../testing/to-be-similar-gql-doc';
import { SubscriptionProtocol, UrlLoader } from '../src/index.js';
import { ExecutionResult, printSchemaWithDirectives } from '@graphql-tools/utils';
import { parse, print, introspectionFromSchema, getIntrospectionQuery, getOperationAST } from 'graphql';
import { useServer } from 'graphql-ws/lib/use/ws';
import { createHandler } from 'graphql-sse';
import { Server as WSServer } from 'ws';
import http from 'http';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import { defaultAsyncFetch } from '../src/defaultAsyncFetch.js';
import { Response, Headers } from '@whatwg-node/fetch';
import { loadSchema } from '@graphql-tools/load';
import { testUrl, testSchema, testTypeDefs, assertNonMaybe } from './test-utils';
import { execute, isIncrementalResult, subscribe } from '@graphql-tools/executor';
import { AsyncFetchFn } from '@graphql-tools/executor-http';

describe('Schema URL Loader', () => {
  const loader = new UrlLoader();

  let httpServer: http.Server;

  afterEach(async () => {
    if (httpServer !== undefined) {
      await new Promise<void>(resolve => httpServer.close(() => resolve()));
    }
  });

  it('Should throw an error when introspection is not valid', async () => {
    const brokenData = { data: {} };

    expect.assertions(1);

    try {
      await loader.load(testUrl, {
        customFetch: async () => {
          return new Response(JSON.stringify(brokenData));
        },
      });
    } catch (e: any) {
      expect(e.message).toBe(
        'Could not obtain introspection result, received the following as response; \n { data: {} }'
      );
    }
  });

  it('Should return a valid schema when request is valid', async () => {
    const [source] = await loader.load(testUrl, {
      customFetch: async () => {
        return new Response(
          JSON.stringify({
            data: introspectionFromSchema(testSchema),
          })
        );
      },
    });
    assertNonMaybe(source.schema);
    expect(printSchemaWithDirectives(source.schema)).toBeSimilarGqlDoc(testTypeDefs);
  });

  it('Should pass default headers', async () => {
    let headers: HeadersInit = {};
    const customFetch: AsyncFetchFn = async (_, opts) => {
      headers = opts?.headers || {};
      return new Response(
        JSON.stringify({
          data: introspectionFromSchema(testSchema),
        })
      );
    };

    const [source] = await loader.load(testUrl, {
      customFetch,
    });

    expect(source).toBeDefined();
    assertNonMaybe(source.schema);
    expect(printSchemaWithDirectives(source.schema)).toBeSimilarGqlDoc(testTypeDefs);

    expect(Array.isArray(headers['accept']) ? headers['accept'].join(',') : headers['accept']).toContain(
      `application/json`
    );
  });

  it('Should pass extra headers when they are specified as object', async () => {
    let headers: HeadersInit = {};
    const customFetch: AsyncFetchFn = async (_, opts) => {
      headers = opts?.headers || {};
      return new Response(
        JSON.stringify({
          data: introspectionFromSchema(testSchema),
        })
      );
    };

    const [source] = await loader.load(testUrl, {
      headers: { auth: '1' },
      customFetch,
    });

    expect(source).toBeDefined();
    assertNonMaybe(source.schema);
    expect(printSchemaWithDirectives(source.schema)).toBeSimilarGqlDoc(testTypeDefs);

    expect(Array.isArray(headers['accept']) ? headers['accept'].join(',') : headers['accept']).toContain(
      `application/json`
    );
    expect(headers['auth']).toContain(`1`);
  });

  it('Should utilize extra introspection options', async () => {
    const introspectionOptions = {
      descriptions: false,
    };
    const customFetch: AsyncFetchFn = async (_, opts) => {
      const receivedBody = JSON.parse(opts?.body?.toString() || '{}');
      const receivedAST = parse(receivedBody.query, {
        noLocation: true,
      });
      const expectedAST = parse(getIntrospectionQuery(introspectionOptions), {
        noLocation: true,
      });
      expect(receivedAST).toMatchObject(expectedAST);
      return new Response(
        JSON.stringify({
          data: introspectionFromSchema(testSchema, introspectionOptions),
        })
      );
    };

    const [source] = await loader.load(testUrl, {
      ...introspectionOptions,
      customFetch,
    });

    expect(source).toBeDefined();
    assertNonMaybe(source.schema);
    expect(source.schema.getQueryType()!.description).toBeUndefined();
  });

  it('should handle useGETForQueries correctly', async () => {
    const customFetch: AsyncFetchFn = async (url, opts) => {
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
      );
      return new Response(responseBody);
    };

    const [source] = await loader.load(testUrl, {
      descriptions: false,
      useGETForQueries: true,
      customFetch,
    });

    const testVariableValue = 'A';

    assertNonMaybe(source.schema);
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

    if (isIncrementalResult(result)) throw Error('result is incremental');

    expect(result?.errors).toBeFalsy();

    expect(result?.data?.['a']).toBe(testVariableValue);

    // 2 requests done; one for introspection and second for the actual query
    expect.assertions(6);
  });

  it('should respect dynamic values given in extensions', async () => {
    const customFetch: AsyncFetchFn = async (info, init) => {
      expect(info.toString()).toBe('DYNAMIC_ENDPOINT');
      expect(new Headers(init?.headers).get('TEST_HEADER')).toBe('TEST_HEADER_VALUE');
      return new Response(
        JSON.stringify({
          data: introspectionFromSchema(testSchema),
        })
      );
    };

    const executor = loader.getExecutorAsync('SOME_ENDPOINT', {
      customFetch,
    });
    await executor({
      document: parse(getIntrospectionQuery()),
      extensions: {
        endpoint: 'DYNAMIC_ENDPOINT',
        headers: {
          TEST_HEADER: 'TEST_HEADER_VALUE',
        },
      },
    });
    expect.assertions(2);
  });

  it('Should preserve "ws" and "http" in the middle of a pointer', async () => {
    const address = {
      host: 'http://foo.ws:8080',
      path: '/graphql',
    };
    const url = address.host + address.path;
    const customFetch: AsyncFetchFn = async url => {
      const urlObj = new URL(url.toString());
      expect(urlObj.protocol).toBe('http:');
      expect(urlObj.hostname).toBe('foo.ws');
      expect(urlObj.port).toBe('8080');
      expect(urlObj.pathname).toBe('/graphql');
      return new Response(
        JSON.stringify({
          data: introspectionFromSchema(testSchema),
        })
      );
    };

    await loader.load(url, {
      customFetch,
    });
    expect.assertions(4);
  });

  it('Should replace ws:// with http:// in buildAsyncExecutor', async () => {
    const address = {
      host: 'ws://foo:8080',
      path: '/graphql',
    };
    const customFetch: AsyncFetchFn = async url => {
      const urlObj = new URL(url.toString());
      expect(urlObj.protocol).toBe('http:');
      expect(urlObj.hostname).toBe('foo');
      expect(urlObj.port).toBe('8080');
      expect(urlObj.pathname).toBe('/graphql');
      return new Response(
        JSON.stringify({
          data: introspectionFromSchema(testSchema),
        })
      );
    };

    const url = address.host + address.path;
    await loader.load(url, {
      customFetch,
    });
    expect.assertions(4);
  });

  it('Should replace wss:// with https:// in buildAsyncExecutor', async () => {
    const address = {
      host: 'wss://foo:8080',
      path: '/graphql',
    };
    const url = address.host + address.path;
    const customFetch: AsyncFetchFn = async url => {
      const urlObj = new URL(url.toString());
      expect(urlObj.protocol).toBe('https:');
      expect(urlObj.hostname).toBe('foo');
      expect(urlObj.port).toBe('8080');
      expect(urlObj.pathname).toBe('/graphql');
      return new Response(
        JSON.stringify({
          data: introspectionFromSchema(testSchema),
        })
      );
    };

    await loader.load(url, {
      customFetch,
    });
    expect.assertions(4);
  });
  it('should handle .graphql files', async () => {
    const testHost = 'http://localhost:3000';
    const testPath = '/schema.graphql';
    const [result] = await loader.load(testHost + testPath, {
      customFetch: async () => {
        return new Response(testTypeDefs);
      },
    });

    assertNonMaybe(result.document);
    expect(print(result.document)).toBeSimilarGqlDoc(testTypeDefs);
  });

  it('should handle .graphqls files', async () => {
    const testHost = 'http://localhost:3000';
    const testPath = '/schema.graphqls';
    const [result] = await loader.load(testHost + testPath, {
      customFetch: async () => {
        return new Response(testTypeDefs);
      },
    });

    assertNonMaybe(result.document);
    expect(print(result.document)).toBeSimilarGqlDoc(testTypeDefs);
  });

  it("should handle results with handleAsSDL option even if it doesn't end with .graphql", async () => {
    const testHost = 'http://localhost:3000';
    const testPath = '/sdl';

    const [result] = await loader.load(testHost + testPath, {
      handleAsSDL: true,
      customFetch: async () => {
        return new Response(testTypeDefs);
      },
    });

    assertNonMaybe(result.document);
    expect(print(result.document)).toBeSimilarGqlDoc(testTypeDefs);
  });
  it('should handle subscriptions - new graphql-ws', async () => {
    const testUrl = 'http://localhost:8081/graphql';
    const [{ schema }] = await loader.load(testUrl, {
      customFetch: async () =>
        new Response(
          JSON.stringify({
            data: introspectionFromSchema(testSchema),
          }),
          {
            headers: {
              'content-type': 'application/json',
            },
          }
        ),
      subscriptionsProtocol: SubscriptionProtocol.WS,
    });

    httpServer = http.createServer(function weServeSocketsOnly(_, res) {
      res.writeHead(404);
      res.end();
    });

    const wsServer = new WSServer({
      server: httpServer,
      path: '/graphql',
    });

    const subscriptionServer = useServer(
      {
        schema: testSchema, // from the previous step
        execute: execute as any,
        subscribe: subscribe as any,
      },
      wsServer
    );

    await new Promise<void>(resolve => httpServer.listen(8081, resolve));
    assertNonMaybe(schema);
    const asyncIterator = (await subscribe({
      schema,
      document: parse(/* GraphQL */ `
        subscription TestMessage {
          testMessage {
            number
          }
        }
      `),
      contextValue: {},
    })) as AsyncIterableIterator<ExecutionResult>;

    expect(asyncIterator['errors']).toBeFalsy();
    expect(asyncIterator['errors']?.length).toBeFalsy();

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
      customFetch: async () =>
        new Response(
          JSON.stringify({
            data: introspectionFromSchema(testSchema),
          }),
          {
            headers: {
              'content-type': 'application/json',
            },
          }
        ),
      subscriptionsProtocol: SubscriptionProtocol.LEGACY_WS,
    });

    httpServer = http.createServer(function weServeSocketsOnly(_, res) {
      res.writeHead(404);
      res.end();
    });

    await new Promise<void>(resolve => httpServer.listen(8081, resolve));

    const subscriptionServer = SubscriptionServer.create(
      {
        schema: testSchema,
        execute: execute as any,
        subscribe: subscribe as any,
      },
      {
        server: httpServer,
        path: '/graphql',
      }
    );
    assertNonMaybe(schema);
    const asyncIterator = (await subscribe({
      schema,
      document: parse(/* GraphQL */ `
        subscription TestMessage {
          testMessage {
            number
          }
        }
      `),
      contextValue: {},
    })) as AsyncIterableIterator<ExecutionResult>;

    expect(asyncIterator['errors']).toBeFalsy();
    expect(asyncIterator['errors']?.length).toBeFalsy();

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
    const customFetch: AsyncFetchFn = async (url, options) => {
      if (String(options?.body).includes('IntrospectionQuery')) {
        return new Response(
          JSON.stringify({
            data: introspectionFromSchema(testSchema),
          }),
          {
            headers: {
              'content-type': 'application/json',
            },
          }
        );
      }
      return defaultAsyncFetch(url, options);
    };

    const [{ schema }] = await loader.load(testUrl, {
      customFetch,
      subscriptionsProtocol: SubscriptionProtocol.GRAPHQL_SSE,
    });

    httpServer = http.createServer(
      createHandler({
        schema: testSchema,
      })
    );
    await new Promise<void>(resolve => httpServer.listen(8081, resolve));

    assertNonMaybe(schema);
    const asyncIterable = (await subscribe({
      schema,
      document: parse(/* GraphQL */ `
        subscription TestMessage {
          testMessage {
            number
          }
        }
      `),
      contextValue: {},
    })) as AsyncIterable<ExecutionResult<any>>;

    expect(asyncIterable['errors']).toBeFalsy();
    expect(asyncIterable['errors']?.length).toBeFalsy();

    let i = 0;
    for await (const result of asyncIterable) {
      expect(result?.data?.testMessage?.number).toBe(i);
      i++;
    }

    expect.assertions(5);
  });
  it('should handle aliases properly', async () => {
    const customFetch: AsyncFetchFn = async (_, options) => {
      const bodyStr = String(options?.body);
      if (bodyStr.includes('IntrospectionQuery')) {
        return new Response(
          JSON.stringify({
            data: introspectionFromSchema(testSchema),
          }),
          {
            headers: {
              'content-type': 'application/json',
            },
          }
        );
      }
      return new Response(
        JSON.stringify(
          await execute({
            schema: testSchema,
            document: parse(JSON.parse(bodyStr).query),
          })
        ),
        {
          headers: {
            'content-type': 'application/json',
          },
        }
      );
    };
    const schema = await loadSchema(`http://0.0.0.0:8081/graphql`, {
      loaders: [loader],
      customFetch,
    });
    const document = parse(/* GraphQL */ `
      query TestQuery {
        b: a
        foo: complexField(complexArg: { id: "FOO" }) {
          id
          bar: complexChildren(complexChildArg: { id: "BAR" }) {
            id
          }
        }
      }
    `);
    const result: any = await execute({
      schema,
      document,
    });
    expect(result?.data?.['b']).toBe('a');
    expect(result?.data?.['foo']?.id).toBe('FOO');
    expect(result?.data?.['foo']?.bar?.[0]?.id).toBe('BAR');
  });
  it('should return errors correctly if fetch fails', async () => {
    const executor = loader.getExecutorAsync('http://127.0.0.1:9777/graphql');

    const result = (await executor({
      document: parse(/* GraphQL */ `
        query TestQuery {
          a
        }
      `),
    })) as ExecutionResult;
    expect(result.data).toBeUndefined();
    expect(result.errors).toBeDefined();
    expect(result.errors?.[0].message).toContain('failed');
    expect(result.errors?.[0].message).toContain('http://127.0.0.1:9777/graphql');
  });
});
