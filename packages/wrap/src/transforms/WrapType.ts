import { GraphQLSchema } from 'graphql';

import { Request, ExecutionResult } from '@graphql-tools/utils';

import { Transform, DelegationContext } from '@graphql-tools/delegate';

import WrapFields from './WrapFields';

export default class WrapType implements Transform {
  private readonly transformer: Transform;

  constructor(outerTypeName: string, innerTypeName: string, fieldName: string) {
    this.transformer = new WrapFields(outerTypeName, [fieldName], [innerTypeName]);
  }

  public transformSchema(schema: GraphQLSchema): GraphQLSchema {
    return this.transformer.transformSchema(schema);
  }

  public transformRequest(
    originalRequest: Request,
    delegationContext: DelegationContext,
    transformationContext: Record<string, any>
  ): Request {
    return this.transformer.transformRequest(originalRequest, delegationContext, transformationContext);
  }

  public transformResult(
    originalResult: ExecutionResult,
    delegationContext: DelegationContext,
    transformationContext: Record<string, any>
  ): ExecutionResult {
    return this.transformer.transformResult(originalResult, delegationContext, transformationContext);
  }
}
