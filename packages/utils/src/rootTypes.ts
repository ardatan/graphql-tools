import { GraphQLObjectType, GraphQLSchema, OperationTypeNode } from 'graphql';
import { Maybe } from './types';

export function getDefinedRootType(schema: GraphQLSchema, operation: OperationTypeNode): GraphQLObjectType {
  let rootType: Maybe<GraphQLObjectType>;
  if (operation === 'query') {
    rootType = schema.getQueryType();
  } else if (operation === 'mutation') {
    rootType = schema.getMutationType();
  } else if (operation === 'subscription') {
    rootType = schema.getSubscriptionType();
  } else {
    // Future proof against new operation types
    throw new Error(`Unknown operation "${operation}", cannot get root type.`);
  }

  if (rootType == null) {
    throw new Error(`Root type for operation "${operation}" not defined by the given schema.`);
  }

  return rootType;
}

export function getRootTypeNames(schema: GraphQLSchema): Set<string> {
  const rootTypeNames: Set<string> = new Set();
  const queryType = schema.getQueryType();
  const mutationType = schema.getMutationType();
  const subscriptionType = schema.getSubscriptionType();

  for (const rootType of [queryType, mutationType, subscriptionType]) {
    if (rootType) {
      rootTypeNames.add(rootType.name);
    }
  }

  return rootTypeNames;
}

export function getRootTypes(schema: GraphQLSchema): Set<GraphQLObjectType> {
  const rootTypes: Set<GraphQLObjectType> = new Set();
  const queryType = schema.getQueryType();
  const mutationType = schema.getMutationType();
  const subscriptionType = schema.getSubscriptionType();

  for (const rootType of [queryType, mutationType, subscriptionType]) {
    if (rootType) {
      rootTypes.add(rootType);
    }
  }

  return rootTypes;
}

export function getRootTypeMap(schema: GraphQLSchema): Map<OperationTypeNode, GraphQLObjectType> {
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
}
