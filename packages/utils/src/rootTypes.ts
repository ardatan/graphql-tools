import { ASTNode, GraphQLObjectType, GraphQLSchema, OperationTypeNode } from 'graphql';
import { createGraphQLError } from './errors.js';
import { memoize1 } from './memoize.js';

export function getDefinedRootType(
  schema: GraphQLSchema,
  operation: OperationTypeNode,
  nodes?: ASTNode[]
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

export const getRootTypeNames = memoize1(function getRootTypeNames(schema: GraphQLSchema): Set<string> {
  const rootTypes = getRootTypes(schema);
  return new Set([...rootTypes].map(type => type.name));
});

export const getRootTypes = memoize1(function getRootTypes(schema: GraphQLSchema): Set<GraphQLObjectType> {
  const rootTypeMap = getRootTypeMap(schema);
  return new Set(rootTypeMap.values());
});

export const getRootTypeMap = memoize1(function getRootTypeMap(
  schema: GraphQLSchema
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
