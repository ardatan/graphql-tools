import { GraphQLSchema, GraphQLField } from 'graphql';

import { Transform, Request, FieldNodeTransformer, RootFieldTransformer } from '@graphql-tools/utils';

import TransformObjectFields from './TransformObjectFields';

export default class TransformRootFields implements Transform {
  private readonly transformer: TransformObjectFields;

  constructor(rootFieldTransformer: RootFieldTransformer, fieldNodeTransformer?: FieldNodeTransformer) {
    const rootToObjectFieldTransformer = (typeName: string, fieldName: string, field: GraphQLField<any, any>) => {
      if (typeName === 'Query' || typeName === 'Mutation' || typeName === 'Subscription') {
        return rootFieldTransformer(typeName, fieldName, field);
      }

      return undefined;
    };
    this.transformer = new TransformObjectFields(rootToObjectFieldTransformer, fieldNodeTransformer);
  }

  public transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
    return this.transformer.transformSchema(originalSchema);
  }

  public transformRequest(originalRequest: Request): Request {
    return this.transformer.transformRequest(originalRequest);
  }
}
