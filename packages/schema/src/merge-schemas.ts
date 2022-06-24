import { GraphQLSchema } from 'graphql';
import { extractExtensionsFromSchema, SchemaExtensions } from '@graphql-tools/merge';
import { IResolvers, asArray, getResolversFromSchema, TypeSource } from '@graphql-tools/utils';
import { makeExecutableSchema } from './makeExecutableSchema.js';
import { IExecutableSchemaDefinition } from './types.js';

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
  const extractedTypeDefs: TypeSource = asArray(config.typeDefs || []);
  const extractedResolvers: IResolvers<any, any>[] = asArray(config.resolvers || []);
  const extractedSchemaExtensions: SchemaExtensions[] = asArray(config.schemaExtensions || []);

  const schemas = config.schemas || [];
  for (const schema of schemas) {
    extractedTypeDefs.push(schema);
    extractedResolvers.push(getResolversFromSchema(schema, true));
    extractedSchemaExtensions.push(extractExtensionsFromSchema(schema));
  }

  return makeExecutableSchema({
    parseOptions: config,
    ...config,
    typeDefs: extractedTypeDefs,
    resolvers: extractedResolvers,
    schemaExtensions: extractedSchemaExtensions,
  });
}
