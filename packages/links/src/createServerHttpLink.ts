import UploadHttpLink from 'apollo-upload-client/UploadHttpLink.mjs';
import * as apolloImport from '@apollo/client';
import { AwaitVariablesLink } from './AwaitVariablesLink.js';

const apollo: typeof apolloImport = (apolloImport as any)?.default ?? apolloImport;

export const createServerHttpLink = (options: any) =>
  apollo.concat(new AwaitVariablesLink(), new UploadHttpLink(options) as any);
