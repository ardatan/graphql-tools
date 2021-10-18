/* eslint-disable */

import { ExecutionResult, GraphQLError } from 'graphql';
import { meros as merosIncomingMessage } from 'meros/node';
import { meros as merosReadableStream } from 'meros/browser';
import { IncomingMessage } from 'http';
import { mapAsyncIterator } from '@graphql-tools/utils';
import _ from 'lodash';

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

export async function handleMultipartMixedResponse(response: Response) {
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
  return mapAsyncIterator(asyncIterator, (part: Part) => {
    if (part.json) {
      const chunk = part.body;
      if (chunk.path) {
        if (chunk.data) {
          const path: Array<string | number> = ['data'];
          _.set(executionResult, path.concat(chunk.path), chunk.data);
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
}
