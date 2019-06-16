import { GraphQLResolveInfo } from 'graphql';
import { checkResultAndHandleErrors } from '../stitching/checkResultAndHandleErrors';
import { Transform } from './transforms';

export default class CheckResultAndHandleErrors implements Transform {
  private info: GraphQLResolveInfo;
  private fieldName?: string;

  constructor(info: GraphQLResolveInfo, fieldName?: string) {
    this.info = info;
    this.fieldName = fieldName;
  }

  public transformResult(result: any): any {
    return checkResultAndHandleErrors(result, this.info, this.fieldName);
  }
}
