import { GraphQLNamedType, GraphQLObjectType } from 'graphql';
import { Maybe } from './types';
export declare function getObjectTypeFromTypeMap(
  typeMap: Record<string, GraphQLNamedType>,
  type: Maybe<GraphQLObjectType>
): GraphQLObjectType | undefined;
