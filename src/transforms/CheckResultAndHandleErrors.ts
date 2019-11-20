import { GraphQLSchema } from 'graphql';
import { checkResultAndHandleErrors } from '../stitching/checkResultAndHandleErrors';
import { Transform } from './transforms';
import { SubschemaConfig, IGraphQLToolsResolveInfo } from '../Interfaces';

export default class CheckResultAndHandleErrors implements Transform {
  private context?: Record<string, any>;
  private info: IGraphQLToolsResolveInfo;
  private fieldName?: string;
  private subschema?: GraphQLSchema | SubschemaConfig;

  constructor(
    info: IGraphQLToolsResolveInfo,
    fieldName?: string,
    subschema?: GraphQLSchema | SubschemaConfig,
    context?: Record<string, any>,
  ) {
    this.context = context;
    this.info = info;
    this.fieldName = fieldName;
    this.subschema = subschema;
  }

  public transformResult(result: any): any {
    return checkResultAndHandleErrors(
      result,
      this.context,
      this.info,
      this.fieldName,
      this.subschema
    );
  }
}
