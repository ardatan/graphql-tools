import { GraphQLObjectType, GraphQLSchema, graphqlSync } from 'graphql';

import { makeExecutableSchema, mapSchema, toConfig } from '../index';
import { MapperKind } from '../Interfaces';

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
        const queryConfig = toConfig(type);
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
        const queryConfig = toConfig(type);
        queryConfig.name = 'RootQuery';
        return new GraphQLObjectType(queryConfig);
      },
    });

    expect(newSchema).toBeInstanceOf(GraphQLSchema);
    expect(newSchema.getQueryType().name).toBe('RootQuery');
  });
});
