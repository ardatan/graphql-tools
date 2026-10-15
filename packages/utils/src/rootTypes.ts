import { ASTNode, GraphQLObjectType, GraphQLSchema, OperationTypeNode } from 'graphql';
import weakMemoizee from 'memoizee/weak.js';
import { createGraphQLError } from './errors.js';

export function getDefinedRootType(
  schema: GraphQLSchema,
  operation: OperationTypeNode,
  nodes?: ASTNode[],
): GraphQLObjectType {
  const rootTypeMap = getRootTypeMap(schema);
  const rootType = rootTypeMap.get(operation);
  if (rootType == null) {
    throw createGraphQLError(`Schema is not configured to execute ${operation} operation.`, {
      nodes,
    });
  }

  return rootType;
}

export const getRootTypeNames = weakMemoizee(function getRootTypeNames(
  schema: GraphQLSchema,
): Set<string> {
  const rootTypes = getRootTypes(schema);
  return new Set([...rootTypes].map(type => type.name));
});

export const getRootTypes = weakMemoizee(function getRootTypes(
  schema: GraphQLSchema,
): Set<GraphQLObjectType> {
  const rootTypeMap = getRootTypeMap(schema);
  return new Set(rootTypeMap.values());
});

export const getRootTypeMap = weakMemoizee(function getRootTypeMap(
  schema: GraphQLSchema,
): Map<OperationTypeNode, GraphQLObjectType> {
  const rootTypeMap: Map<OperationTypeNode, GraphQLObjectType> = new Map();

  const queryType = schema.getQueryType();
  if (queryType) {
    rootTypeMap.set('query' as OperationTypeNode, queryType);
  }

  const mutationType = schema.getMutationType();
  if (mutationType) {
    rootTypeMap.set('mutation' as OperationTypeNode, mutationType);
  }

  const subscriptionType = schema.getSubscriptionType();
  if (subscriptionType) {
    rootTypeMap.set('subscription' as OperationTypeNode, subscriptionType);
  }

  return rootTypeMap;
});
