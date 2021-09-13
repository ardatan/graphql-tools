import { GraphQLSchema } from 'graphql';
import { SubschemaConfig } from '@graphql-tools/delegate';
export declare function wrapSchema<TConfig = Record<string, any>>(
  subschemaConfig: SubschemaConfig<any, any, any, TConfig>
): GraphQLSchema;
