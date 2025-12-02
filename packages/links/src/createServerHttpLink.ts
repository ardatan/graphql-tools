import isExtractableFile from 'apollo-upload-client/isExtractableFile.mjs';
import UploadHttpLink from 'apollo-upload-client/UploadHttpLink.mjs';
import * as apolloImport from '@apollo/client';
import { fetch, File, FormData } from '@whatwg-node/fetch';
import { AwaitVariablesLink } from './AwaitVariablesLink.js';

const apollo: typeof apolloImport = (apolloImport as any)?.default ?? apolloImport;

export const createServerHttpLink = (options: any) =>
  apollo.concat(
    new AwaitVariablesLink(),
    new UploadHttpLink({
      ...options,
      isExtractableFile: v =>
        isExtractableFile(v) || v instanceof File || options?.isExtractableFile?.(v),
      fetch: options?.fetch ?? fetch,
      FormData: options?.FormData ?? FormData,
    }) as any,
  );
