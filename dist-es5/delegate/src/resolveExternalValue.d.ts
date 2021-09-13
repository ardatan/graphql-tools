import { GraphQLResolveInfo, GraphQLError, GraphQLSchema, GraphQLOutputType } from 'graphql';
import { SubschemaConfig } from './types';
export declare function resolveExternalValue(
  result: any,
  unpathedErrors: Array<GraphQLError>,
  subschema: GraphQLSchema | SubschemaConfig,
  context?: Record<string, any>,
  info?: GraphQLResolveInfo,
  returnType?: GraphQLOutputType,
  skipTypeMerging?: boolean
): any;
