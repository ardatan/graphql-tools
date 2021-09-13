import { GraphQLSchema } from 'graphql';
import { SubschemaConfig } from './types';
export declare function applySchemaTransforms(
  originalWrappingSchema: GraphQLSchema,
  subschemaConfig: SubschemaConfig<any, any, any, any>,
  transformedSchema?: GraphQLSchema
): GraphQLSchema;
