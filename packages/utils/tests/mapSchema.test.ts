import { GraphQLObjectType, GraphQLSchema, graphqlSync, GraphQLString } from 'graphql';

import { makeExecutableSchema } from '@graphql-tools/schema';
import { MapperKind, mapSchema } from '@graphql-tools/utils';

describe('mapSchema', () => {
  test('does not throw', () => {
    const schema = makeExecutableSchema({
      typeDefs: `
        type Query {
          version: String
        }
      `,
    });

    const newSchema = mapSchema(schema, {});
    expect(newSchema).toBeInstanceOf(GraphQLSchema);
  });

  test('can add a resolver', () => {
    const schema = makeExecutableSchema({
      typeDefs: `
        type Query {
          version: Int
        }
      `,
    });

    const newSchema = mapSchema(schema, {
      [MapperKind.QUERY]: (type) => {
        const queryConfig = type.toConfig();
        queryConfig.fields.version.resolve = () => 1;
        return new GraphQLObjectType(queryConfig);
      },
    });

    expect(newSchema).toBeInstanceOf(GraphQLSchema);

    const result = graphqlSync(newSchema, '{ version }');
    expect(result.data.version).toBe(1);
  });

  test('can change the root query name', () => {
    const schema = makeExecutableSchema({
      typeDefs: `
        type Query {
          version: Int
        }
      `,
    });

    const newSchema = mapSchema(schema, {
      [MapperKind.QUERY]: (type) => {
        const queryConfig = type.toConfig();
        queryConfig.name = 'RootQuery';
        return new GraphQLObjectType(queryConfig);
      },
    });

    expect(newSchema).toBeInstanceOf(GraphQLSchema);
    expect(newSchema.getQueryType().name).toBe('RootQuery');
  });

  test('can copy nonstandard properties', () => {
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          'test': {
            type: GraphQLString
          }
        }
      })
    });

    const symbol = Symbol('symbol');

    Object.defineProperty(
      schema.getQueryType(),
      symbol,
      {
        enumerable: false,
        configurable: false,
        value: symbol,
      }
    );

    Object.defineProperty(
      schema.getQueryType(),
      'value',
      {
        enumerable: false,
        configurable: false,
        value: 'value',
      }
    );

    const newSchema = mapSchema(schema, {});

    expect(newSchema).toBeInstanceOf(GraphQLSchema);
    expect((newSchema.getQueryType() as unknown as { symbol: symbol })[symbol]).toBe(symbol);
    expect((newSchema.getQueryType() as unknown as { value: string }).value).toBe('value');
  });
});
