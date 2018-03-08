import makeRemoteExecutableSchema from './makeRemoteExecutableSchema';
import introspectSchema from './introspectSchema';
import mergeSchemas from './mergeSchemas';
import delegateToSchema, { createDocument } from './delegateToSchema';
import linkToFetcher from './linkToFetcher';

export {
  makeRemoteExecutableSchema,
  introspectSchema,
  mergeSchemas,
  // Those are currently undocumented and not part of official API,
  // but exposed for the community use
  delegateToSchema,
  createDocument,
  linkToFetcher,
};
