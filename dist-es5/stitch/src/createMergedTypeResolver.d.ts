import { MergedTypeResolver, MergedTypeResolverOptions } from '@graphql-tools/delegate';
export declare function createMergedTypeResolver<TContext = any>(
  mergedTypeResolverOptions: MergedTypeResolverOptions
): MergedTypeResolver<TContext> | undefined;
