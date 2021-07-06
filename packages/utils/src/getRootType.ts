import { GraphQLObjectType, GraphQLSchema, OperationTypeNode } from 'graphql';

import { Maybe } from './types';

export function getRootType(schema: GraphQLSchema, operation: OperationTypeNode): Maybe<GraphQLObjectType> {
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

  return rootType;
}
