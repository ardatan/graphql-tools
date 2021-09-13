import { GraphQLSchema } from 'graphql';
import { ExecutionRequest, InputFieldFilter } from '@graphql-tools/utils';
import { Transform, DelegationContext, SubschemaConfig } from '@graphql-tools/delegate';
import { InputObjectNodeTransformer } from '../types';
export default class FilterInputObjectFields implements Transform {
  private readonly transformer;
  constructor(filter: InputFieldFilter, inputObjectNodeTransformer?: InputObjectNodeTransformer);
  transformSchema(
    originalWrappingSchema: GraphQLSchema,
    subschemaConfig: SubschemaConfig,
    transformedSchema?: GraphQLSchema
  ): GraphQLSchema;
  transformRequest(
    originalRequest: ExecutionRequest,
    delegationContext: DelegationContext,
    transformationContext: Record<string, any>
  ): ExecutionRequest;
}
