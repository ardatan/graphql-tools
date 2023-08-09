import { extractFiles, isExtractableFile } from 'extract-files';
import { isAsyncIterable, isPromise } from '@graphql-tools/utils';
import { File as DefaultFile, FormData as DefaultFormData } from '@whatwg-node/fetch';
import { isGraphQLUpload } from './isGraphQLUpload.js';

export function createFormDataFromVariables<TVariables>(
  {
    query,
    variables,
    operationName,
    extensions,
  }: {
    query: string;
    variables: TVariables;
    operationName?: string;
    extensions?: any;
  },
  {
    File: FileCtor = DefaultFile,
    FormData: FormDataCtor = DefaultFormData,
  }: {
    File?: typeof File;
    FormData?: typeof DefaultFormData;
  },
) {
  const vars = Object.assign({}, variables);
  const { clone, files } = extractFiles(
    vars,
    'variables',
    ((v: any) =>
      isExtractableFile(v) ||
      v?.promise ||
      isAsyncIterable(v) ||
      v?.then ||
      typeof v?.arrayBuffer === 'function') as any,
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
  const form = new FormDataCtor();
  form.append(
    'operations',
    JSON.stringify({
      query,
      variables: clone,
      operationName,
      extensions,
    }),
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
          form.append(
            indexStr,
            new FileCtor([blobPart], filename, { type: upload.mimetype }),
            filename,
          );
        });
      } else {
        form.append(indexStr, new FileCtor([upload], filename), filename);
      }
    }
  }
  return Promise.all(
    uploads.map((upload, i) => handleUpload(upload, i)),
  )
    .then(() => form);
}

function isBlob(obj: any): obj is Blob {
  return typeof obj.arrayBuffer === 'function';
}
