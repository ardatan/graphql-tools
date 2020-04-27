import { extractResolversFromSchema } from '../src';
import { makeExecutableSchema } from '@graphql-tools/schema-stitching';
import gql from 'graphql-tag';

describe('extractResolversFromSchema', () => {
  it('should extract correct resolvers from a schema with correct type mapping', async () => {
    const schema = makeExecutableSchema({
      typeDefs: gql`
        type Query {
          foo: String
        }
      `,
      resolvers: {
        Query: {
          foo: () => 'FOO',
        },
      },
    });
    const fieldResolvers = extractResolversFromSchema(schema);
    expect((fieldResolvers.Query['foo'].resolve as Function)()).toBe('FOO');
  });
  it('should extract correct resolvers from a schema with selectedTypeDefs', async () => {
    const schema = makeExecutableSchema({
      typeDefs: gql`
        type TypeA {
          id: ID
          fieldA: String
        }
        type TypeB {
          id: ID
          fieldB: String
        }
        type Query {
          typeA: TypeA
          typeB: TypeB
        }
      `,
      resolvers: {
        Query: {
          typeA: () => ({ id: '0' }),
          typeB: () => ({ id: '1' }),
        },
        TypeA: {
          fieldA: ({ id }) => 'fieldAOf' + id,
        },
        TypeB: {
          fieldB: ({ id }) => 'fieldBOf' + id,
        },
      },
    });
    const TypeBResolvers = extractResolversFromSchema(schema, {
      selectedTypeDefs: gql`
        type TypeB {
          id: ID
          fieldB: String
        }
        type Query {
          typeB: TypeB
        }
      `,
    });

    expect(TypeBResolvers.Query['typeA']).toBeFalsy();
    expect(TypeBResolvers.TypeA).toBeFalsy();
    expect(TypeBResolvers.Query['typeB'].resolve().id).toBe('1');
    expect(TypeBResolvers.TypeB['fieldB'].resolve({ id: '1' })).toBe('fieldBOf1');
  });
});
