import { ExecutionResult, inspect, isAsyncIterable } from '@graphql-tools/utils';
import { SyncResponse } from './index.js';

export async function* handleEventStreamResponse(
  response: Response | SyncResponse,
): AsyncIterableIterator<ExecutionResult> {
  let stream: AsyncIterable<Uint8Array | string>;
  const body = response.body;
  if (isReadableStream(body)) {
    stream = streamToAsyncIterator(body);
  } else if (isAsyncIterable(body)) {
    stream = body;
  } else {
    throw new Error('Response body is expected to be a readable stream, but got ' + inspect(body));
  }

  const decoder = new TextDecoder();
  for await (const rawChunk of stream) {
    const chunk =
      typeof rawChunk === 'string' ? rawChunk : decoder.decode(rawChunk, { stream: true });
    for (const msg of chunk.split('\n\n')) {
      const parts = msg.split('\n');

      const eventPart = parts.find(part => part.startsWith('event:'));
      const dataPart = parts.find(part => part.startsWith('data:'));
      if (!eventPart && !dataPart) {
        continue; // ping
      }
      if (!eventPart) {
        throw new Error('Missing stream message event');
      }

      const event = eventPart.replace('event:', '').trim();
      if (event === 'complete') {
        return;
      } else if (event === 'next') {
        if (!dataPart) {
          throw new Error(`Missing stream message data for "next" event`);
        }
        const data = dataPart.replace('data:', '').trim();
        const parsed = JSON.parse(data);
        yield parsed.payload || parsed;
      } else {
        throw new Error(`Unsupported stream message event "${event}"`);
      }
    }
  }
}

export function isReadableStream<T>(value: unknown): value is ReadableStream<T> {
  return typeof Object(value).getReader === 'function';
}

async function* streamToAsyncIterator<T>(stream: ReadableStream<T>): AsyncIterableIterator<T> {
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return;
    yield value;
  }
}
