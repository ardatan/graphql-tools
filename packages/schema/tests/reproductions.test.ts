import { stripIgnoredCharacters } from 'graphql';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { makeExecutableSchema } from '../src/makeExecutableSchema';

test('works', () => {
  const typeDefs = stripIgnoredCharacters(/* GraphQL */ `
    schema {
      query: Query
    }

    directive @deprecated(
      owner: String!
      expiry: Date!
      reason: String!
    ) on FIELD_DEFINITION | INPUT_FIELD_DEFINITION

    scalar Date

    type Query {
      myField: String! @deprecated(owner: "Test Squad", expiry: "2025-12-31", reason: "test")
    }
  `);
  const schema = makeExecutableSchema({
    typeDefs,
  });
  expect(stripIgnoredCharacters(printSchemaWithDirectives(schema))).toBe(typeDefs);
});
