import { GraphQLSchema } from 'graphql';

import { ExecutionRequest, ExecutionResult } from '@graphql-tools/utils';

import { Transform, DelegationContext, SubschemaConfig } from '@graphql-tools/delegate';

import WrapFields from './WrapFields.js';

interface WrapTypeTransformationContext extends Record<string, any> {}

export default class WrapType<TContext extends Record<string, any> = Record<string, any>>
  implements Transform<WrapTypeTransformationContext, TContext>
{
  private readonly transformer: WrapFields<TContext>;

  constructor(outerTypeName: string, innerTypeName: string, fieldName: string) {
    this.transformer = new WrapFields(outerTypeName, [fieldName], [innerTypeName]);
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
    transformationContext: WrapTypeTransformationContext
  ): ExecutionRequest {
    return this.transformer.transformRequest(originalRequest, delegationContext, transformationContext as any);
  }

  public transformResult(
    originalResult: ExecutionResult,
    delegationContext: DelegationContext<TContext>,
    transformationContext: WrapTypeTransformationContext
  ): ExecutionResult {
    return this.transformer.transformResult(originalResult, delegationContext, transformationContext as any);
  }
}
