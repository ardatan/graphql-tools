import { GraphQLSchema } from 'graphql';
import { gql } from 'graphql-tag';
import { buildSubgraphSchema } from '@apollo/subgraph';

const typeDefs = gql`
  type Query {
    testNestedField: TestNestedField
  }

  type TestNestedField {
    subgraph2: TestUser2!
  }

  type TestUser2 {
    id: String!
    email: String!
    sub2: Boolean!
  }
`;

const resolvers = {
  Query: {
    testNestedField: () => ({
      subgraph2: () => ({
        id: 'user2',
        email: 'user2@example.com',
        sub2: true,
      }),
    }),
  },
};

export function getSubgraph2Schema(): GraphQLSchema {
  return buildSubgraphSchema({ typeDefs, resolvers });
}
