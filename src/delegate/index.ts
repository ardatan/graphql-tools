import delegateToSchema, { delegateRequest } from './delegateToSchema';
import { createRequestFromInfo, createRequest } from './createRequest';
import defaultMergedResolver from './defaultMergedResolver';

export {
  delegateToSchema,
  createRequestFromInfo,
  createRequest,
  delegateRequest,
  defaultMergedResolver,
};

export * from './transforms/index';
