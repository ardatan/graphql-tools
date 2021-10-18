/* eslint-disable */

import { GraphQLError } from 'graphql';
import { handleReadable } from './handleReadable';
import { handleReadableStream } from './handleReadableStream';
import { getBoundaryFromContentType } from './utils';

interface ExecutionPatchResult<TData = { [key: string]: any }, TExtensions = { [key: string]: any }> {
  errors?: ReadonlyArray<GraphQLError>;
  data?: TData;
  path?: ReadonlyArray<string | number>;
  label?: string;
  hasNext: boolean;
  extensions?: TExtensions;
}

type HandledResponse = Promise<
  AsyncGenerator<
    | {
        json: false;
        body: string;
      }
    | {
        json: true;
        body: ExecutionPatchResult;
      }
  >
>;

export async function handleMultipartMixedResponse(response: Response) {
  const body = await response.body;
  const contentType = response.headers.get('content-type') || '';
  const boundary = getBoundaryFromContentType(contentType);
  if (body) {
    if ('pipe' in body) {
      return handleReadable(body, boundary) as unknown as HandledResponse;
    }
    return handleReadableStream(body, boundary) as unknown as HandledResponse;
  }
}
