import { DocumentNode, GraphQLResolveInfo } from 'graphql';

import { ExecutionResult } from '@graphql-tools/utils';

export interface ExecutionParams<TArgs = Record<string, any>, TContext = any> {
  document: DocumentNode;
  variables?: TArgs;
  extensions?: Record<string, any>;
  context?: TContext;
  info?: GraphQLResolveInfo;
}

export type Executor = <TReturn = Record<string, any>, TArgs = Record<string, any>, TContext = Record<string, any>>(
  params: ExecutionParams<TArgs, TContext>
) => ExecutionResult<TReturn> | Promise<ExecutionResult<TReturn>>;
