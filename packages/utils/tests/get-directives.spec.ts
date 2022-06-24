import { makeExecutableSchema } from '@graphql-tools/schema';
import { getDirectives } from '../src/index.js';
import { assertGraphQLObjectType } from '../../testing/assertion.js';
import { GraphQLSchema } from 'graphql';

describe('getDirectives', () => {
  it('should return the correct directives when no directives specified', () => {
    const typeDefs = /* GraphQL */ `
      type Query {
        test: String
      }
    `;
    const schema = makeExecutableSchema({ typeDefs, resolvers: {} }) as GraphQLSchema;
    const directives = getDirectives(schema, schema.getQueryType()!);

    expect(directives).toEqual([]);
  });

  it('should return the correct directives built-in directive specified over FIELD_DEFINITION', () => {
    const typeDefs = /* GraphQL */ `
      type Query {
        test: String @deprecated
      }
    `;

    const schema = makeExecutableSchema({ typeDefs, resolvers: {} }) as GraphQLSchema;
    const directives = getDirectives(schema, schema.getQueryType()!.getFields()['test']);
    expect(directives).toEqual([
      {
        name: 'deprecated',
        args: {
          reason: 'No longer supported',
        },
      },
    ]);
  });

  it('should return the correct directives when using custom directive without arguments', () => {
    const typeDefs = /* GraphQL */ `
      type Query {
        test: String @mydir
      }

      directive @mydir on FIELD_DEFINITION
    `;

    const schema = makeExecutableSchema({ typeDefs, resolvers: {} }) as GraphQLSchema;
    const directives = getDirectives(schema, schema.getQueryType()!.getFields()['test']);
    expect(directives).toEqual([
      {
        name: 'mydir',
        args: {},
      },
    ]);
  });

  it('should return the correct directives when using custom directive with optional argument', () => {
    const typeDefs = /* GraphQL */ `
      type Query {
        test: String @mydir(f1: "test")
      }

      directive @mydir(f1: String) on FIELD_DEFINITION
    `;

    const schema = makeExecutableSchema({ typeDefs, resolvers: {} }) as GraphQLSchema;
    const directives = getDirectives(schema, schema.getQueryType()!.getFields()['test']);
    expect(directives).toEqual([
      {
        name: 'mydir',
        args: {
          f1: 'test',
        },
      },
    ]);
  });

  it('should return the correct directives when using custom directive with optional argument an no value', () => {
    const typeDefs = /* GraphQL */ `
      type Query {
        test: String @mydir
      }

      directive @mydir(f1: String) on FIELD_DEFINITION
    `;

    const schema = makeExecutableSchema({ typeDefs, resolvers: {} }) as GraphQLSchema;
    const directives = getDirectives(schema, schema.getQueryType()!.getFields()['test']);
    expect(directives).toEqual([
      {
        name: 'mydir',
        args: {},
      },
    ]);
  });

  it('provides the extension definition', () => {
    const schema = makeExecutableSchema({
      typeDefs: `
        directive @mydir(arg: String) on OBJECT
        type Query @mydir(arg: "base") {
          first: String
        }
        extend type Query @mydir(arg: "ext1") {
          second: String
        }
      `,
    });
    const QueryType = schema.getQueryType();
    assertGraphQLObjectType(QueryType);
    expect(getDirectives(schema, QueryType)).toEqual([{ name: 'mydir', args: { arg: 'ext1' } }]);
  });

  it('builds proper repeatable directives listing', () => {
    const schema = makeExecutableSchema({
      typeDefs: `
        directive @mydir(arg: String) repeatable on OBJECT
        type Query @mydir(arg: "first") @mydir(arg: "second") {
          first: String
        }
      `,
    });
    const QueryType = schema.getQueryType();
    assertGraphQLObjectType(QueryType);
    expect(getDirectives(schema, QueryType)).toEqual([
      {
        name: 'mydir',
        args: { arg: 'first' },
      },
      {
        name: 'mydir',
        args: { arg: 'second' },
      },
    ]);
  });
});
