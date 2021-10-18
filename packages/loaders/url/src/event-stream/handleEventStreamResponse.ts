/* eslint-disable */

import { handleReadable } from './handleReadable';
import { handleReadableStream } from './handleReadableStream';

export async function handleEventStreamResponse(response: Response) {
  const body = await response.body;
  if (body) {
    if ('pipe' in body) {
      return handleReadable(body);
    }
    return handleReadableStream(body);
  }
}
