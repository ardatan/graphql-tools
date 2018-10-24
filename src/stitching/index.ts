import makeRemoteExecutableSchema, { createResolver as defaultCreateRemoteResolver } from './makeRemoteExecutableSchema';
import introspectSchema from './introspectSchema';
import mergeSchemas from './mergeSchemas';
import delegateToSchema from './delegateToSchema';
import defaultMergedResolver from './defaultMergedResolver';
import mapAsyncIterator from './mapAsyncIterator';

export {
  makeRemoteExecutableSchema,
  introspectSchema,
  mergeSchemas,
  // Those are currently undocumented and not part of official API,
  // but exposed for the community use
  delegateToSchema,
  defaultMergedResolver,
  defaultCreateRemoteResolver,
  mapAsyncIterator
};
