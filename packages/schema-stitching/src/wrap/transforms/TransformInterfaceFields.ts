import { GraphQLSchema, GraphQLField, isInterfaceType } from 'graphql';

import { Transform, Request, FieldTransformer, FieldNodeTransformer } from '../../Interfaces';

import TransformCompositeFields from './TransformCompositeFields';

export default class TransformInterfaceFields implements Transform {
  private readonly interfaceFieldTransformer: FieldTransformer;
  private readonly fieldNodeTransformer: FieldNodeTransformer;
  private transformer: TransformCompositeFields;

  constructor(interfaceFieldTransformer: FieldTransformer, fieldNodeTransformer?: FieldNodeTransformer) {
    this.interfaceFieldTransformer = interfaceFieldTransformer;
    this.fieldNodeTransformer = fieldNodeTransformer;
  }

  public transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
    const compositeToObjectFieldTransformer = (typeName: string, fieldName: string, field: GraphQLField<any, any>) => {
      if (isInterfaceType(originalSchema.getType(typeName))) {
        return this.interfaceFieldTransformer(typeName, fieldName, field);
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
