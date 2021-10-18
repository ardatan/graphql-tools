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

function isIncomingMessage(body: any): body is IncomingMessage {
  return body != null && typeof body === 'object' && 'pipe' in body;
}

export async function handleMultipartMixedResponse(response: Response): Promise<AsyncIterator<Part>> {
  const body = await (response.body as unknown as Promise<IncomingMessage> | ReadableStream);
  const contentType = response.headers.get('content-type') || '';
  if (isIncomingMessage(body)) {
    body.headers = {
      'content-type': contentType,
    };
    return merosIncomingMessage(body) as any;
  }
  return merosReadableStream(response) as any;
}
