import type { IncomingMessage } from 'http';
import type { Part } from 'meros';
import { meros as merosReadableStream } from 'meros/browser';
import { meros as merosIncomingMessage } from 'meros/node';
import {
  ExecutionResult,
  inspect,
  mergeIncrementalResult,
} from '@graphql-tools/utils';

export async function* handleMultipartMixedResponse(
  response: Response,
): AsyncIterableIterator<ExecutionResult> {
  const body = response.body;
  const contentType = response.headers.get('content-type') || '';
  let stream: AsyncIterable<Part<ExecutionResult, string | Buffer>> | undefined;
  if (isIncomingMessage(body)) {
    // Meros/node expects headers as an object map with the content-type prop
    body.headers = {
      'content-type': contentType,
    };
    // And it expects `IncomingMessage` and `node-fetch` returns `body` as `Promise<PassThrough>`
    const result = await merosIncomingMessage(body);
    if (!('next' in result)) {
      throw new Error('Multipart mixed response must be iterable');
    }
    stream = result;
  } else {
    const result = await merosReadableStream(response);
    if (!('next' in result)) {
      throw new Error('Multipart mixed response must be iterable');
    }
    stream = result;
  }

  const executionResult: ExecutionResult = {};
  for await (const part of stream) {
    if (part.json) {
      const incrementalResult = part.body;
      mergeIncrementalResult({
        incrementalResult,
        executionResult,
      });
      yield executionResult;
    } else {
      throw new Error(`Unexpected multipart stream data ${inspect(part)}`);
    }
  }
}

function isIncomingMessage(body: any): body is IncomingMessage {
  return body != null && typeof body === 'object' && 'pipe' in body;
}
