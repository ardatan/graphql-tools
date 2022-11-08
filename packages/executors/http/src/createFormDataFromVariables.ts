import { isAsyncIterable, isPromise } from '@graphql-tools/utils';
import { extractFiles, isExtractableFile } from 'extract-files';
import { isGraphQLUpload } from './isGraphQLUpload.js';
import { ValueOrPromise } from 'value-or-promise';
import { FormData, File } from '@whatwg-node/fetch';

export function createFormDataFromVariables<TVariables>({
  query,
  variables,
  operationName,
  extensions,
}: {
  query: string;
  variables: TVariables;
  operationName?: string;
  extensions?: any;
}) {
  const vars = Object.assign({}, variables);
  const { clone, files } = extractFiles(
    vars,
    'variables',
    ((v: any) =>
      isExtractableFile(v) ||
      v?.promise ||
      isAsyncIterable(v) ||
      v?.then ||
      typeof v?.arrayBuffer === 'function') as any
  );
  if (files.size === 0) {
    return JSON.stringify({
      query,
      variables,
      operationName,
      extensions,
    });
  }
  const map: Record<number, string[]> = {};
  const uploads: any[] = [];
  let currIndex = 0;
  for (const [file, curr] of files) {
    map[currIndex] = curr;
    uploads[currIndex] = file;
    currIndex++;
  }
  const form = new FormData();
  form.append(
    'operations',
    JSON.stringify({
      query,
      variables: clone,
      operationName,
      extensions,
    })
  );
  form.append('map', JSON.stringify(map));
  function handleUpload(upload: any, i: number): void | PromiseLike<void> {
    const indexStr = i.toString();
    if (upload != null) {
      const filename = upload.filename || upload.name || upload.path || `blob-${indexStr}`;
      if (isPromise(upload)) {
        return upload.then((resolvedUpload: any) => handleUpload(resolvedUpload, i));
        // If Blob
      } else if (isBlob(upload)) {
        form.append(indexStr, upload, filename);
      } else if (isGraphQLUpload(upload)) {
        const stream = upload.createReadStream();
        const chunks: number[] = [];
        return Promise.resolve().then(async () => {
          for await (const chunk of stream) {
            if (chunk) {
              chunks.push(...chunk);
            }
          }
          const blobPart = new Uint8Array(chunks);
          form.append(indexStr, new File([blobPart], filename, { type: upload.mimetype }), filename);
        });
      } else {
        form.append(indexStr, new File([upload], filename), filename);
      }
    }
  }
  return ValueOrPromise.all(uploads.map((upload, i) => new ValueOrPromise(() => handleUpload(upload, i))))
    .then(() => form)
    .resolve();
}

function isBlob(obj: any): obj is Blob {
  return typeof obj.arrayBuffer === 'function';
}
