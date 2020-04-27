import { GraphQLObjectType } from 'graphql';

import { healSchema } from '../src/utils/index';

import { makeExecutableSchema } from '../src/generate/index';

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

    const config = (originalTypeMap.WillBeEmptyObject as GraphQLObjectType).toConfig();
    originalTypeMap.WillBeEmptyObject = new GraphQLObjectType({
      ...config,
      fields: {},
    });

    healSchema(schema);

    const healedTypeMap = schema.getTypeMap();
    expect(healedTypeMap).not.toHaveProperty('WillBeEmptyObject');
  });
});
