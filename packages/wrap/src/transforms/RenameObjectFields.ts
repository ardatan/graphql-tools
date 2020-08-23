import { GraphQLSchema, GraphQLFieldConfig } from 'graphql';

import { Request } from '@graphql-tools/utils';

import { Transform, DelegationContext } from '@graphql-tools/delegate';

import TransformObjectFields from './TransformObjectFields';

export default class RenameObjectFields implements Transform {
  private readonly transformer: TransformObjectFields;

  constructor(renamer: (typeName: string, fieldName: string, fieldConfig: GraphQLFieldConfig<any, any>) => string) {
    this.transformer = new TransformObjectFields(
      (typeName: string, fieldName: string, fieldConfig: GraphQLFieldConfig<any, any>) => [
        renamer(typeName, fieldName, fieldConfig),
        fieldConfig,
      ]
    );
  }

  public transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
    return this.transformer.transformSchema(originalSchema);
  }

  public transformRequest(
    originalRequest: Request,
    delegationContext: DelegationContext,
    transformationContext: Record<string, any>
  ): Request {
    return this.transformer.transformRequest(originalRequest, delegationContext, transformationContext);
  }
}
