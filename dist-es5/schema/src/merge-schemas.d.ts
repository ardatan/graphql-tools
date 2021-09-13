import { GraphQLSchema } from 'graphql';
import { IExecutableSchemaDefinition } from './types';
/**
 * Configuration object for schema merging
 */
export declare type MergeSchemasConfig<T = any> = Partial<IExecutableSchemaDefinition<T>> &
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
export declare function mergeSchemas(config: MergeSchemasConfig): GraphQLSchema;
