import { GraphQLSchema } from 'graphql';
import { ExecutionRequest, ExecutionResult } from '@graphql-tools/utils';
import { Transform, DelegationContext, SubschemaConfig } from '@graphql-tools/delegate';
export default class RenameRootTypes implements Transform {
  private readonly renamer;
  private map;
  private reverseMap;
  constructor(renamer: (name: string) => string | undefined);
  transformSchema(
    originalWrappingSchema: GraphQLSchema,
    _subschemaConfig: SubschemaConfig,
    _transformedSchema?: GraphQLSchema
  ): GraphQLSchema;
  transformRequest(
    originalRequest: ExecutionRequest,
    _delegationContext: DelegationContext,
    _transformationContext: Record<string, any>
  ): ExecutionRequest;
  transformResult(
    originalResult: ExecutionResult,
    _delegationContext: DelegationContext,
    _transformationContext?: Record<string, any>
  ): ExecutionResult;
}
