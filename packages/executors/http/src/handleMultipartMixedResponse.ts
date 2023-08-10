import type { IncomingMessage } from 'http';
import { meros as merosReadableStream } from 'meros/browser';
import { meros as merosIncomingMessage } from 'meros/node';
import { ExecutionResult, mapAsyncIterator, mergeIncrementalResult } from '@graphql-tools/utils';
import { addCancelToResponseStream } from './addCancelToResponseStream.js';

type Part =
  | {
      body: ExecutionResult;
      json: true;
    }
  | {
      body: string | Buffer;
      json: false;
    };

function isIncomingMessage(body: any): body is IncomingMessage {
  return body != null && typeof body === 'object' && 'pipe' in body;
}

export async function handleMultipartMixedResponse(
  response: Response,
  controller: AbortController,
) {
  const body = response.body;
  const contentType = response.headers.get('content-type') || '';
  let asyncIterator: AsyncIterator<Part> | undefined;
  if (isIncomingMessage(body)) {
    // Meros/node expects headers as an object map with the content-type prop
    body.headers = {
      'content-type': contentType,
    };
    // And it expects `IncomingMessage` and `node-fetch` returns `body` as `Promise<PassThrough>`
    const result = await merosIncomingMessage<ExecutionResult>(body);
    if ('next' in result) {
      asyncIterator = result;
    }
  } else {
    // Nothing is needed for regular `Response`.
    const result = await merosReadableStream<ExecutionResult>(response);
    if ('next' in result) {
      asyncIterator = result;
    }
  }

  const executionResult: ExecutionResult = {};

  if (asyncIterator == null) {
    return executionResult;
  }

  const resultStream = mapAsyncIterator(asyncIterator, (part: Part) => {
    if (part.json) {
      const incrementalResult = part.body;
      mergeIncrementalResult({
        incrementalResult,
        executionResult,
      });
      return executionResult;
    }
  });

  return addCancelToResponseStream(resultStream, controller);
}
