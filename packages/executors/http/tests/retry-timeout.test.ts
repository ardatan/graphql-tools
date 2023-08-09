import { Server } from 'http';
import { AddressInfo, Socket } from 'net';
import { parse } from 'graphql';
import { Response } from '@whatwg-node/fetch';
import { buildHTTPExecutor } from '../src';

describe('Retry & Timeout', () => {
  let server: Server;
  const sockets = new Set<Socket>();
  afterEach(() => {
    sockets.forEach(socket => {
      socket.destroy();
    });
    server?.close();
  });
  describe('retry', () => {
    it('retry in an HTTP error', async () => {
      let cnt = 0;
      const executor = buildHTTPExecutor({
        async fetch() {
          if (cnt < 2) {
            cnt++;
            return new Response(undefined, { status: 500 });
          }
          return (Response as any).json({ data: { hello: 'world' } });
        },
        retry: 3,
      });
      const result = await executor({
        document: parse(/* GraphQL */ `
          query {
            hello
          }
        `),
      });
      expect(result).toMatchObject({
        data: {
          hello: 'world',
        },
      });
      expect(cnt).toEqual(2);
    });
    it('retry in GraphQL Error', async () => {
      let cnt = 0;
      const executor = buildHTTPExecutor({
        async fetch() {
          if (cnt < 2) {
            cnt++;
            return (Response as any).json({
              errors: [{ message: `error in ${cnt}` }],
            });
          }
          return (Response as any).json({ data: { hello: 'world' } });
        },
        retry: 3,
      });
      const result = await executor({
        document: parse(/* GraphQL */ `
          query {
            hello
          }
        `),
      });
      expect(result).toMatchObject({
        data: {
          hello: 'world',
        },
      });
      expect(cnt).toEqual(2);
    });
    it('retry and fail with the last error', async () => {
      let cnt = 0;
      const executor = buildHTTPExecutor({
        async fetch() {
          cnt++;
          return (Response as any).json({
            errors: [{ message: `error in ${cnt}` }],
          });
        },
        retry: 3,
      });
      const result = await executor({
        document: parse(/* GraphQL */ `
          query {
            hello
          }
        `),
      });
      expect(result).toMatchObject({
        errors: [{ message: `error in 3` }],
      });
      expect(cnt).toEqual(3);
    });
  });
  it('timeout', async () => {
    server = new Server((req, res) => {
      const timeout = setTimeout(() => {
        res.end(JSON.stringify({ data: { hello: 'world' } }));
      }, 1000);
      req.once('close', () => {
        clearTimeout(timeout);
      });
    });
    server.listen(0);
    const executor = buildHTTPExecutor({
      endpoint: `http://localhost:${(server.address() as AddressInfo).port}`,
      timeout: 500,
    });
    const result = await executor({
      document: parse(/* GraphQL */ `
        query {
          hello
        }
      `),
    });
    expect(result).toMatchObject({
      errors: [{ message: 'The operation was aborted. Reason: timeout' }],
    });
  });
  it('retry & timeout', async () => {
    let cnt = 0;
    server = new Server((req, res) => {
      if (cnt < 2) {
        cnt++;
        const timeout = setTimeout(() => {
          res.end(JSON.stringify({ errors: [{ message: `error in ${cnt}` }] }));
        }, 1000);
        req.once('close', () => {
          clearTimeout(timeout);
        });
      } else {
        res.end(JSON.stringify({ data: { hello: 'world' } }));
      }
    });
    server.on('connection', socket => {
      sockets.add(socket);
      socket.once('close', () => {
        sockets.delete(socket);
      });
    });
    server.listen(0);
    const executor = buildHTTPExecutor({
      endpoint: `http://localhost:${(server.address() as AddressInfo).port}`,
      timeout: 500,
      retry: 3,
    });
    const result = await executor({
      document: parse(/* GraphQL */ `
        query {
          hello
        }
      `),
    });
    expect(cnt).toEqual(2);
    expect(result).toMatchObject({
      data: {
        hello: 'world',
      },
    });
  });
});
