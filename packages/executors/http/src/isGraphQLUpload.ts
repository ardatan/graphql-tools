import type { Readable } from 'stream';

interface GraphQLUpload {
  filename: string;
  mimetype: string;
  createReadStream: () => Readable;
}

export function isGraphQLUpload(upload: any): upload is GraphQLUpload {
  return typeof upload.createReadStream === 'function';
}
