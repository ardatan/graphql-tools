import { Transform } from './transforms';
import { GraphQLEnumType } from 'graphql';

export default class ConvertEnumResponse implements Transform {
  private enumNode: GraphQLEnumType;

  constructor(enumNode: GraphQLEnumType) {
    this.enumNode = enumNode;
  }

  public transformResult(result: any) {
    const value = this.enumNode.getValue(result);
    if (value) {
      return value.value;
    }
    return result;
  }
}
