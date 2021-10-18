/* eslint-disable */

import { GraphQLError } from 'graphql';
import { meros as merosIncomingMessage } from 'meros/node';
import { meros as merosReadableStream } from 'meros/browser';
import { IncomingMessage } from 'http';

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

export async function handleMultipartMixedResponse(response: Response) {
  const body = await response.body;
  const contentType = response.headers.get('content-type') || '';
  if (body) {
    if ('pipe' in body) {
      (body as IncomingMessage).headers = {
        'content-type': contentType,
      };
      return merosIncomingMessage(body) as unknown as AsyncIterator<Part>;
    }
    return merosReadableStream(response) as unknown as AsyncIterator<Part>;
  }
  throw new Error('Body is null???');
}
