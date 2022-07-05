import { GraphQLSchema, isInterfaceType, GraphQLFieldConfig } from 'graphql';

import { ExecutionRequest, ExecutionResult } from '@graphql-tools/utils';

import { Transform, DelegationContext, SubschemaConfig } from '@graphql-tools/delegate';

import { FieldTransformer, FieldNodeTransformer } from '../types.js';

import TransformCompositeFields from './TransformCompositeFields.js';

interface TransformInterfaceFieldsTransformationContext extends Record<string, any> {}

export default class TransformInterfaceFields<TContext = Record<string, any>>
  implements Transform<TransformInterfaceFieldsTransformationContext, TContext>
{
  private readonly interfaceFieldTransformer: FieldTransformer<TContext>;
  private readonly fieldNodeTransformer: FieldNodeTransformer | undefined;
  private transformer: TransformCompositeFields<TContext> | undefined;

  constructor(interfaceFieldTransformer: FieldTransformer<TContext>, fieldNodeTransformer?: FieldNodeTransformer) {
    this.interfaceFieldTransformer = interfaceFieldTransformer;
    this.fieldNodeTransformer = fieldNodeTransformer;
  }

  private _getTransformer() {
    const transformer = this.transformer;
    if (transformer === undefined) {
      throw new Error(
        `The TransformInterfaceFields transform's  "transformRequest" and "transformResult" methods cannot be used without first calling "transformSchema".`
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
      fieldConfig: GraphQLFieldConfig<any, any>
    ) => {
      if (isInterfaceType(originalWrappingSchema.getType(typeName))) {
        return this.interfaceFieldTransformer(typeName, fieldName, fieldConfig);
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
    transformationContext: TransformInterfaceFieldsTransformationContext
  ): ExecutionRequest {
    return this._getTransformer().transformRequest(originalRequest, delegationContext, transformationContext);
  }

  public transformResult(
    originalResult: ExecutionResult,
    delegationContext: DelegationContext<TContext>,
    transformationContext: TransformInterfaceFieldsTransformationContext
  ): ExecutionResult {
    return this._getTransformer().transformResult(originalResult, delegationContext, transformationContext);
  }
}
