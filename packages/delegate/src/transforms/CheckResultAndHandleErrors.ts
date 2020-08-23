import { GraphQLResolveInfo, GraphQLOutputType, GraphQLSchema } from 'graphql';

import { getResponseKeyFromInfo, ExecutionResult } from '@graphql-tools/utils';
import { resolveExternalValue } from '../resolveExternalValue';
import { SubschemaConfig, Transform, DelegationContext } from '../types';

export default class CheckResultAndHandleErrors implements Transform {
  private readonly context?: Record<string, any>;
  private readonly info: GraphQLResolveInfo;
  private readonly fieldName?: string;
  private readonly subschema?: GraphQLSchema | SubschemaConfig;
  private readonly returnType?: GraphQLOutputType;
  private readonly typeMerge?: boolean;

  constructor(
    info: GraphQLResolveInfo,
    fieldName?: string,
    subschema?: GraphQLSchema | SubschemaConfig,
    context?: Record<string, any>,
    returnType: GraphQLOutputType = info.returnType,
    typeMerge?: boolean
  ) {
    this.context = context;
    this.info = info;
    this.fieldName = fieldName;
    this.subschema = subschema;
    this.returnType = returnType;
    this.typeMerge = typeMerge;
  }

  public transformResult(
    originalResult: ExecutionResult,
    _delegationContext: DelegationContext,
    _transformationContext: Record<string, any>
  ): ExecutionResult {
    return checkResultAndHandleErrors(
      originalResult,
      this.context != null ? this.context : {},
      this.info,
      this.fieldName,
      this.subschema,
      this.returnType,
      this.typeMerge
    );
  }
}

export function checkResultAndHandleErrors(
  result: ExecutionResult,
  context: Record<string, any>,
  info: GraphQLResolveInfo,
  responseKey: string = getResponseKeyFromInfo(info),
  subschema?: GraphQLSchema | SubschemaConfig,
  returnType: GraphQLOutputType = info.returnType,
  skipTypeMerging?: boolean
): any {
  const errors = result.errors != null ? result.errors : [];
  const data = result.data != null ? result.data[responseKey] : undefined;

  return resolveExternalValue(data, errors, subschema, context, info, returnType, skipTypeMerging);
}
