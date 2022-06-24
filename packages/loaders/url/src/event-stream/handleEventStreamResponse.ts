import { ExecutionResult } from 'graphql';
import { inspect, isAsyncIterable } from '@graphql-tools/utils';
import { handleReadable } from './handleReadable.js';
import { handleReadableStream } from './handleReadableStream.js';

export async function handleEventStreamResponse(response: Response): Promise<AsyncGenerator<ExecutionResult>> {
  // node-fetch returns body as a promise so we need to resolve it
  const body = await (response.body as unknown as Promise<any>);
  if (body) {
    if (isAsyncIterable<Uint8Array | string>(body)) {
      return handleReadable(body);
    }
    return handleReadableStream(body);
  }
  throw new Error('Response body is expected to be a readable stream but got; ' + inspect(body));
}
