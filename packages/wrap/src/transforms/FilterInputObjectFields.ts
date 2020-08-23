import { GraphQLSchema, GraphQLInputFieldConfig } from 'graphql';

import { Request, InputFieldFilter } from '@graphql-tools/utils';

import { Transform, DelegationContext } from '@graphql-tools/delegate';

import { InputObjectNodeTransformer } from '../types';

import TransformInputObjectFields from './TransformInputObjectFields';

export default class FilterInputObjectFields implements Transform {
  private readonly transformer: TransformInputObjectFields;

  constructor(filter: InputFieldFilter, inputObjectNodeTransformer?: InputObjectNodeTransformer) {
    this.transformer = new TransformInputObjectFields(
      (typeName: string, fieldName: string, inputFieldConfig: GraphQLInputFieldConfig) =>
        filter(typeName, fieldName, inputFieldConfig) ? undefined : null,
      undefined,
      inputObjectNodeTransformer
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
