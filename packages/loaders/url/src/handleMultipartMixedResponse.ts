import type { ExecutionResult, GraphQLError } from 'graphql';
import type { IncomingMessage } from 'http';
import { meros as merosIncomingMessage } from 'meros/node';
import { meros as merosReadableStream } from 'meros/browser';
import { mapAsyncIterator } from '@graphql-tools/utils';
import { dset } from 'dset/merge';
import { addCancelToResponseStream } from './event-stream/addCancelToResponseStream.js';

interface ExecutionPatchResult<TData = { [key: string]: any }, TExtensions = { [key: string]: any }> {
  errors?: ReadonlyArray<GraphQLError>;
  data?: TData;
  path?: ReadonlyArray<string | number>;
  label?: string;
  hasNext: boolean;
  extensions?: TExtensions;
}

type Part =
  | {
      body: ExecutionPatchResult;
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
  const body = await (response.body as unknown as Promise<IncomingMessage> | ReadableStream);
  const contentType = response.headers.get('content-type') || '';
  let asyncIterator: AsyncIterator<Part>;
  if (isIncomingMessage(body)) {
    // Meros/node expects headers as an object map with the content-type prop
    body.headers = {
      'content-type': contentType,
    };
    // And it expects `IncomingMessage` and `node-fetch` returns `body` as `Promise<PassThrough>`
    asyncIterator = (await merosIncomingMessage(body)) as any;
  } else {
    // Nothing is needed for regular `Response`.
    asyncIterator = (await merosReadableStream(response)) as any;
  }

  const executionResult: ExecutionResult = {};

  const resultStream = mapAsyncIterator(asyncIterator, (part: Part) => {
    if (part.json) {
      const chunk = part.body;
      if (chunk.path) {
        if (chunk.data) {
          const path: Array<string | number> = ['data'];
          dset(executionResult, path.concat(chunk.path), chunk.data);
        }
        if (chunk.errors) {
          executionResult.errors = (executionResult.errors || []).concat(chunk.errors);
        }
      } else {
        if (chunk.data) {
          executionResult.data = chunk.data;
        }
        if (chunk.errors) {
          executionResult.errors = chunk.errors;
        }
      }
      return executionResult;
    }
  });

  if (controller) {
    return addCancelToResponseStream(resultStream, controller);
  }

  return resultStream;
}
