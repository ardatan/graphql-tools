import { GraphQLSchema, GraphQLNamedType } from 'graphql';

import { mapSchema, MapperKind } from '@graphql-tools/utils';

import { SubschemaConfig, Transform } from '@graphql-tools/delegate';

export default class FilterTypes implements Transform {
  private readonly filter: (type: GraphQLNamedType) => boolean;

  constructor(filter: (type: GraphQLNamedType) => boolean) {
    this.filter = filter;
  }

  public transformSchema(
    originalWrappingSchema: GraphQLSchema,
    _subschemaConfig?: SubschemaConfig,
    _transforms?: Array<Transform>,
    _transformedSchema?: GraphQLSchema
  ): GraphQLSchema {
    return mapSchema(originalWrappingSchema, {
      [MapperKind.TYPE]: (type: GraphQLNamedType) => {
        if (this.filter(type)) {
          return undefined;
        }

        return null;
      },
    });
  }
}
