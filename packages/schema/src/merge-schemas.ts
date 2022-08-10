import { GraphQLSchema } from 'graphql';
import {
  IResolvers,
  asArray,
  getResolversFromSchema,
  TypeSource,
  SchemaExtensions,
  extractExtensionsFromSchema,
} from '@graphql-tools/utils';
import { makeExecutableSchema } from './makeExecutableSchema.js';
import { IExecutableSchemaDefinition } from './types.js';

/**
 * Configuration object for schema merging
 */
export type MergeSchemasConfig<T = any> = Partial<IExecutableSchemaDefinition<T>> & {
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
  const extractedTypeDefs: TypeSource[] = [];
  const extractedResolvers: IResolvers<any, any>[] = [];
  const extractedSchemaExtensions: SchemaExtensions[] = [];

  if (config.schemas != null) {
    for (const schema of config.schemas) {
      extractedTypeDefs.push(schema);
      extractedResolvers.push(getResolversFromSchema(schema));
      extractedSchemaExtensions.push(extractExtensionsFromSchema(schema));
    }
  }

  if (config.typeDefs != null) {
    extractedTypeDefs.push(config.typeDefs);
  }

  if (config.resolvers != null) {
    const additionalResolvers = asArray(config.resolvers);
    extractedResolvers.push(...additionalResolvers);
  }

  if (config.schemaExtensions != null) {
    const additionalSchemaExtensions = asArray(config.schemaExtensions);
    extractedSchemaExtensions.push(...additionalSchemaExtensions);
  }

  return makeExecutableSchema({
    ...config,
    typeDefs: extractedTypeDefs,
    resolvers: extractedResolvers,
    schemaExtensions: extractedSchemaExtensions,
  });
}
