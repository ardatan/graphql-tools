import { GraphQLSchema } from 'graphql';
import { IStitchSchemasOptions } from './types';
export declare function stitchSchemas<TContext = Record<string, any>>({
  subschemas,
  types,
  typeDefs,
  onTypeConflict,
  mergeDirectives,
  mergeTypes,
  typeMergingOptions,
  subschemaConfigTransforms,
  resolvers,
  inheritResolversFromInterfaces,
  resolverValidationOptions,
  parseOptions,
  pruningOptions,
  updateResolversInPlace,
  schemaExtensions,
}: IStitchSchemasOptions<TContext>): GraphQLSchema;
