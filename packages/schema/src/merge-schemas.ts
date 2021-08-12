import { GraphQLSchema } from 'graphql';
import { extractExtensionsFromSchema, SchemaExtensions } from '@graphql-tools/merge';
import { IResolvers, asArray, getResolversFromSchema } from '@graphql-tools/utils';
import { makeExecutableSchema } from './makeExecutableSchema';
import { IExecutableSchemaDefinition } from './types';

/**
 * Configuration object for schema merging
 */
export type MergeSchemasConfig<T = any> = Partial<IExecutableSchemaDefinition<T>> &
  IExecutableSchemaDefinition<T>['parseOptions'] & {
    /**
     * The schemas to be merged
     */
    schemas?: GraphQLSchema[];
  };

/**
 * Synchronously merges multiple schemas, typeDefinitions and/or resolvers into a single schema.
 * @param config Configuration object
 */
export function mergeSchemas(config: MergeSchemasConfig) {
  const extractedResolvers: IResolvers<any, any>[] = [];
  const extractedExtensions: SchemaExtensions[] = asArray(config.extensions || []);

  const schemas = config.schemas || [];
  for (const schema of config.schemas || []) {
    extractedResolvers.push(getResolversFromSchema(schema));
    extractedExtensions.push(extractExtensionsFromSchema(schema));
  }

  return makeExecutableSchema({
    parseOptions: config,
    ...config,
    typeDefs: asArray(config.typeDefs || []).concat(schemas),
    resolvers: asArray(config.resolvers || []).concat(extractedResolvers),
    extensions: asArray(config.extensions || []).concat(extractedExtensions),
  });
}

/**
 * Asynchronously merges multiple schemas, typeDefinitions and/or resolvers into a single schema.
 * @param config Configuration object
 */
export async function mergeSchemasAsync(config: MergeSchemasConfig) {
  const schemas = config.schemas || [];
  const [extractedResolvers, extractedExtensions] = await Promise.all([
    Promise.all(schemas.map(async schema => getResolversFromSchema(schema))),
    Promise.all(schemas.map(async schema => extractExtensionsFromSchema(schema))),
  ]);

  return makeExecutableSchema({
    ...config,
    typeDefs: asArray(config.typeDefs || []).concat(config.schemas || []),
    resolvers: asArray(config.resolvers || []).concat(extractedResolvers),
    extensions: asArray(config.extensions || []).concat(extractedExtensions),
  });
}
