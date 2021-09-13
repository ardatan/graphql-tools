import { GraphQLError } from 'graphql';
import { ExecutionResult } from '@graphql-tools/utils';
import { DelegationContext } from './types';
export declare function checkResultAndHandleErrors(result: ExecutionResult, delegationContext: DelegationContext): any;
export declare function mergeDataAndErrors(
  data: any,
  errors: ReadonlyArray<GraphQLError>,
  path: Array<string | number> | undefined,
  onLocatedError?: (originalError: GraphQLError) => GraphQLError,
  index?: number
): {
  data: any;
  unpathedErrors: Array<GraphQLError>;
};
