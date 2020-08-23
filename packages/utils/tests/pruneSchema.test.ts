import { GraphQLObjectType, buildSchema } from 'graphql';
import { pruneSchema } from '../src/prune';

describe('pruneSchema', () => {
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

    const prunedSchema = pruneSchema(schema);

    const prunedTypeMap = prunedSchema.getTypeMap();
    expect(prunedTypeMap).not.toHaveProperty('WillBeEmptyObject');
  });
});
