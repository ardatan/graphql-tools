import makeRemoteExecutableSchema from './makeRemoteExecutableSchema';
import introspectSchema from './introspectSchema';
import mergeSchemas from './mergeSchemas';
import delegateToSchema, { createRequest } from './delegateToSchema';
import defaultMergedResolver from './defaultMergedResolver';

export {
  makeRemoteExecutableSchema,
  introspectSchema,
  mergeSchemas,
  // Those are currently undocumented and not part of official API,
  // but exposed for the community use
  delegateToSchema,
  defaultMergedResolver,
  createRequest
};
