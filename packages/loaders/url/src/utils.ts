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
