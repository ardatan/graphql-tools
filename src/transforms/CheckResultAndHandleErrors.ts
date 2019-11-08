import { GraphQLResolveInfo, GraphQLSchema } from 'graphql';
import { checkResultAndHandleErrors } from '../stitching/checkResultAndHandleErrors';
import { Transform } from './transforms';
import { SubschemaConfig } from '../Interfaces';

export default class CheckResultAndHandleErrors implements Transform {
  private info: GraphQLResolveInfo;
  private fieldName?: string;
  private subschema?: GraphQLSchema | SubschemaConfig;

  constructor(
    info: GraphQLResolveInfo,
    fieldName?: string,
    subschema?: GraphQLSchema | SubschemaConfig
  ) {
    this.info = info;
    this.fieldName = fieldName;
    this.subschema = subschema;
  }

  public transformResult(result: any): any {
    return checkResultAndHandleErrors(
      result,
      this.info,
      this.fieldName,
      this.subschema
    );
  }
}
