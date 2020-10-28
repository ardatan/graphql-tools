import { DocumentNode, GraphQLResolveInfo } from 'graphql';

export interface ExecutionParams<TArgs = Record<string, any>, TContext = any> {
  document: DocumentNode;
  variables?: TArgs;
  extensions?: Record<string, any>;
  context?: TContext;
  info?: GraphQLResolveInfo;
}
