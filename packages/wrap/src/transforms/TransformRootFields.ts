import { GraphQLSchema, GraphQLFieldConfig } from 'graphql';

import { Transform, Request } from '@graphql-tools/utils';

import TransformObjectFields from './TransformObjectFields';
import { RootFieldTransformer, FieldNodeTransformer } from '../types';

export default class TransformRootFields implements Transform {
  private readonly transformer: TransformObjectFields;

  constructor(rootFieldTransformer: RootFieldTransformer, fieldNodeTransformer?: FieldNodeTransformer) {
    const rootToObjectFieldTransformer = (
      typeName: string,
      fieldName: string,
      fieldConfig: GraphQLFieldConfig<any, any>
    ) => {
      if (typeName === 'Query' || typeName === 'Mutation' || typeName === 'Subscription') {
        return rootFieldTransformer(typeName, fieldName, fieldConfig);
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
