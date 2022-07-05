import { GraphQLSchema } from 'graphql';

import { ExecutionRequest, FieldNodeMappers, ExecutionResult } from '@graphql-tools/utils';

import { Transform, DelegationContext, SubschemaConfig } from '@graphql-tools/delegate';

import { ObjectValueTransformerMap, ErrorsTransformer } from '../types.js';

import TransformCompositeFields from './TransformCompositeFields.js';

interface MapFieldsTransformationContext extends Record<string, any> {}

export default class MapFields<TContext> implements Transform<MapFieldsTransformationContext, TContext> {
  private fieldNodeTransformerMap: FieldNodeMappers;
  private objectValueTransformerMap?: ObjectValueTransformerMap;
  private errorsTransformer?: ErrorsTransformer;
  private transformer: TransformCompositeFields<TContext> | undefined;

  constructor(
    fieldNodeTransformerMap: FieldNodeMappers,
    objectValueTransformerMap?: ObjectValueTransformerMap,
    errorsTransformer?: ErrorsTransformer
  ) {
    this.fieldNodeTransformerMap = fieldNodeTransformerMap;
    this.objectValueTransformerMap = objectValueTransformerMap;
    this.errorsTransformer = errorsTransformer;
  }

  private _getTransformer() {
    const transformer = this.transformer;
    if (transformer === undefined) {
      throw new Error(
        `The MapFields transform's  "transformRequest" and "transformResult" methods cannot be used without first calling "transformSchema".`
      );
    }
    return transformer;
  }

  public transformSchema(
    originalWrappingSchema: GraphQLSchema,
    subschemaConfig: SubschemaConfig<any, any, any, TContext>
  ): GraphQLSchema {
    const subscriptionTypeName = originalWrappingSchema.getSubscriptionType()?.name;
    const objectValueTransformerMap = this.objectValueTransformerMap;
    this.transformer = new TransformCompositeFields(
      () => undefined,
      (typeName, fieldName, fieldNode, fragments, transformationContext) => {
        const typeTransformers = this.fieldNodeTransformerMap[typeName];
        if (typeTransformers == null) {
          return undefined;
        }

        const fieldNodeTransformer = typeTransformers[fieldName];
        if (fieldNodeTransformer == null) {
          return undefined;
        }

        return fieldNodeTransformer(fieldNode, fragments, transformationContext);
      },
      objectValueTransformerMap != null
        ? (data, transformationContext) => {
            if (data == null) {
              return data;
            }

            let typeName = data.__typename;
            if (typeName == null) {
              // see https://github.com/ardatan/graphql-tools/issues/2282
              typeName = subscriptionTypeName;
              if (typeName == null) {
                return data;
              }
            }

            const transformer = objectValueTransformerMap[typeName];
            if (transformer == null) {
              return data;
            }

            return transformer(data, transformationContext);
          }
        : undefined,
      this.errorsTransformer != null ? this.errorsTransformer : undefined
    );
    return this.transformer.transformSchema(originalWrappingSchema, subschemaConfig);
  }

  public transformRequest(
    originalRequest: ExecutionRequest,
    delegationContext: DelegationContext<TContext>,
    transformationContext: MapFieldsTransformationContext
  ): ExecutionRequest {
    return this._getTransformer().transformRequest(originalRequest, delegationContext, transformationContext);
  }

  public transformResult(
    originalResult: ExecutionResult,
    delegationContext: DelegationContext<TContext>,
    transformationContext: MapFieldsTransformationContext
  ): ExecutionResult {
    return this._getTransformer().transformResult(originalResult, delegationContext, transformationContext);
  }
}
