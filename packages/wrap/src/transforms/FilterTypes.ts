import { GraphQLSchema, GraphQLNamedType } from 'graphql';

import { mapSchema, MapperKind } from '@graphql-tools/utils';

import { SubschemaConfig, Transform } from '@graphql-tools/delegate';

interface FilterTypesTransformationContext extends Record<string, any> {}

export default class FilterTypes<TContext = Record<string, any>>
  implements Transform<FilterTypesTransformationContext, TContext>
{
  private readonly filter: (type: GraphQLNamedType) => boolean;

  constructor(filter: (type: GraphQLNamedType) => boolean) {
    this.filter = filter;
  }

  public transformSchema(
    originalWrappingSchema: GraphQLSchema,
    _subschemaConfig: SubschemaConfig<any, any, any, TContext>
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
