import { GraphQLObjectType } from 'graphql';

import { healSchema, toConfig } from '../utils/index';

import { makeExecutableSchema } from '../generate/index';

describe('heal', () => {
  test('should prune empty types', () => {
    const schema = makeExecutableSchema({
      typeDefs: `
      type WillBeEmptyObject {
        willBeRemoved: String
      }

      type Query {
        someQuery: WillBeEmptyObject
      }
      `,
    });
    const originalTypeMap = schema.getTypeMap();

    const config = toConfig(
      originalTypeMap['WillBeEmptyObject'] as GraphQLObjectType,
    );
    originalTypeMap['WillBeEmptyObject'] = new GraphQLObjectType({
      ...config,
      fields: {},
    });

    healSchema(schema);

    const healedTypeMap = schema.getTypeMap();
    expect(healedTypeMap).not.toHaveProperty('WillBeEmptyObject');
  });
});
