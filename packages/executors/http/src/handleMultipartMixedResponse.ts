import type { IncomingMessage } from 'http';
import { meros as merosIncomingMessage } from 'meros/node';
import { meros as merosReadableStream } from 'meros/browser';
import { ExecutionResult, mapAsyncIterator } from '@graphql-tools/utils';
import { dset } from 'dset/merge';
import { addCancelToResponseStream } from './addCancelToResponseStream.js';
import { GraphQLError } from 'graphql';

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

export async function handleMultipartMixedResponse(response: Response, controller?: AbortController) {
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

  function handleResult(result: ExecutionResult) {
    if (result.path) {
      const path = ['data', ...result.path];
      executionResult.data = executionResult.data || {};
      if (result.items) {
        for (const item of result.items) {
          dset(executionResult, path, item);
        }
      }
      if (result.data) {
        dset(executionResult, ['data', ...result.path], result.data);
      }
    } else if (result.data) {
      executionResult.data = executionResult.data || {};
      Object.assign(executionResult.data, result.data);
    }
    if (result.errors) {
      executionResult.errors = executionResult.errors || [];
      (executionResult.errors as GraphQLError[]).push(...result.errors);
    }
    if (result.incremental) {
      result.incremental.forEach(handleResult);
    }
  }

  if (asyncIterator == null) {
    return executionResult;
  }

  const resultStream = mapAsyncIterator(asyncIterator, (part: Part) => {
    if (part.json) {
      const chunk = part.body;
      handleResult(chunk);
      return executionResult;
    }
  });

  if (controller) {
    return addCancelToResponseStream(resultStream, controller);
  }

  return resultStream;
}
