import { GraphQLObjectType, buildSchema } from 'graphql';

import { healSchema } from '../src/heal';

describe('heal', () => {
  test('should prune empty types', () => {
    const schema = buildSchema(`
      type WillBeEmptyObject {
        willBeRemoved: String
      }

      type Query {
        someQuery: WillBeEmptyObject
      }
      `);
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
