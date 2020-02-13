import { GraphQLSchema, GraphQLOutputType } from 'graphql';

import { checkResultAndHandleErrors } from '../stitching/checkResultAndHandleErrors';
import { SubschemaConfig, IGraphQLToolsResolveInfo } from '../Interfaces';

import { Transform } from './transforms';

export default class CheckResultAndHandleErrors implements Transform {
  private readonly context?: Record<string, any>;
  private readonly info: IGraphQLToolsResolveInfo;
  private readonly fieldName?: string;
  private readonly subschema?: GraphQLSchema | SubschemaConfig;
  private readonly returnType?: GraphQLOutputType;
  private readonly typeMerge?: boolean;

  constructor(
    info: IGraphQLToolsResolveInfo,
    fieldName?: string,
    subschema?: GraphQLSchema | SubschemaConfig,
    context?: Record<string, any>,
    returnType: GraphQLOutputType = info.returnType,
    typeMerge?: boolean,
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
      this.typeMerge,
    );
  }
}
