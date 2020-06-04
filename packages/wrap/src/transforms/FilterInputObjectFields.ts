import { GraphQLSchema, GraphQLInputFieldConfig } from 'graphql';

import { Transform, Request, InputFieldFilter } from '@graphql-tools/utils';

import TransformInputFields from './TransformInputFields';
import { DelegationContext } from 'packages/delegate/src';
import { InputObjectNodeTransformer } from '../types';

export default class FilterInputObjectFields implements Transform {
  private readonly transformer: TransformInputFields;

  constructor(filter: InputFieldFilter, inputObjectNodeTransformer?: InputObjectNodeTransformer) {
    this.transformer = new TransformInputFields(
      (typeName: string, fieldName: string, inputFieldConfig: GraphQLInputFieldConfig) =>
        filter(typeName, fieldName, inputFieldConfig) ? undefined : null,
      undefined,
      inputObjectNodeTransformer
    );
  }

  public transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
    return this.transformer.transformSchema(originalSchema);
  }

  public transformRequest(originalRequest: Request, delegationContext: DelegationContext): Request {
    return this.transformer.transformRequest(originalRequest, delegationContext);
  }
}
