import { GraphQLSchema } from 'graphql';

import { Request } from '../Interfaces';

import { Transform } from './transforms';
import WrapFields from './WrapFields';

export default class WrapType implements Transform {
  private readonly transformer: Transform;

  constructor(
    outerTypeName: string,
    innerTypeName: string,
    fieldName: string,
  ) {
    this.transformer = new WrapFields(
      outerTypeName,
      [fieldName],
      [innerTypeName],
      undefined,
    );
  }

  public transformSchema(schema: GraphQLSchema): GraphQLSchema {
    return this.transformer.transformSchema(schema);
  }

  public transformRequest(originalRequest: Request): Request {
    return this.transformer.transformRequest(originalRequest);
  }
}
