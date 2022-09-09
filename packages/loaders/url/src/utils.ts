import { memoize1 } from '@graphql-tools/utils';
import { OperationDefinitionNode } from 'graphql';
import type { Readable } from 'stream';

export function isBlob(obj: any): obj is Blob {
  return typeof obj.arrayBuffer === 'function';
}

interface GraphQLUpload {
  filename: string;
  mimetype: string;
  createReadStream: () => Readable;
}

export function isGraphQLUpload(upload: any): upload is GraphQLUpload {
  return typeof upload.createReadStream === 'function';
}

export function isPromiseLike(obj: any): obj is PromiseLike<any> {
  return typeof obj.then === 'function';
}

export const isLiveQueryOperationDefinitionNode = memoize1(function isLiveQueryOperationDefinitionNode(
  node: OperationDefinitionNode
) {
  return node.directives?.some(directive => directive.name.value === 'live');
});

export enum LEGACY_WS {
  CONNECTION_INIT = 'connection_init',
  CONNECTION_ACK = 'connection_ack',
  CONNECTION_ERROR = 'connection_error',
  CONNECTION_KEEP_ALIVE = 'ka',
  START = 'start',
  STOP = 'stop',
  CONNECTION_TERMINATE = 'connection_terminate',
  DATA = 'data',
  ERROR = 'error',
  COMPLETE = 'complete',
}
