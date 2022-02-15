import { GraphQLSchema, GraphQLFieldConfig } from 'graphql';

import { ExecutionRequest, ExecutionResult } from '@graphql-tools/utils';

import { Transform, DelegationContext, SubschemaConfig } from '@graphql-tools/delegate';

import { RootFieldTransformer, FieldNodeTransformer } from '../types';

import TransformObjectFields from './TransformObjectFields';

export default class TransformRootFields<T = any, TContext = Record<string, any>> implements Transform<T, TContext> {
  private readonly rootFieldTransformer: RootFieldTransformer<TContext>;
  private readonly fieldNodeTransformer: FieldNodeTransformer | undefined;
  private transformer: TransformObjectFields<T, TContext> | undefined;

  constructor(rootFieldTransformer: RootFieldTransformer<TContext>, fieldNodeTransformer?: FieldNodeTransformer) {
    this.rootFieldTransformer = rootFieldTransformer;
    this.fieldNodeTransformer = fieldNodeTransformer;
  }

  private _getTransformer() {
    const transformer = this.transformer;
    if (transformer === undefined) {
      throw new Error(
        `The TransformRootFields transform's  "transformRequest" and "transformResult" methods cannot be used without first calling "transformSchema".`
      );
    }
    return transformer;
  }

  public transformSchema(
    originalWrappingSchema: GraphQLSchema,
    subschemaConfig: SubschemaConfig<any, any, any, TContext>,
    transformedSchema?: GraphQLSchema
  ): GraphQLSchema {
    const rootToObjectFieldTransformer = (
      typeName: string,
      fieldName: string,
      fieldConfig: GraphQLFieldConfig<any, any>
    ) => {
      if (typeName === originalWrappingSchema.getQueryType()?.name) {
        return this.rootFieldTransformer('Query', fieldName, fieldConfig);
      }

      if (typeName === originalWrappingSchema.getMutationType()?.name) {
        return this.rootFieldTransformer('Mutation', fieldName, fieldConfig);
      }

      if (typeName === originalWrappingSchema.getSubscriptionType()?.name) {
        return this.rootFieldTransformer('Subscription', fieldName, fieldConfig);
      }

      return undefined;
    };

    this.transformer = new TransformObjectFields<T, TContext>(rootToObjectFieldTransformer, this.fieldNodeTransformer);

    return this.transformer.transformSchema(originalWrappingSchema, subschemaConfig, transformedSchema);
  }

  public transformRequest(
    originalRequest: ExecutionRequest,
    delegationContext: DelegationContext,
    transformationContext: Record<string, any>
  ): ExecutionRequest {
    return this._getTransformer().transformRequest(originalRequest, delegationContext, transformationContext);
  }

  public transformResult(
    originalResult: ExecutionResult,
    delegationContext: DelegationContext,
    transformationContext: Record<string, any>
  ): ExecutionResult {
    return this._getTransformer().transformResult(originalResult, delegationContext, transformationContext);
  }
}
