import { GraphQLSchema } from 'graphql';
import { ObjectFieldFilter } from '@graphql-tools/utils';
import { SubschemaConfig, Transform } from '@graphql-tools/delegate';
export default class FilterObjectFields implements Transform {
  private readonly transformer;
  constructor(filter: ObjectFieldFilter);
  transformSchema(
    originalWrappingSchema: GraphQLSchema,
    subschemaConfig: SubschemaConfig,
    transformedSchema?: GraphQLSchema
  ): GraphQLSchema;
}
