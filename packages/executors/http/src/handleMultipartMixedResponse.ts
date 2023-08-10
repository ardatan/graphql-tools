import type { IncomingMessage } from 'http';
import type { Part } from 'meros';
import { meros as merosReadableStream } from 'meros/browser';
import { meros as merosIncomingMessage } from 'meros/node';
import {
  ExecutionResult,
  inspect,
  mapAsyncIterator,
  mergeIncrementalResult,
} from '@graphql-tools/utils';

// eslint-disable-next-line require-yield -- the returned iterable will yield
export async function* handleMultipartMixedResponse(
  response: Response,
): AsyncIterableIterator<ExecutionResult> {
  const body = response.body;
  const contentType = response.headers.get('content-type') || '';
  let stream: AsyncIterator<Part<ExecutionResult, string | Buffer>> | undefined;
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

  const resultStream = mapAsyncIterator(stream, part => {
    if (part.json) {
      const incrementalResult = part.body;
      mergeIncrementalResult({
        incrementalResult,
        executionResult,
      });
      return executionResult;
    } else {
      throw new Error(`Unexpected multipart stream data ${inspect(part)}`);
    }
  });

  return resultStream;
}

function isIncomingMessage(body: any): body is IncomingMessage {
  return body != null && typeof body === 'object' && 'pipe' in body;
}
