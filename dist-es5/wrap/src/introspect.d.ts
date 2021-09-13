import { GraphQLSchema, buildClientSchema, IntrospectionOptions, ParseOptions } from 'graphql';
import { AsyncExecutor, SyncExecutor } from '@graphql-tools/utils';
export declare function introspectSchema(
  executor: SyncExecutor,
  context?: Record<string, any>,
  options?: Partial<IntrospectionOptions> & Parameters<typeof buildClientSchema>[1] & ParseOptions
): GraphQLSchema;
export declare function introspectSchema(
  executor: AsyncExecutor,
  context?: Record<string, any>,
  options?: Partial<IntrospectionOptions> & Parameters<typeof buildClientSchema>[1] & ParseOptions
): Promise<GraphQLSchema>;
