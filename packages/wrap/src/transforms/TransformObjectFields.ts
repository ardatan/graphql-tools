import { GraphQLSchema, isObjectType, GraphQLFieldConfig } from 'graphql';

import { ExecutionRequest, ExecutionResult } from '@graphql-tools/utils';

import { Transform, DelegationContext, SubschemaConfig } from '@graphql-tools/delegate';

import { FieldTransformer, FieldNodeTransformer } from '../types.js';

import TransformCompositeFields from './TransformCompositeFields.js';

interface TransformObjectFieldsTransformationContext extends Record<string, any> {}

export default class TransformObjectFields<TContext = Record<string, any>>
  implements Transform<TransformObjectFieldsTransformationContext, TContext>
{
  private readonly objectFieldTransformer: FieldTransformer<TContext>;
  private readonly fieldNodeTransformer: FieldNodeTransformer | undefined;
  private transformer: TransformCompositeFields<TContext> | undefined;

  constructor(objectFieldTransformer: FieldTransformer<TContext>, fieldNodeTransformer?: FieldNodeTransformer) {
    this.objectFieldTransformer = objectFieldTransformer;
    this.fieldNodeTransformer = fieldNodeTransformer;
  }

  private _getTransformer() {
    const transformer = this.transformer;
    if (transformer === undefined) {
      throw new Error(
        `The TransformObjectFields transform's  "transformRequest" and "transformResult" methods cannot be used without first calling "transformSchema".`
      );
    }
    return transformer;
  }

  public transformSchema(
    originalWrappingSchema: GraphQLSchema,
    subschemaConfig: SubschemaConfig<any, any, any, TContext>
  ): GraphQLSchema {
    const compositeToObjectFieldTransformer = (
      typeName: string,
      fieldName: string,
      fieldConfig: GraphQLFieldConfig<any, TContext>
    ) => {
      if (isObjectType(originalWrappingSchema.getType(typeName))) {
        return this.objectFieldTransformer(typeName, fieldName, fieldConfig);
      }

      return undefined;
    };

    this.transformer = new TransformCompositeFields<TContext>(
      compositeToObjectFieldTransformer,
      this.fieldNodeTransformer
    );

    return this.transformer.transformSchema(originalWrappingSchema, subschemaConfig);
  }

  public transformRequest(
    originalRequest: ExecutionRequest,
    delegationContext: DelegationContext<TContext>,
    transformationContext: TransformObjectFieldsTransformationContext
  ): ExecutionRequest {
    return this._getTransformer().transformRequest(originalRequest, delegationContext, transformationContext);
  }

  public transformResult(
    originalResult: ExecutionResult,
    delegationContext: DelegationContext<TContext>,
    transformationContext: TransformObjectFieldsTransformationContext
  ): ExecutionResult {
    return this._getTransformer().transformResult(originalResult, delegationContext, transformationContext);
  }
}
