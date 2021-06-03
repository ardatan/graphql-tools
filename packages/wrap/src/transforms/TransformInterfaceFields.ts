import { GraphQLSchema, isInterfaceType, GraphQLFieldConfig } from 'graphql';

import { Request, ExecutionResult } from '@graphql-tools/utils';

import { Transform, DelegationContext, SubschemaConfig } from '@graphql-tools/delegate';

import { FieldTransformer, FieldNodeTransformer } from '../types';

import TransformCompositeFields from './TransformCompositeFields';

export default class TransformInterfaceFields implements Transform {
  private readonly interfaceFieldTransformer: FieldTransformer;
  private readonly fieldNodeTransformer: FieldNodeTransformer | undefined;
  private transformer: TransformCompositeFields;

  constructor(interfaceFieldTransformer: FieldTransformer, fieldNodeTransformer?: FieldNodeTransformer) {
    this.interfaceFieldTransformer = interfaceFieldTransformer;
    this.fieldNodeTransformer = fieldNodeTransformer;
  }

  public transformSchema(
    originalWrappingSchema: GraphQLSchema,
    subschemaConfig: SubschemaConfig,
    transformedSchema?: GraphQLSchema
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

    this.transformer = new TransformCompositeFields(compositeToObjectFieldTransformer, this.fieldNodeTransformer);

    return this.transformer.transformSchema(originalWrappingSchema, subschemaConfig, transformedSchema);
  }

  public transformRequest(
    originalRequest: Request,
    delegationContext: DelegationContext,
    transformationContext: Record<string, any>
  ): Request {
    return this.transformer.transformRequest(originalRequest, delegationContext, transformationContext);
  }

  public transformResult(
    originalResult: ExecutionResult,
    delegationContext: DelegationContext,
    transformationContext: Record<string, any>
  ): ExecutionResult {
    return this.transformer.transformResult(originalResult, delegationContext, transformationContext);
  }
}
