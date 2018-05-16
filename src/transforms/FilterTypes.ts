/* tslint:disable:no-unused-expression */

import { GraphQLSchema, GraphQLNamedType } from 'graphql';
import { Transform } from '../transforms/transforms';
import { visitSchema, VisitSchemaKind } from '../transforms/visitSchema';

export default class FilterTypes implements Transform {
  private filter: (type: GraphQLNamedType) => boolean;

  constructor(filter: (type: GraphQLNamedType) => boolean) {
    this.filter = filter;
  }

  public transformSchema(schema: GraphQLSchema): GraphQLSchema {
    return visitSchema(schema, {
      [VisitSchemaKind.TYPE]: (type: GraphQLNamedType) => {
        if (this.filter(type)) {
          return undefined;
        } else {
          return null;
        }
      },
    });
  }
}
