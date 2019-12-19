/* tslint:disable:no-unused-expression */

import { GraphQLSchema } from 'graphql';
import { Request } from '../Interfaces';
import { Transform } from './transforms';
import { default as WrapFields } from './WrapFields';

export default class WrapType implements Transform {
  private transformer: Transform;

  constructor(
    outerTypeName: string,
    innerTypeName: string,
    fieldName: string
  ) {
    this.transformer = new WrapFields(outerTypeName, [fieldName], [innerTypeName]);
  }

  public transformSchema(schema: GraphQLSchema): GraphQLSchema {
    return this.transformer.transformSchema(schema);
  }

  public transformRequest(originalRequest: Request): Request {
    return this.transformer.transformRequest(originalRequest);
  }
}
