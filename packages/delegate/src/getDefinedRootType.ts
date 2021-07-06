import { GraphQLObjectType, GraphQLSchema, OperationTypeNode } from 'graphql';

import { Maybe } from '@graphql-tools/utils';

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
