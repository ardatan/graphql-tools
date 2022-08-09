import { GraphQLSchema, GraphQLFieldConfig } from 'graphql';

import { ExecutionRequest } from '@graphql-tools/utils';

import { Transform, DelegationContext, SubschemaConfig } from '@graphql-tools/delegate';

import TransformRootFields from './TransformRootFields.js';

interface RenameRootFieldsTransformationContext extends Record<string, any> {}

export default class RenameRootFields<TContext = Record<string, any>>
  implements Transform<RenameRootFieldsTransformationContext, TContext>
{
  private readonly transformer: TransformRootFields<TContext>;

  constructor(
    renamer: (
      operation: 'Query' | 'Mutation' | 'Subscription',
      name: string,
      fieldConfig: GraphQLFieldConfig<any, any>
    ) => string
  ) {
    this.transformer = new TransformRootFields(
      (
        operation: 'Query' | 'Mutation' | 'Subscription',
        fieldName: string,
        fieldConfig: GraphQLFieldConfig<any, any>
      ) => [renamer(operation, fieldName, fieldConfig), fieldConfig]
    );
  }

  public transformSchema(
    originalWrappingSchema: GraphQLSchema,
    subschemaConfig: SubschemaConfig<any, any, any, TContext>
  ): GraphQLSchema {
    return this.transformer.transformSchema(originalWrappingSchema, subschemaConfig);
  }

  public transformRequest(
    originalRequest: ExecutionRequest,
    delegationContext: DelegationContext<TContext>,
    transformationContext: RenameRootFieldsTransformationContext
  ): ExecutionRequest {
    return this.transformer.transformRequest(originalRequest, delegationContext, transformationContext);
  }
}
