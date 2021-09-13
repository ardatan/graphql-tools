import { GraphQLSchema, GraphQLFieldConfig } from 'graphql';
import { ExecutionRequest } from '@graphql-tools/utils';
import { Transform, DelegationContext, SubschemaConfig } from '@graphql-tools/delegate';
export default class RenameRootFields implements Transform {
  private readonly transformer;
  constructor(
    renamer: (
      operation: 'Query' | 'Mutation' | 'Subscription',
      name: string,
      fieldConfig: GraphQLFieldConfig<any, any>
    ) => string
  );
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
