import { ExecutionResult } from 'graphql';
import { handleReadable } from './handleReadable';
import { handleReadableStream } from './handleReadableStream';

export async function handleEventStreamResponse(response: Response): Promise<AsyncIterable<ExecutionResult>> {
  const body = await response.body;
  if (body) {
    if (Symbol.asyncIterator in body) {
      return handleReadable(body as any);
    }
    return handleReadableStream(body);
  }
  return null;
}
