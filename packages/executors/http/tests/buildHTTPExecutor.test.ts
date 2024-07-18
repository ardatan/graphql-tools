import { createServer, Server } from 'http';
import { GraphQLError, parse } from 'graphql';
import { createGraphQLError, ExecutionResult, isAsyncIterable } from '@graphql-tools/utils';
import { ReadableStream, Request, Response } from '@whatwg-node/fetch';
import { assertAsyncIterable } from '../../../loaders/url/tests/test-utils.js';
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
  it.each([
    JSON.stringify({ data: null, errors: null }),
    JSON.stringify({ data: null }),
    JSON.stringify({ data: null, errors: [] }),
    JSON.stringify({ errors: null }),
    JSON.stringify({ errors: [] }),
  ])('should error when both data and errors fields are empty %s', async body => {
    const executor = buildHTTPExecutor({
      fetch: () =>
        new Response(body, {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        }),
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
          message: expect.stringContaining('Unexpected empty "data" and "errors" fields'),
        },
      ],
    });
  });
  it('should use GET for subscriptions by default', async () => {
    let method: string = '';
    const executor = buildHTTPExecutor({
      fetch: (info, init) => {
        const request = new Request(info, init);
        method = request.method;
        return new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(`data: ${JSON.stringify({ data: { hello: 'world' } })}\n\n`);
              controller.close();
            },
          }),
          {
            headers: { 'Content-Type': 'text/event-stream' },
          },
        );
      },
    });
    const result = await executor({
      document: parse(/* GraphQL */ `
        subscription {
          hello
        }
      `),
    });
    assertAsyncIterable(result);
    const iterator = result[Symbol.asyncIterator]();
    const first = await iterator.next();
    await iterator?.return?.();
    expect(first).toMatchObject({
      value: { data: { hello: 'world' } },
    });
    expect(method).toBe('GET');
  });
  it('should use POST if method is specified', async () => {
    let method: string = '';
    const executor = buildHTTPExecutor({
      method: 'POST',
      fetch: (info, init) => {
        const request = new Request(info, init);
        method = request.method;
        return new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(`data: ${JSON.stringify({ data: { hello: 'world' } })}\n\n`);
              controller.close();
            },
          }),
          {
            headers: { 'Content-Type': 'text/event-stream' },
          },
        );
      },
    });
    const result = await executor({
      document: parse(/* GraphQL */ `
        subscription {
          hello
        }
      `),
    });
    assertAsyncIterable(result);
    const iterator = result[Symbol.asyncIterator]();
    const first = await iterator.next();
    await iterator?.return?.();
    expect(first).toMatchObject({
      value: { data: { hello: 'world' } },
    });
    expect(method).toBe('POST');
  });

  it('should not encode headers from extensions', async () => {
    const executor = buildHTTPExecutor({
      useGETForQueries: true,
      fetch(url) {
        expect(url).not.toMatch(/(Authorization|headers)/i);
        return new Response(JSON.stringify({ data: { hello: 'world!' } }), {
          headers: { 'Content-Type': 'application/json' },
        });
      },
    });
    const result = (await executor({
      document: parse(/* GraphQL */ `
        query {
          hello
        }
      `),
      extensions: {
        headers: {
          Authorization: 'Token',
        },
      },
    })) as ExecutionResult;

    expect(result.data).toMatchInlineSnapshot(`
      {
        "hello": "world!",
      }
    `);
  });

  it('should allow setting a custom content-type header in introspection', async () => {
    expect.assertions(2);

    const executor = buildHTTPExecutor({
      endpoint: 'https://my.schema/graphql',
      fetch(_url, options) {
        expect(options?.headers?.['content-type']).toBe('application/vnd.api+json');
        return Response.json({ data: { hello: 'world' } });
      },
      headers: { 'content-type': 'application/vnd.api+json' },
    });
    const result = (await executor({
      document: parse(/* GraphQL */ `
        query IntrospectionQuery {
          __schema {
            queryType {
              name
            }
            mutationType {
              name
            }
            subscriptionType {
              name
            }
          }
        }
      `),
      context: {},
    })) as ExecutionResult;

    expect(result.errors).toBeUndefined();
  });
  let server: Server;
  afterEach(done => {
    if (server?.listening) {
      server.close(done);
    } else {
      done();
    }
  });
  it('stops existing requests when the executor is disposed', async () => {
    // Create a server that never responds
    server = createServer();
    await new Promise<void>(resolve => server.listen(0, resolve));
    const executor = buildHTTPExecutor({
      endpoint: `http://localhost:${(server.address() as any).port}`,
      disposable: true,
    });
    const result = executor({
      document: parse(/* GraphQL */ `
        query {
          hello
        }
      `),
    });
    await executor[Symbol.asyncDispose]();
    await expect(result).resolves.toEqual({
      errors: [
        createGraphQLError('The operation was aborted. reason: Error: Executor was disposed.'),
      ],
    });
  });
  it('does not allow new requests when the executor is disposed', async () => {
    const executor = buildHTTPExecutor({
      fetch: () => Response.json({ data: { hello: 'world' } }),
      disposable: true,
    });
    executor[Symbol.dispose]?.();
    const result = await executor({
      document: parse(/* GraphQL */ `
        query {
          hello
        }
      `),
    });
    expect(result).toMatchObject({
      errors: [
        createGraphQLError('The operation was aborted. reason: Error: Executor was disposed.'),
      ],
    });
  });
  it('should return return GraphqlError instances', async () => {
    const executor = buildHTTPExecutor({
      useGETForQueries: true,
      fetch() {
        return Response.json({ errors: [{ message: 'test error' }] });
      },
    });

    const result = await executor({
      document: parse(/* GraphQL */ `
        query {
          hello
        }
      `),
    });

    if (isAsyncIterable(result)) {
      throw new Error('Expected result to be an ExecutionResult');
    }

    expect(result.errors?.[0]).toBeInstanceOf(GraphQLError);
    expect(result.errors?.[0]?.extensions).toMatchObject({
      code: 'DOWNSTREAM_SERVICE_ERROR',
    });
  });
});
