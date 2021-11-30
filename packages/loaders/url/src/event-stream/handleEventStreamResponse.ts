import { ExecutionResult } from 'graphql';
import { handleReadable } from './handleReadable';
import { handleReadableStream } from './handleReadableStream';

export async function handleEventStreamResponse(response: Response): Promise<AsyncIterableIterator<ExecutionResult>> {
  const body = await response.body;
  if (body) {
    if ('pipe' in body) {
      return handleReadable(body);
    }
    return handleReadableStream(body) as any;
  }
  throw new Error('Body is null???');
}
