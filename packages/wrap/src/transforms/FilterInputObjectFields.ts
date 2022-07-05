import { GraphQLSchema, GraphQLInputFieldConfig } from 'graphql';

import { ExecutionRequest, InputFieldFilter } from '@graphql-tools/utils';

import { Transform, DelegationContext, SubschemaConfig } from '@graphql-tools/delegate';

import { InputObjectNodeTransformer } from '../types.js';

import TransformInputObjectFields from './TransformInputObjectFields.js';

interface FilterInputObjectFieldsTransformationContext extends Record<string, any> {}

export default class FilterInputObjectFields<TContext = Record<string, any>>
  implements Transform<FilterInputObjectFieldsTransformationContext, TContext>
{
  private readonly transformer: TransformInputObjectFields<TContext>;

  constructor(filter: InputFieldFilter, inputObjectNodeTransformer?: InputObjectNodeTransformer) {
    this.transformer = new TransformInputObjectFields(
      (typeName: string, fieldName: string, inputFieldConfig: GraphQLInputFieldConfig) =>
        filter(typeName, fieldName, inputFieldConfig) ? undefined : null,
      undefined,
      inputObjectNodeTransformer
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
    transformationContext: FilterInputObjectFieldsTransformationContext
  ): ExecutionRequest {
    return this.transformer.transformRequest(originalRequest, delegationContext, transformationContext);
  }
}
