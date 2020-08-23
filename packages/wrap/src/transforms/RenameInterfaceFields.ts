import { GraphQLSchema, GraphQLFieldConfig } from 'graphql';

import { Request } from '@graphql-tools/utils';

import { Transform, DelegationContext } from '@graphql-tools/delegate';

import TransformInterfaceFields from './TransformInterfaceFields';

export default class RenameInterfaceFields implements Transform {
  private readonly transformer: TransformInterfaceFields;

  constructor(renamer: (typeName: string, fieldName: string, fieldConfig: GraphQLFieldConfig<any, any>) => string) {
    this.transformer = new TransformInterfaceFields(
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
