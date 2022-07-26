import { ExecutionResult } from '@graphql-tools/graphql';
import { inspect, isAsyncIterable } from '@graphql-tools/utils';
import { handleAsyncIterable } from './handleAsyncIterable.js';
import { handleReadableStream } from './handleReadableStream.js';

export async function handleEventStreamResponse(response: Response): Promise<AsyncGenerator<ExecutionResult>> {
  // node-fetch returns body as a promise so we need to resolve it
  const body = response.body;
  if (body) {
    if (isAsyncIterable<Uint8Array | string>(body)) {
      return handleAsyncIterable(body);
    }
    return handleReadableStream(body);
  }
  throw new Error('Response body is expected to be a readable stream but got; ' + inspect(body));
}
