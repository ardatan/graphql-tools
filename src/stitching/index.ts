import makeRemoteExecutableSchema, { createResolver as defaultCreateRemoteResolver } from './makeRemoteExecutableSchema';
import introspectSchema from './introspectSchema';
import mergeSchemas from './mergeSchemas';
import { default as delegateToSchema, createDelegatingRequest, delegateRequest } from './delegateToSchema';
import defaultMergedResolver from './defaultMergedResolver';
import { createMergedResolver } from './createMergedResolver';
import { dehoistResult, unwrapResult } from './proxiedResult';

export {
  makeRemoteExecutableSchema,
  introspectSchema,
  mergeSchemas,

  // These are currently undocumented and not part of official API,
  // but exposed for the community use
  delegateToSchema,
  createDelegatingRequest,
  delegateRequest,
  defaultCreateRemoteResolver,
  defaultMergedResolver,
  createMergedResolver,
  dehoistResult,
  unwrapResult,
};
