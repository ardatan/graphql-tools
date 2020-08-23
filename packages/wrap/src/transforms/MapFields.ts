import { GraphQLSchema } from 'graphql';

import { Request, FieldNodeMappers, ExecutionResult } from '@graphql-tools/utils';

import { Transform, DelegationContext } from '@graphql-tools/delegate';

import { ObjectValueTransformerMap, ErrorsTransformer } from '../types';

import TransformCompositeFields from './TransformCompositeFields';

export default class MapFields implements Transform {
  private readonly transformer: TransformCompositeFields;

  constructor(
    fieldNodeTransformerMap: FieldNodeMappers,
    objectValueTransformerMap?: ObjectValueTransformerMap,
    errorsTransformer?: ErrorsTransformer
  ) {
    this.transformer = new TransformCompositeFields(
      () => undefined,
      (typeName, fieldName, fieldNode, fragments, transformationContext) => {
        const typeTransformers = fieldNodeTransformerMap[typeName];
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

            const typeName = data.__typename;
            if (typeName == null) {
              return data;
            }

            const transformer = objectValueTransformerMap[typeName];
            if (transformer == null) {
              return data;
            }

            return transformer(data, transformationContext);
          }
        : undefined,
      errorsTransformer != null ? errorsTransformer : undefined
    );
  }

  public transformSchema(schema: GraphQLSchema): GraphQLSchema {
    return this.transformer.transformSchema(schema);
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
