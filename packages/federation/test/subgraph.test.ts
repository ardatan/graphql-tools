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
  expect(printSchemaWithDirectives(subgraphSchema).trim()).toMatchSnapshot();
});

it('allows a subgraph without any keys', () => {
  const subgraphSchema = buildSubgraphSchema({
    typeDefs: /* GraphQL */ `
      extend type Query {
        users: [User!]!
      }
      extend type User {
        id: ID!
        name: String!
      }
    `,
  });
  const schema = printSchemaWithDirectives(subgraphSchema).trim();
  expect(schema).toMatchSnapshot();
  expect(schema).not.toContain(`_Entity`);
  expect(schema).not.toContain(`_entities(representations: [_Any!]!): [_Entity]!`);
});
