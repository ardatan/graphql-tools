import { GraphQLObjectType, GraphQLSchema, OperationTypeNode } from 'graphql';
import { memoize1 } from './memoize';

export function getDefinedRootType(schema: GraphQLSchema, operation: OperationTypeNode): GraphQLObjectType {
  const rootTypeMap = getRootTypeMap(schema);
  const rootType = rootTypeMap.get(operation);
  if (rootType == null) {
    throw new Error(`Root type for operation "${operation}" not defined by the given schema.`);
  }

  return rootType;
}

export const getRootTypeNames = memoize1(function getRootTypeNames(schema: GraphQLSchema): Set<string> {
  const rootTypeMap = getRootTypeMap(schema);
  return new Set(rootTypeMap.keys());
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
    rootTypeMap.set('query', queryType);
  }

  const mutationType = schema.getMutationType();
  if (mutationType) {
    rootTypeMap.set('mutation', mutationType);
  }

  const subscriptionType = schema.getSubscriptionType();
  if (subscriptionType) {
    rootTypeMap.set('subscription', subscriptionType);
  }

  return rootTypeMap;
});
