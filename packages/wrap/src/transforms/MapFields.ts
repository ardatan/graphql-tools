import { GraphQLSchema } from 'graphql';

import { Transform, Request, FieldNodeMappers, ExecutionResult } from '@graphql-tools/utils';

import TransformCompositeFields from './TransformCompositeFields';

import { ObjectValueTransformerMap, ErrorsTransformer } from '../types';

export default class MapFields implements Transform {
  private readonly transformer: TransformCompositeFields;

  constructor(
    fieldNodeTransformerMap: FieldNodeMappers,
    objectValueTransformerMap?: ObjectValueTransformerMap,
    errorsTransformer?: ErrorsTransformer
  ) {
    this.transformer = new TransformCompositeFields(
      (_typeName, _fieldName, fieldConfig) => fieldConfig,
      (typeName, fieldName, fieldNode, fragments, context) => {
        const typeTransformers = fieldNodeTransformerMap[typeName];
        if (typeTransformers == null) {
          return undefined;
        }

        const fieldNodeTransformer = typeTransformers[fieldName];
        if (fieldNodeTransformer == null) {
          return undefined;
        }

        return fieldNodeTransformer(fieldNode, fragments, context);
      },
      objectValueTransformerMap != null
        ? (data, context) => {
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

            return transformer(data, context);
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
    delegationContext?: Record<string, any>,
    transformationContext?: Record<string, any>
  ): Request {
    return this.transformer.transformRequest(originalRequest, delegationContext, transformationContext);
  }

  public transformResult(
    originalResult: ExecutionResult,
    delegationContext?: Record<string, any>,
    transformationContext?: Record<string, any>
  ): ExecutionResult {
    return this.transformer.transformResult(originalResult, delegationContext, transformationContext);
  }
}
