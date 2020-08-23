import { GraphQLSchema, GraphQLNamedType } from 'graphql';

import { mapSchema, MapperKind } from '@graphql-tools/utils';

import { Transform } from '@graphql-tools/delegate';

export default class FilterTypes implements Transform {
  private readonly filter: (type: GraphQLNamedType) => boolean;

  constructor(filter: (type: GraphQLNamedType) => boolean) {
    this.filter = filter;
  }

  public transformSchema(schema: GraphQLSchema): GraphQLSchema {
    return mapSchema(schema, {
      [MapperKind.TYPE]: (type: GraphQLNamedType) => {
        if (this.filter(type)) {
          return undefined;
        }

        return null;
      },
    });
  }
}
