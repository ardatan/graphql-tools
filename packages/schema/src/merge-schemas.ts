import { GraphQLSchema } from 'graphql';
import { extractExtensionsFromSchema, SchemaExtensions } from '@graphql-tools/merge';
import { IResolvers, asArray, getResolversFromSchema, TypeSource } from '@graphql-tools/utils';
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
  const extractedTypeDefs: TypeSource = asArray(config.typeDefs || []);
  const extractedResolvers: IResolvers<any, any>[] = [];
  const extractedSchemaExtensions: SchemaExtensions[] = asArray(config.schemaExtensions || []);

  const schemas = config.schemas || [];
  for (const schema of schemas) {
    extractedTypeDefs.push(schema);
    extractedResolvers.push(getResolversFromSchema(schema));
    extractedSchemaExtensions.push(extractExtensionsFromSchema(schema));
  }
  extractedResolvers.push(asArray(config.resolvers || []))
  
  return makeExecutableSchema({
    parseOptions: config,
    ...config,
    typeDefs: extractedTypeDefs,
    resolvers: extractedResolvers,
    schemaExtensions: extractedSchemaExtensions,
  });
}
