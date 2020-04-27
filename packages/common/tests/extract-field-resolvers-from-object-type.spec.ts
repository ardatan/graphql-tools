import { GraphQLObjectType, GraphQLString } from 'graphql';
import { extractFieldResolversFromObjectType } from '../src';

describe('extractFieldResolversFromObjectType', () => {
  it('should extract correct resolvers from an object type', async () => {
    const objectType = new GraphQLObjectType({
      name: 'Query',
      fields: {
        foo: {
          type: GraphQLString,
          resolve: () => 'FOO',
        },
      },
    });
    const fieldResolvers = extractFieldResolversFromObjectType(objectType);
    expect((fieldResolvers.foo.resolve as Function)()).toBe('FOO');
  });
});
