import { GraphQLSchema, GraphQLField, isObjectType } from 'graphql';

import { Transform, Request } from '@graphql-tools/utils';
import { FieldTransformer, FieldNodeTransformer } from '../types';

import TransformCompositeFields from './TransformCompositeFields';

export default class TransformObjectFields implements Transform {
  private readonly objectFieldTransformer: FieldTransformer;
  private readonly fieldNodeTransformer: FieldNodeTransformer;
  private transformer: TransformCompositeFields;

  constructor(objectFieldTransformer: FieldTransformer, fieldNodeTransformer?: FieldNodeTransformer) {
    this.objectFieldTransformer = objectFieldTransformer;
    this.fieldNodeTransformer = fieldNodeTransformer;
  }

  public transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
    const compositeToObjectFieldTransformer = (typeName: string, fieldName: string, field: GraphQLField<any, any>) => {
      if (isObjectType(originalSchema.getType(typeName))) {
        return this.objectFieldTransformer(typeName, fieldName, field);
      }

      return undefined;
    };

    this.transformer = new TransformCompositeFields(compositeToObjectFieldTransformer, this.fieldNodeTransformer);

    return this.transformer.transformSchema(originalSchema);
  }

  public transformRequest(originalRequest: Request): Request {
    return this.transformer.transformRequest(originalRequest);
  }
}
