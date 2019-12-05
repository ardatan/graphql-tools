import makeRemoteExecutableSchema, { createResolver as defaultCreateRemoteResolver } from './makeRemoteExecutableSchema';
import introspectSchema from './introspectSchema';
import mergeSchemas from './mergeSchemas';
import delegateToSchema from './delegateToSchema';
import defaultMergedResolver from './defaultMergedResolver';
import { wrapField, extractField, renameField, createMergedResolver } from './createMergedResolver';
import { extractFields } from './extractFields';


export {
  makeRemoteExecutableSchema,
  introspectSchema,
  mergeSchemas,

  // These are currently undocumented and not part of official API,
  // but exposed for the community use
  delegateToSchema,
  defaultCreateRemoteResolver,
  defaultMergedResolver,
  createMergedResolver,
  extractFields,

  // TBD: deprecate in favor of createMergedResolver?
  // OR: fix naming to clarify that these functions return resolvers?
  wrapField,
  extractField,
  renameField,
};
