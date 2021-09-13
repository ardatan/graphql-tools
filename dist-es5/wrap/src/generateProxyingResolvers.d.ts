import { GraphQLFieldResolver } from 'graphql';
import { SubschemaConfig, ICreateProxyingResolverOptions } from '@graphql-tools/delegate';
export declare function generateProxyingResolvers<TContext>(
  subschemaConfig: SubschemaConfig<any, any, any, TContext>
): Record<string, Record<string, GraphQLFieldResolver<any, any>>>;
export declare function defaultCreateProxyingResolver<TContext>({
  subschemaConfig,
  operation,
  transformedSchema,
}: ICreateProxyingResolverOptions<TContext>): GraphQLFieldResolver<any, any>;
