import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { buildSubgraphSchema } from '../src/subgraph';

it('converts extensions in the subgraph SDL', () => {
  const subgraphSchema = buildSubgraphSchema({
    typeDefs: /* GraphQL */ `
      extend type Query {
        users: [User!]!
      }
      extend type User @key(fields: "id") {
        id: ID!
        name: String!
      }
    `,
  });
  expect(printSchemaWithDirectives(subgraphSchema)).toMatchSnapshot();
});
