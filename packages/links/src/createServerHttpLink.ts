import formDataAppendFile from 'apollo-upload-client/formDataAppendFile.mjs';
import isExtractableFile from 'apollo-upload-client/isExtractableFile.mjs';
import UploadHttpLink from 'apollo-upload-client/UploadHttpLink.mjs';
import * as apolloImport from '@apollo/client';
import { AwaitVariablesLink } from './AwaitVariablesLink.js';

const apollo: typeof apolloImport = (apolloImport as any)?.default ?? apolloImport;

export const createServerHttpLink = (options: any) =>
  apollo.concat(
    new AwaitVariablesLink(),
    new UploadHttpLink({
      ...options,
      fetch,
      FormData,
      isExtractableFile: (value: any) => isExtractableFile(value) || value?.createReadStream,
      formDataAppendFile: (form: FormData, index: string, file: any) => {
        if (file.createReadStream != null) {
          // @ts-expect-error - apollo-upload-client types are not up to date
          form.append(index, file.createReadStream(), {
            filename: file.filename,
            contentType: file.mimetype,
          });
        } else {
          formDataAppendFile(form as any, index, file);
        }
      },
    }) as any,
  );
