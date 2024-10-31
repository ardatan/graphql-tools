import { GraphQLSchema } from 'graphql';
import { gql } from 'graphql-tag';
import { buildSubgraphSchema } from '@apollo/subgraph';

const typeDefs = gql`
  type Query {
    testNestedField: TestNestedField
  }

  type TestNestedField {
    subgraph1: TestUser1!
  }

  type TestUser1 {
    id: String!
    email: String!
    sub1: Boolean!
  }
`;

const resolvers = {
  Query: {
    testNestedField: () => ({
      subgraph1: () => ({
        id: 'user1',
        email: 'user1@example.com',
        sub1: true,
      }),
    }),
  },
};

export function getSubgraph1Schema(): GraphQLSchema {
  return buildSubgraphSchema({ typeDefs, resolvers });
}
