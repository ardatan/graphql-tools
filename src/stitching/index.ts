import makeRemoteExecutableSchema, { createResolver as defaultCreateRemoteResolver } from './makeRemoteExecutableSchema';
import introspectSchema from './introspectSchema';
import mergeSchemas from './mergeSchemas';
import delegateToSchema, { delegateRequest } from './delegateToSchema';
import { createRequestFromInfo, createRequest } from './createRequest';
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
  createRequestFromInfo,
  createRequest,
  delegateRequest,
  defaultCreateRemoteResolver,
  defaultMergedResolver,
  createMergedResolver,
  dehoistResult,
  unwrapResult,
};
