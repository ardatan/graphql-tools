import { GraphQLSchema } from 'graphql';

import { Transform, Request, FieldNodeMappers } from '@graphql-tools/utils';

import TransformCompositeFields from './TransformCompositeFields';

export default class MapFields implements Transform {
  private readonly transformer: TransformCompositeFields;

  constructor(fieldNodeTransformerMap: FieldNodeMappers) {
    this.transformer = new TransformCompositeFields(
      (_typeName, _fieldName, fieldConfig) => fieldConfig,
      (typeName, fieldName, fieldNode, fragments) => {
        const typeTransformers = fieldNodeTransformerMap[typeName];
        if (typeTransformers == null) {
          return fieldNode;
        }

        const fieldNodeTransformer = typeTransformers[fieldName];
        if (fieldNodeTransformer == null) {
          return fieldNode;
        }

        return fieldNodeTransformer(fieldNode, fragments);
      }
    );
  }

  public transformSchema(schema: GraphQLSchema): GraphQLSchema {
    return this.transformer.transformSchema(schema);
  }

  public transformRequest(request: Request): Request {
    return this.transformer.transformRequest(request);
  }
}
