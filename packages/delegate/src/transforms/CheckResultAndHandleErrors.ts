import { GraphQLResolveInfo, ExecutionResult, GraphQLOutputType, GraphQLSchema, responsePathAsArray } from 'graphql';

import { Transform, getResponseKeyFromInfo, toGraphQLErrors } from '@graphql-tools/utils';
import { handleResult } from '../results/handleResult';
import { SubschemaConfig } from '../types';

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

  public transformResult(result: any): any {
    return checkResultAndHandleErrors(
      result,
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
  const sourcePath = info != null ? responsePathAsArray(info.path) : [];
  const errors = result.errors != null ? toGraphQLErrors(result.errors, sourcePath) : [];
  const data = result.data != null ? result.data[responseKey] : undefined;

  return handleResult(data, errors, sourcePath.length - 1, subschema, context, info, returnType, skipTypeMerging);
}
