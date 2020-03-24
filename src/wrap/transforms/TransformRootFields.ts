import { GraphQLSchema, GraphQLField, GraphQLFieldConfig } from 'graphql';

import { Transform, Request, FieldNodeTransformer } from '../../Interfaces';

import TransformObjectFields from './TransformObjectFields';

export type RootTransformer = (
  operation: 'Query' | 'Mutation' | 'Subscription',
  fieldName: string,
  field: GraphQLField<any, any>,
) => GraphQLFieldConfig<any, any> | RenamedField | null | undefined;

type RenamedField = { name: string; field?: GraphQLFieldConfig<any, any> };

export default class TransformRootFields implements Transform {
  private readonly transformer: TransformObjectFields;

  constructor(
    rootFieldTransformer: RootTransformer,
    fieldNodeTransformer?: FieldNodeTransformer,
  ) {
    const rootToObjectFieldTransformer = (
      typeName: string,
      fieldName: string,
      field: GraphQLField<any, any>,
    ) => {
      if (
        typeName === 'Query' ||
        typeName === 'Mutation' ||
        typeName === 'Subscription'
      ) {
        return rootFieldTransformer(typeName, fieldName, field);
      }

      return undefined;
    };
    this.transformer = new TransformObjectFields(
      rootToObjectFieldTransformer,
      fieldNodeTransformer,
    );
  }

  public transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
    return this.transformer.transformSchema(originalSchema);
  }

  public transformRequest(originalRequest: Request): Request {
    return this.transformer.transformRequest(originalRequest);
  }
}
