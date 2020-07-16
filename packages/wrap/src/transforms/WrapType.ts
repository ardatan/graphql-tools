import { GraphQLSchema } from 'graphql';

import { Transform, Request, ExecutionResult } from '@graphql-tools/utils';

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
    delegationContext?: Record<string, any>,
    transformationContext?: Record<string, any>
  ): Request {
    return this.transformer.transformRequest(originalRequest, delegationContext, transformationContext);
  }

  public transformResult(
    originalResult: ExecutionResult,
    delegationContext?: Record<string, any>,
    transformationContext?: Record<string, any>
  ): ExecutionResult {
    return this.transformer.transformResult(originalResult, delegationContext, transformationContext);
  }
}
