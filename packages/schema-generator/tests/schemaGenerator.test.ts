/* eslint-disable @typescript-eslint/restrict-template-expressions */
// TODO: reduce code repetition in this file.
// see https://github.com/apollostack/graphql-tools/issues/26

import {
  typeDefs as scalarTypeDefs,
  resolvers as scalarResolvers,
} from 'graphql-scalars';
import {
  graphql,
  GraphQLResolveInfo,
  GraphQLScalarType,
  Kind,
  IntValueNode,
  parse,
  ExecutionResult,
  GraphQLError,
  GraphQLEnumType,
  execute,
  VariableDefinitionNode,
  DocumentNode,
  GraphQLBoolean,
  graphqlSync,
  GraphQLSchema,
} from 'graphql';

import {
  makeExecutableSchema,
  addErrorLoggingToSchema,
  addSchemaLevelResolver,
  addResolversToSchema,
  attachDirectiveResolvers,
  chainResolvers,
  concatenateTypeDefs,
} from '@graphql-tools/schema-generator';

import {
  IResolverValidationOptions,
  IResolvers,
  IDirectiveResolvers,
  NextResolverFn,
  VisitSchemaKind,
  ITypeDefinitions,
  ILogger,
  visitSchema
} from '@graphql-tools/utils';

import TypeA from './fixtures/circularSchemaA';

interface Bird {
  name: string;
  wingspan?: number;
}

function expectWarning(fn: () => void, warnMatcher?: string) {
  // eslint-disable-next-line no-console
  const originalWarn = console.warn;
  let warning: string = null;

  try {
    // eslint-disable-next-line no-console
    console.warn = function warn(message: string) {
      warning = message;
    };

    fn();

    if (undefined === warnMatcher) {
      expect(warning).toBe(null);
    } else {
      expect(warning).toMatch(warnMatcher);
    }
  } finally {
    // eslint-disable-next-line no-console
    console.warn = originalWarn;
  }
}

const testSchema = `
      type RootQuery {
        usecontext: String
        species(name: String): String
        stuff: String
      }
      schema {
        query: RootQuery
      }
    `;
const testResolvers = {
  __schema: () => ({ stuff: 'stuff', species: 'ROOT' }),
  RootQuery: {
    usecontext: (_r: any, _a: Record<string, any>, ctx: any) => ctx.usecontext,
    species: (root: any, { name }: { name: string }) =>
      (root.species as string) + name,
  },
};

describe('generating schema from shorthand', () => {
  test('throws an error if no schema is provided', () => {
    expect(() => makeExecutableSchema(undefined)).toThrowError('undefined');
  });

  test('throws an error if typeDefinitionNodes are not provided', () => {
    expect(() =>
      makeExecutableSchema({ typeDefs: undefined, resolvers: {} }),
    ).toThrowError('Must provide typeDefs');
  });

  test('throws an error if no resolveFunctions are provided', () => {
    expect(() =>
      makeExecutableSchema({ typeDefs: 'blah', resolvers: {} }),
    ).toThrowError(GraphQLError);
  });

  test('throws an error if typeDefinitionNodes is neither string nor array nor schema AST', () => {
    expect(() =>
      makeExecutableSchema({
        typeDefs: ({} as unknown) as ITypeDefinitions,
        resolvers: {},
      }),
    ).toThrowError(
      'typeDefs must be a string, array or schema AST, got object',
    );
  });

  test('throws an error if typeDefinitionNode array contains not only functions and strings', () => {
    expect(() =>
      makeExecutableSchema({
        typeDefs: ([17] as unknown) as ITypeDefinitions,
        resolvers: {},
      }),
    ).toThrowError(
      'typeDef array must contain only strings, documents, or functions, got number',
    );
  });

  test('throws an error if resolverValidationOptions is not an object', () => {
    const options = {
      typeDefs: 'blah',
      resolvers: {},
      resolverValidationOptions: ('string' as unknown) as IResolverValidationOptions,
    };
    expect(() => makeExecutableSchema(options)).toThrowError(
      'Expected `resolverValidationOptions` to be an object',
    );
  });

  test('can generate a schema', () => {
    const shorthand = `
      """
      A bird species
      """
      type BirdSpecies {
        name: String!,
        wingspan: Int
      }

      """
      Root Query definition
      """
      type RootQuery {
        species(name: String!): [BirdSpecies]
      }

      schema {
        query: RootQuery
      }
    `;

    const introspectionQuery = `{
      species: __type(name: "BirdSpecies"){
        name,
        description,
        fields{
          name
          type{
            name
            kind
            ofType{
              name
            }
          }
        }
      }
      query: __type(name: "RootQuery"){
        name,
        description,
        fields{
          name
          type {
            name
            kind
            ofType {
              name
            }
          }
          args {
            name
            type {
              name
              kind
              ofType {
                name
              }
            }
          }
        }
      }
    }`;

    const solution = {
      data: {
        species: {
          name: 'BirdSpecies',
          description: 'A bird species',
          fields: [
            {
              name: 'name',
              type: {
                kind: 'NON_NULL',
                name: null as string,
                ofType: {
                  name: 'String',
                },
              },
            },
            {
              name: 'wingspan',
              type: {
                kind: 'SCALAR',
                name: 'Int',
                ofType: null,
              },
            },
          ],
        },
        query: {
          name: 'RootQuery',
          description: 'Root Query definition',
          fields: [
            {
              name: 'species',
              type: {
                kind: 'LIST',
                name: null as string,
                ofType: {
                  name: 'BirdSpecies',
                },
              },
              args: [
                {
                  name: 'name',
                  type: {
                    name: null as string,
                    kind: 'NON_NULL',
                    ofType: {
                      name: 'String',
                    },
                  },
                },
              ],
            },
          ],
        },
      },
    };

    const jsSchema = makeExecutableSchema({
      typeDefs: shorthand,
      resolvers: {},
    });
    const resultPromise = graphql(jsSchema, introspectionQuery);
    return resultPromise.then((result) =>
      expect(result).toEqual(solution as ExecutionResult),
    );
  });

  test('can generate a schema from an array of types', () => {
    const typeDefAry = [
      `
      type Query {
        foo: String
      }
      `,
      `
      schema {
        query: Query
      }
    `,
    ];

    const jsSchema = makeExecutableSchema({
      typeDefs: typeDefAry,
      resolvers: {},
    });
    expect(jsSchema.getQueryType().name).toBe('Query');
  });

  test('can generate a schema from a parsed type definition', () => {
    const typeDefSchema = parse(`
      type Query {
        foo: String
      }
      schema {
        query: Query
      }
    `);

    const jsSchema = makeExecutableSchema({
      typeDefs: typeDefSchema,
      resolvers: {},
    });
    expect(jsSchema.getQueryType().name).toBe('Query');
  });

  test('can generate a schema from an array of parsed and none parsed type definitions', () => {
    const typeDefSchema = [
      parse(`
          type Query {
            foo: String
          }`),
      `
        schema {
          query: Query
        }
      `,
    ];

    const jsSchema = makeExecutableSchema({
      typeDefs: typeDefSchema,
      resolvers: {},
    });
    expect(jsSchema.getQueryType().name).toBe('Query');
  });

  test('can generate a schema from an array of types with extensions', () => {
    const typeDefAry = [
      `
      type Query {
        foo: String
      }
      `,
      `
      schema {
        query: Query
      }
      `,
      `
      extend type Query {
        bar: String
      }
    `,
    ];

    const jsSchema = makeExecutableSchema({
      typeDefs: typeDefAry,
      resolvers: {},
    });
    expect(jsSchema.getQueryType().name).toBe('Query');
    expect(jsSchema.getQueryType().getFields().foo).toBeDefined();
    expect(jsSchema.getQueryType().getFields().bar).toBeDefined();
  });

  test('allow for a map of extensions in field resolver', () => {
    const jsSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          foo: String
        }
      `,
      resolvers: {
        Query: {
          foo: {
            resolve() {
              return 'Foo';
            },
            extensions: {
              verbose: true,
            },
          },
        },
      },
    });
    const extensions = jsSchema.getQueryType().getFields().foo.extensions;
    expect(extensions).toHaveProperty('verbose');
    expect(extensions.verbose).toBe(true);
  });

  test('can concatenateTypeDefs created by a function inside a closure', () => {
    const typeA = { typeDefs: () => ['type TypeA { foo: String }'] };
    const typeB = { typeDefs: () => ['type TypeB { bar: String }'] };
    const typeC = { typeDefs: () => ['type TypeC { foo: String }'] };
    const typeD = { typeDefs: () => ['type TypeD { bar: String }'] };

    function combineTypeDefs(...args: Array<any>): any {
      return { typeDefs: () => args.map((o) => o.typeDefs) };
    }

    const combinedAandB = combineTypeDefs(typeA, typeB);
    const combinedCandD = combineTypeDefs(typeC, typeD);

    const result = concatenateTypeDefs([
      combinedAandB.typeDefs,
      combinedCandD.typeDefs,
    ]);

    expect(result).toMatch('type TypeA');
    expect(result).toMatch('type TypeB');
    expect(result).toMatch('type TypeC');
    expect(result).toMatch('type TypeD');
  });

  test('properly deduplicates the array of type DefinitionNodes', () => {
    const typeDefAry = [
      `
      type Query {
        foo: String
      }
      `,
      `
      schema {
        query: Query
      }
      `,
      `
      schema {
        query: Query
      }
    `,
    ];

    const jsSchema = makeExecutableSchema({
      typeDefs: typeDefAry,
      resolvers: {},
    });
    expect(jsSchema.getQueryType().name).toBe('Query');
  });

  test('works with imports, even circular ones', () => {
    const typeDefAry = [
      `
      type Query {
        foo: TypeA
      }
      `,
      `
      schema {
        query: Query
      }
    `,
      TypeA,
    ];

    const jsSchema = makeExecutableSchema({
      typeDefs: typeDefAry,
      resolvers: {
        Query: { foo: () => null },
        TypeA: { b: () => null },
        TypeB: { a: () => null },
      },
    });
    expect(jsSchema.getQueryType().name).toBe('Query');
  });

  test('can generate a schema with resolvers', () => {
    const shorthand = `
      type BirdSpecies {
        name: String!,
        wingspan: Int
      }
      type RootQuery {
        species(name: String!): [BirdSpecies]
      }
      schema {
        query: RootQuery
      }
    `;

    const resolveFunctions = {
      RootQuery: {
        species: (_root: any, { name }: { name: string }) => [
          {
            name: `Hello ${name}!`,
            wingspan: 200,
          },
        ],
      },
    };

    const testQuery = `{
      species(name: "BigBird"){
        name
        wingspan
      }
    }`;

    const solution = {
      data: {
        species: [
          {
            name: 'Hello BigBird!',
            wingspan: 200,
          },
        ],
      },
    };
    const jsSchema = makeExecutableSchema({
      typeDefs: shorthand,
      resolvers: resolveFunctions,
    });
    const resultPromise = graphql(jsSchema, testQuery);
    return resultPromise.then((result) =>
      expect(result).toEqual(solution as ExecutionResult),
    );
  });

  test('can generate a schema with extensions that can use resolvers', () => {
    const shorthand = `
      type BirdSpecies {
        name: String!,
        wingspan: Int
      }
      type RootQuery {
        species(name: String!): [BirdSpecies]
      }
      schema {
        query: RootQuery
      }
      extend type BirdSpecies {
        height: Float
      }
    `;

    const resolveFunctions = {
      RootQuery: {
        species: (_root: any, { name }: { name: string }) => [
          {
            name: `Hello ${name}!`,
            wingspan: 200,
            height: 30.2,
          },
        ],
      },
      BirdSpecies: {
        name: (bird: Bird) => bird.name,
        wingspan: (bird: Bird) => bird.wingspan,
        height: (bird: Bird & { height: number }) => bird.height,
      },
    };

    const testQuery = `{
      species(name: "BigBird"){
        name
        wingspan
        height
      }
    }`;

    const solution = {
      data: {
        species: [
          {
            name: 'Hello BigBird!',
            wingspan: 200,
            height: 30.2,
          },
        ],
      },
    };
    const jsSchema = makeExecutableSchema({
      typeDefs: shorthand,
      resolvers: resolveFunctions,
    });
    const resultPromise = graphql(jsSchema, testQuery);
    return resultPromise.then((result) =>
      expect(result).toEqual(solution as ExecutionResult),
    );
  });

  test('supports resolveType for unions', () => {
    const shorthand = `
      union Searchable = Person | Location
      type Person {
        name: String
        age: Int
      }
      type Location {
        name: String
        coordinates: String
      }
      type RootQuery {
        search(name: String): [Searchable]
      }
      schema {
        query: RootQuery
      }
    `;

    const resolveFunctions = {
      RootQuery: {
        search: {
          resolve(_root: any, { name }: { name: string }) {
            return [
              {
                name: `Tom ${name}`,
                age: 100,
              },
              {
                name: 'North Pole',
                coordinates: '90, 0',
              },
            ];
          },
        },
      },
      Searchable: {
        __resolveType(data: any, _context: any, info: GraphQLResolveInfo) {
          if (data.age) {
            return info.schema.getType('Person');
          }
          if (data.coordinates) {
            return info.schema.getType('Location');
          }
          return null;
        },
      },
    };

    const testQuery = `{
      search(name: "a"){
        ... on Person {
          name
          age
        }
        ... on Location {
          name
          coordinates
        }
      }
    }`;

    const solution = {
      data: {
        search: [
          {
            name: 'Tom a',
            age: 100,
          },
          {
            name: 'North Pole',
            coordinates: '90, 0',
          },
        ],
      },
    };

    const jsSchema = makeExecutableSchema({
      typeDefs: shorthand,
      resolvers: resolveFunctions,
    });
    const resultPromise = graphql(jsSchema, testQuery);
    return resultPromise.then((result) =>
      expect(result).toEqual(solution as ExecutionResult),
    );
  });

  test('can generate a schema with an array of resolvers', () => {
    const shorthand = `
      type BirdSpecies {
        name: String!,
        wingspan: Int
      }
      type RootQuery {
        numberOfSpecies: Int
        species(name: String!): [BirdSpecies]
      }
      schema {
        query: RootQuery
      }
      extend type BirdSpecies {
        height: Float
      }
    `;

    const resolvers = {
      RootQuery: {
        species: (_root: any, { name }: { name: string }) => [
          {
            name: `Hello ${name}!`,
            wingspan: 200,
            height: 30.2,
          },
        ],
      },
    };

    const otherResolvers = {
      BirdSpecies: {
        name: (bird: Bird) => bird.name,
        wingspan: (bird: Bird) => bird.wingspan,
        height: (bird: Bird & { height: number }) => bird.height,
      },
      RootQuery: {
        numberOfSpecies() {
          return 1;
        },
      },
    };

    const testQuery = `{
      numberOfSpecies
      species(name: "BigBird"){
        name
        wingspan
        height
      }
    }`;

    const solution = {
      data: {
        numberOfSpecies: 1,
        species: [
          {
            name: 'Hello BigBird!',
            wingspan: 200,
            height: 30.2,
          },
        ],
      },
    };
    const jsSchema = makeExecutableSchema({
      typeDefs: shorthand,
      resolvers: [resolvers, otherResolvers],
    });
    const resultPromise = graphql(jsSchema, testQuery);
    return resultPromise.then((result) =>
      expect(result).toEqual(solution as ExecutionResult),
    );
  });

  describe('scalar types', () => {
    test('supports passing a GraphQLScalarType in resolveFunctions', () => {
      const scalarNames = Object.keys(scalarResolvers);
      const shorthand = `
        ${scalarTypeDefs.join('\n')}

        type Foo {
          ${scalarNames
          .map(
            (scalarName) => `${scalarName.toLowerCase()}Field: ${scalarName}`,
          )
          .join('\n')}
        }

        type Query {
          foo: Foo
        }
      `;
      const resolveFunctions = {
        ...scalarResolvers,
      };
      const jsSchema = makeExecutableSchema({
        typeDefs: shorthand,
        resolvers: resolveFunctions,
      });
      expect(jsSchema.getQueryType().name).toBe('Query');
      for (const scalarName of scalarNames) {
        expect(jsSchema.getType(scalarName)).toBeInstanceOf(GraphQLScalarType);
        expect(jsSchema.getType(scalarName)).toHaveProperty('description');
        expect(typeof jsSchema.getType(scalarName).description).toBe('string');
        expect(
          jsSchema.getType(scalarName).description.length,
        ).toBeGreaterThan(0);
      }
    });

    test('supports passing a default scalar type', () => {
      const shorthand = `
        type Foo {
          aField: Boolean
        }

        type Query {
          foo: Foo
        }
      `;
      const resolveFunctions = {
        Boolean: GraphQLBoolean,
      };
      const jsSchema = makeExecutableSchema({
        typeDefs: shorthand,
        resolvers: resolveFunctions,
      });
      expect(jsSchema.getQueryType().name).toBe('Query');
      expect(jsSchema.getType('Boolean')).toBe(GraphQLBoolean);
    });

    test('allow overriding default scalar type fields', () => {
      const originalSerialize = GraphQLBoolean.serialize;
      const shorthand = `
        type Foo {
          aField: Boolean
        }

        type Query {
          foo: Foo
        }
      `;
      const resolveFunctions = {
        Boolean: new GraphQLScalarType({
          name: 'Boolean',
          serialize: () => false,
        }),
        Query: {
          foo: () => ({ aField: true }),
        },
      };
      const jsSchema = makeExecutableSchema({
        typeDefs: shorthand,
        resolvers: resolveFunctions,
      });
      const testQuery = `
        {
          foo {
            aField
          }
        }
      `;
      const result = graphqlSync(jsSchema, testQuery);
      expect(result.data.foo.aField).toBe(false);
      addResolversToSchema({
        schema: jsSchema,
        resolvers: {
          Boolean: {
            serialize: originalSerialize,
          },
        },
      });
    });

    test('retains scalars after walking/recreating the schema', () => {
      const shorthand = `
        scalar Test

        type Foo {
          testField: Test
        }

        type Query {
          test: Test
          testIn(input: Test): Test
        }
      `;
      const resolveFunctions = {
        Test: new GraphQLScalarType({
          name: 'Test',
          description: 'Test resolver',
          serialize(value) {
            if (typeof value !== 'string' || value.indexOf('scalar:') !== 0) {
              return `scalar:${value as string}`;
            }
            return value;
          },
          parseValue(value) {
            return `scalar:${value as string}`;
          },
          parseLiteral(ast: any) {
            switch (ast.kind) {
              case Kind.STRING:
              case Kind.INT:
                return `scalar:${ast.value as string}`;
              default:
                return null;
            }
          },
        }),
        Query: {
          testIn(_: any, { input }: any) {
            expect(input).toMatch('scalar:');
            return input;
          },
          test() {
            return 42;
          },
        },
      };
      const walkedSchema = visitSchema(
        makeExecutableSchema({
          typeDefs: shorthand,
          resolvers: resolveFunctions,
        }),
        {
          [VisitSchemaKind.ENUM_TYPE](type: GraphQLEnumType) {
            return type;
          },
        },
      );
      expect(walkedSchema.getType('Test')).toBeInstanceOf(GraphQLScalarType);
      expect(walkedSchema.getType('Test')).toHaveProperty('description');
      expect(walkedSchema.getType('Test').description).toBe('Test resolver');
      const testQuery = `
        {
          test
          testIn(input: 1)
        }`;
      const resultPromise = graphql(walkedSchema, testQuery);
      return resultPromise.then((result) =>
        expect(result.data).toEqual({
          test: 'scalar:42',
          testIn: 'scalar:1',
        }),
      );
    });

    test('should support custom scalar usage on client-side query execution', () => {
      const shorthand = `
          scalar CustomScalar

          type TestType {
            testField: String
          }

          type RootQuery {
            myQuery(t: CustomScalar): TestType
          }

          schema {
            query: RootQuery
          }
        `;

      const resolveFunctions = {
        CustomScalar: new GraphQLScalarType({
          name: 'CustomScalar',
          serialize(value) {
            return value;
          },
          parseValue(value) {
            return value;
          },
          parseLiteral(ast: any) {
            switch (ast.kind) {
              case Kind.STRING:
                return ast.value;
              default:
                return null;
            }
          },
        }),
      };

      const testQuery = `
          query myQuery($t: CustomScalar) {
            myQuery(t: $t) {
              testField
            }
          }`;

      const jsSchema = makeExecutableSchema({
        typeDefs: shorthand,
        resolvers: resolveFunctions,
      });
      const resultPromise = graphql(jsSchema, testQuery);
      return resultPromise.then((result) => expect(result.errors).toBeFalsy());
    });

    test('should work with an Odd custom scalar type', () => {
      const oddValue = (value: number) => (value % 2 === 1 ? value : null);

      const OddType = new GraphQLScalarType({
        name: 'Odd',
        description: 'Odd custom scalar type',
        parseValue: oddValue,
        serialize: oddValue,
        parseLiteral(ast) {
          if (ast.kind === Kind.INT) {
            const intValue: IntValueNode = ast;
            return oddValue(parseInt(intValue.value, 10));
          }
          return null;
        },
      });

      const typeDefs = `
        scalar Odd

        type Post {
          id: Int!
          title: String
          something: Odd
        }

        type Query {
          post: Post
        }

        schema {
          query: Query
        }
      `;

      const testValue = 3;
      const resolvers = {
        Odd: OddType,
        Query: {
          post() {
            return {
              id: 1,
              title: 'My first post',
              something: testValue,
            };
          },
        },
      };

      const jsSchema = makeExecutableSchema({
        typeDefs,
        resolvers,
      });
      const testQuery = `
        {
          post {
            something
          }
        }
  `;
      const resultPromise = graphql(jsSchema, testQuery);
      return resultPromise.then((result) => {
        expect(result.data.post.something).toEqual(testValue);
        expect(result.errors).toEqual(undefined);
      });
    });

    test('should work with a Date custom scalar type', () => {
      const DateType = new GraphQLScalarType({
        name: 'Date',
        description: 'Date custom scalar type',
        parseValue(value) {
          return new Date(value);
        },
        serialize(value) {
          return value.getTime();
        },
        parseLiteral(ast) {
          if (ast.kind === Kind.INT) {
            const intValue: IntValueNode = ast;
            return parseInt(intValue.value, 10);
          }
          return null;
        },
      });

      const typeDefs = `
        scalar Date

        type Post {
          id: Int!
          title: String
          something: Date
        }

        type Query {
          post: Post
        }

        schema {
          query: Query
        }
      `;

      const testDate = new Date(2016, 0, 1);

      const resolvers = {
        Date: DateType,
        Query: {
          post() {
            return {
              id: 1,
              title: 'My first post',
              something: testDate,
            };
          },
        },
      };

      const jsSchema = makeExecutableSchema({
        typeDefs,
        resolvers,
      });
      const testQuery = `
        {
          post {
            something
          }
        }
  `;
      const resultPromise = graphql(jsSchema, testQuery);
      return resultPromise.then((result) => {
        expect(result.data.post.something).toEqual(testDate.getTime());
        expect(result.errors).toEqual(undefined);
      });
    });
  });

  describe('enum support', () => {
    test('supports passing a GraphQLEnumType in resolveFunctions', () => {
      const shorthand = `
        enum Color {
          RED
        }

        enum NumericEnum {
          TEST
        }

        schema {
          query: Query
        }

        type Query {
          color: Color
          numericEnum: NumericEnum
        }
      `;

      const resolveFunctions = {
        Color: {
          RED: '#EA3232',
        },
        NumericEnum: {
          TEST: 1,
        },
      };

      const jsSchema = makeExecutableSchema({
        typeDefs: shorthand,
        resolvers: resolveFunctions,
      });

      expect(jsSchema.getQueryType().name).toBe('Query');
      expect(jsSchema.getType('Color')).toBeInstanceOf(GraphQLEnumType);
      expect(jsSchema.getType('NumericEnum')).toBeInstanceOf(GraphQLEnumType);
    });

    test('supports passing the value for a GraphQLEnumType in resolveFunctions', () => {
      const shorthand = `
          enum Color {
            RED
            BLUE
          }

          enum NumericEnum {
            TEST
          }

          schema {
            query: Query
          }

          type Query {
            redColor: Color
            blueColor: Color
            numericEnum: NumericEnum
          }
        `;

      const testQuery = `{
          redColor
          blueColor
          numericEnum
         }`;

      const resolveFunctions = {
        Color: {
          RED: '#EA3232',
          BLUE: '#0000FF',
        },
        NumericEnum: {
          TEST: 1,
        },
        Query: {
          redColor() {
            return '#EA3232';
          },
          blueColor() {
            return '#0000FF';
          },
          numericEnum() {
            return 1;
          },
        },
      };

      const jsSchema = makeExecutableSchema({
        typeDefs: shorthand,
        resolvers: resolveFunctions,
      });

      const resultPromise = graphql(jsSchema, testQuery);
      return resultPromise.then((result) => {
        expect(result.data.redColor).toEqual('RED');
        expect(result.data.blueColor).toEqual('BLUE');
        expect(result.data.numericEnum).toEqual('TEST');
        expect(result.errors).toEqual(undefined);
      });
    });

    test('supports resolving the value for a GraphQLEnumType in input types', () => {
      const shorthand = `
          enum Color {
            RED
            BLUE
          }

          enum NumericEnum {
            TEST
          }

          schema {
            query: Query
          }

          type Query {
            colorTest(color: Color): String
            numericTest(num: NumericEnum): Int
          }
        `;

      const testQuery = `{
          red: colorTest(color: RED)
          blue: colorTest(color: BLUE)
          num: numericTest(num: TEST)
         }`;

      const resolveFunctions = {
        Color: {
          RED: '#EA3232',
          BLUE: '#0000FF',
        },
        NumericEnum: {
          TEST: 1,
        },
        Query: {
          colorTest(_root: any, args: { color: string }) {
            return args.color;
          },
          numericTest(_root: any, args: { num: number }) {
            return args.num;
          },
        },
      };

      const jsSchema = makeExecutableSchema({
        typeDefs: shorthand,
        resolvers: resolveFunctions,
      });

      const resultPromise = graphql(jsSchema, testQuery);
      return resultPromise.then((result) => {
        expect(result.data.red).toEqual(resolveFunctions.Color.RED);
        expect(result.data.blue).toEqual(resolveFunctions.Color.BLUE);
        expect(result.data.num).toEqual(resolveFunctions.NumericEnum.TEST);
        expect(result.errors).toEqual(undefined);
      });
    });
  });

  describe('default value support', () => {
    test('supports default field values', () => {
      const shorthand = `
        enum Color {
          RED
        }

        schema {
          query: Query
        }

        type Query {
          colorTest(color: Color = RED): String
        }
      `;

      const testQuery = `{
        red: colorTest
       }`;

      const resolveFunctions = {
        Color: {
          RED: '#EA3232',
        },
        Query: {
          colorTest(_root: any, args: { color: string }) {
            return args.color;
          },
        },
      };

      const jsSchema = makeExecutableSchema({
        typeDefs: shorthand,
        resolvers: resolveFunctions,
      });

      const resultPromise = graphql(jsSchema, testQuery);
      return resultPromise.then((result) => {
        expect(result.data.red).toEqual(resolveFunctions.Color.RED);
        expect(result.errors).toEqual(undefined);
      });
    });

    test('supports changing default field values', () => {
      const shorthand = `
        enum Color {
          RED
        }

        schema {
          query: Query
        }

        type Query {
          colorTest(color: Color = RED): String
        }
      `;

      const testQuery = `{
        red: colorTest
       }`;

      const resolveFunctions = {
        Color: {
          RED: '#EA3232',
        },
        Query: {
          colorTest(_root: any, args: { color: string }) {
            return args.color;
          },
        },
      };

      const jsSchema = makeExecutableSchema({
        typeDefs: shorthand,
        resolvers: resolveFunctions,
      });

      addResolversToSchema({
        schema: jsSchema,
        resolvers: {
          Color: {
            RED: 'override',
          },
        },
      });

      const resultPromise = graphql(jsSchema, testQuery);
      return resultPromise.then((result) => {
        expect(result.data.red).toEqual('override');
        expect(result.errors).toEqual(undefined);
      });
    });
  });

  test('can set description and deprecation reason', () => {
    const shorthand = `
      type BirdSpecies {
        name: String!,
        wingspan: Int
      }
      type RootQuery {
        species(name: String!): [BirdSpecies]
      }
      schema {
        query: RootQuery
      }
    `;

    const resolveFunctions = {
      RootQuery: {
        species: {
          description: 'A species',
          deprecationReason: 'Just because',
          resolve: (_root: any, { name }: { name: string }) => [
            {
              name: `Hello ${name}!`,
              wingspan: 200,
            },
          ],
        },
      },
    };

    const testQuery = `{
      __type(name: "RootQuery"){
        name
        fields(includeDeprecated: true){
          name
          description
          deprecationReason
        }
      }
    }`;

    const solution = {
      data: {
        __type: {
          name: 'RootQuery',
          fields: [
            {
              name: 'species',
              description: 'A species',
              deprecationReason: 'Just because',
            },
          ],
        },
      },
    };

    const jsSchema = makeExecutableSchema({
      typeDefs: shorthand,
      resolvers: resolveFunctions,
    });
    const resultPromise = graphql(jsSchema, testQuery);
    return resultPromise.then((result) =>
      expect(result).toEqual(solution as ExecutionResult),
    );
  });

  test('shows a warning if a field has arguments but no resolver', () => {
    const short = `
    type Query{
      bird(id: ID): String
    }
    schema {
      query: Query
    }`;

    const rf = { Query: {} };

    expectWarning(() => {
      makeExecutableSchema({
        typeDefs: short,
        resolvers: rf,
        resolverValidationOptions: {
          requireResolversForArgs: true,
        },
      });
    }, 'Resolver missing for "Query.bird"');
  });

  test('does not throw an error if `resolverValidationOptions.requireResolversForArgs` is false', () => {
    const short = `
      type Query{
        bird(id: ID): String
      }
      schema {
        query: Query
      }`;

    const rf = { Query: {} };

    expect(
      makeExecutableSchema.bind(null, { typeDefs: short, resolvers: rf }),
    ).not.toThrow();
  });

  test('throws an error if a resolver is not a function', () => {
    const short = `
    type Query{
      bird(id: ID): String
    }
    schema {
      query: Query
    }`;

    const rf = { Query: { bird: 'NOT A FUNCTION' } };

    expect(() =>
      makeExecutableSchema({
        typeDefs: short,
        resolvers: rf,
      }),
    ).toThrowError('Resolver Query.bird must be object or function');
  });

  test('shows a warning if a field is not scalar, but has no resolver', () => {
    const short = `
    type Bird{
      id: ID
    }
    type Query{
      bird: Bird
    }
    schema {
      query: Query
    }`;

    const rf = {};

    const resolverValidationOptions: IResolverValidationOptions = {
      requireResolversForNonScalar: true,
    };

    expectWarning(() => {
      makeExecutableSchema({
        typeDefs: short,
        resolvers: rf,
        resolverValidationOptions,
      });
    }, 'Resolver missing for "Query.bird"');
  });

  test('allows non-scalar field to use default resolver if `resolverValidationOptions.requireResolversForNonScalar` = false', () => {
    const short = `
      type Bird{
        id: ID
      }
      type Query{
        bird: Bird
      }
      schema {
        query: Query
      }`;

    const rf = {};

    expect(
      makeExecutableSchema.bind(null, {
        typeDefs: short,
        resolvers: rf,
        resolverValidationOptions: { requireResolversForNonScalar: false },
      }),
    ).not.toThrow();
  });

  test('throws if resolver defined for non-object/interface type', () => {
    const short = `
      union Searchable = Person | Location
      type Person {
        name: String
        age: Int
      }
      type Location {
        name: String
        coordinates: String
      }
      type RootQuery {
        search(name: String): [Searchable]
      }
      schema {
        query: RootQuery
      }
    `;

    const rf = {
      Searchable: {
        name: () => 'Something',
      },
    };

    expect(() =>
      makeExecutableSchema({ typeDefs: short, resolvers: rf }),
    ).toThrowError(
      "Searchable was defined in resolvers, but it's not an object",
    );

    expect(() =>
      makeExecutableSchema({
        typeDefs: short,
        resolvers: rf,
        resolverValidationOptions: {
          allowResolversNotInSchema: true,
        },
      }),
    ).not.toThrowError();
  });

  test('throws if resolver defined for non existent type', () => {
    const short = `
      type Person {
        name: String
        age: Int
      }
      type RootQuery {
        search(name: String): [Person]
      }
      schema {
        query: RootQuery
      }
    `;

    const rf = {
      Searchable: {
        name: () => 'Something',
      },
    };

    expect(() =>
      makeExecutableSchema({ typeDefs: short, resolvers: rf }),
    ).toThrowError('"Searchable" defined in resolvers, but not in schema');

    expect(() =>
      makeExecutableSchema({
        typeDefs: short,
        resolvers: rf,
        resolverValidationOptions: {
          allowResolversNotInSchema: true,
        },
      }),
    ).not.toThrowError();
  });

  test('throws if resolver value is invalid', () => {
    const short = `
      type Person {
        name: String
        age: Int
      }
      type RootQuery {
        search(name: String): [Person]
      }
      schema {
        query: RootQuery
      }
    `;

    const rf = {
      Searchable: undefined,
    } as any;

    expect(() =>
      makeExecutableSchema({ typeDefs: short, resolvers: rf }),
    ).toThrowError(
      '"Searchable" defined in resolvers, but has invalid value "undefined". A resolver\'s value ' +
      'must be of type object or function.',
    );
  });

  test('doesnt let you define resolver field not present in schema', () => {
    const short = `
      type Person {
        name: String
        age: Int
      }
      type RootQuery {
        search(name: String): [Person]
      }
      schema {
        query: RootQuery
      }
    `;

    const rf = {
      RootQuery: {
        name: () => 'Something',
      },
    };

    expect(() =>
      makeExecutableSchema({ typeDefs: short, resolvers: rf }),
    ).toThrowError('RootQuery.name defined in resolvers, but not in schema');

    expect(() =>
      makeExecutableSchema({
        typeDefs: short,
        resolvers: rf,
        resolverValidationOptions: {
          allowResolversNotInSchema: true,
        },
      }),
    ).not.toThrowError();
  });

  test('does not let you define resolver field for enum values not present in schema', () => {
    const short = `
        enum Color {
          RED
        }

        enum NumericEnum {
          TEST
        }

        schema {
          query: Query
        }

        type Query {
          color: Color
          numericEnum: NumericEnum
        }
      `;

    const rf = {
      Color: {
        RED: '#EA3232',
        NO_RESOLVER: '#EA3232',
      },
      NumericEnum: {
        TEST: 1,
      },
    };

    expect(() =>
      makeExecutableSchema({ typeDefs: short, resolvers: rf }),
    ).toThrowError(
      'Color.NO_RESOLVER was defined in resolvers, but enum is not in schema',
    );

    expect(() =>
      makeExecutableSchema({
        typeDefs: short,
        resolvers: rf,
        resolverValidationOptions: {
          allowResolversNotInSchema: true,
        },
      }),
    ).not.toThrowError();
  });

  test('throws if conflicting validation options are passed', () => {
    const typeDefs = `
    type Bird {
      id: ID
    }
    type Query {
      bird: Bird
    }
    schema {
      query: Query
    }`;
    const resolvers = {};

    function assertOptionsError(
      resolverValidationOptions: IResolverValidationOptions,
    ) {
      expect(() =>
        makeExecutableSchema({
          typeDefs,
          resolvers,
          resolverValidationOptions,
        }),
      ).toThrow();
    }

    assertOptionsError({
      requireResolversForAllFields: true,
      requireResolversForNonScalar: true,
      requireResolversForArgs: true,
    });
    assertOptionsError({
      requireResolversForAllFields: true,
      requireResolversForNonScalar: true,
    });
    assertOptionsError({
      requireResolversForAllFields: true,
      requireResolversForArgs: true,
    });
  });

  test('throws for any missing field if `resolverValidationOptions.requireResolversForAllFields` = true', () => {
    const typeDefs = `
      type Bird {
        id: ID
      }
      type Query {
        bird: Bird
      }
      schema {
        query: Query
      }`;

    function assertFieldError(errorMatcher: string, resolvers: IResolvers) {
      expectWarning(() => {
        makeExecutableSchema({
          typeDefs,
          resolvers,
          resolverValidationOptions: {
            requireResolversForAllFields: true,
          },
        });
      }, errorMatcher);
    }

    assertFieldError('Query.bird', {
      Bird: {
        id: (bird: { id: string }) => bird.id,
      },
    });
    assertFieldError('Bird.id', {
      Query: {
        bird: () => ({ id: '123' }),
      },
    });
  });

  test('does not throw if all fields are satisfied when `resolverValidationOptions.requireResolversForAllFields` = true', () => {
    const typeDefs = `
      type Bird {
        id: ID
      }
      type Query {
        bird: Bird
      }
      schema {
        query: Query
      }`;

    const resolvers = {
      Bird: {
        id: (bird: { id: string }) => bird.id,
      },
      Query: {
        bird: () => ({ id: '123' }),
      },
    };

    expect(() =>
      makeExecutableSchema({
        typeDefs,
        resolvers,
        resolverValidationOptions: { requireResolversForAllFields: true },
      }),
    ).not.toThrow();
  });

  test('throws an error if a resolve field cannot be used', (done) => {
    const shorthand = `
      type BirdSpecies {
        name: String!,
        wingspan: Int
      }
      type RootQuery {
        species(name: String!): [BirdSpecies]
      }
      schema {
        query: RootQuery
      }
    `;

    const resolveFunctions = {
      RootQuery: {
        speciez: (_root: any, { name }: { name: string }) => [
          {
            name: `Hello ${name}!`,
            wingspan: 200,
          },
        ],
      },
    };
    expect(() =>
      makeExecutableSchema({
        typeDefs: shorthand,
        resolvers: resolveFunctions,
      }),
    ).toThrowError('RootQuery.speciez defined in resolvers, but not in schema');
    done();
  });
  test('throws an error if a resolve type is not in schema', (done) => {
    const shorthand = `
      type BirdSpecies {
        name: String!,
        wingspan: Int
      }
      type RootQuery {
        species(name: String!): [BirdSpecies]
      }
      schema {
        query: RootQuery
      }
    `;
    const resolveFunctions = {
      BootQuery: {
        species: (_root: any, { name }: { name: string }) => [
          {
            name: `Hello ${name}!`,
            wingspan: 200,
          },
        ],
      },
    };
    expect(() =>
      makeExecutableSchema({
        typeDefs: shorthand,
        resolvers: resolveFunctions,
      }),
    ).toThrowError('"BootQuery" defined in resolvers, but not in schema');
    done();
  });
});

describe('Add error logging to schema', () => {
  test('throws an error if no logger is provided', () => {
    expect(() =>
      addErrorLoggingToSchema(({} as unknown) as GraphQLSchema),
    ).toThrow('Must provide a logger');
  });
  test('throws an error if logger.log is not a function', () => {
    expect(() =>
      addErrorLoggingToSchema(
        ({} as unknown) as GraphQLSchema,
        ({ log: '1' } as unknown) as ILogger,
      ),
    ).toThrow('Logger.log must be a function');
  });
});

describe('Attaching external data fetchers to schema', () => {
  describe('Schema level resolver', () => {
    test('actually runs', () => {
      const jsSchema = makeExecutableSchema({
        typeDefs: testSchema,
        resolvers: testResolvers,
      });
      const rootResolver = () => ({ species: 'ROOT' });
      addSchemaLevelResolver(jsSchema, rootResolver);
      const query = `{
        species(name: "strix")
      }`;
      return graphql(jsSchema, query).then((res) => {
        expect(res.data.species).toBe('ROOTstrix');
      });
    });

    test('can wrap fields that do not have a resolver defined', () => {
      const jsSchema = makeExecutableSchema({
        typeDefs: testSchema,
        resolvers: testResolvers,
      });
      const rootResolver = () => ({ stuff: 'stuff' });
      addSchemaLevelResolver(jsSchema, rootResolver);
      const query = `{
        stuff
      }`;
      return graphql(jsSchema, query).then((res) => {
        expect(res.data.stuff).toBe('stuff');
      });
    });

    test('runs only once per query', () => {
      const simpleResolvers = {
        RootQuery: {
          usecontext: (_r: any, _a: Record<string, any>, ctx: any) =>
            ctx.usecontext,
          species: (root: any, { name }: { name: string }) =>
            (root.species as string) + name,
        },
      };
      const jsSchema = makeExecutableSchema({
        typeDefs: testSchema,
        resolvers: simpleResolvers,
      });
      let count = 0;
      const rootResolver = () => {
        if (count === 0) {
          count += 1;
          return { stuff: 'stuff', species: 'some ' };
        }
        return { stuff: 'EEE', species: 'EEE' };
      };
      addSchemaLevelResolver(jsSchema, rootResolver);
      const query = `{
        species(name: "strix")
        stuff
      }`;
      const expected = {
        species: 'some strix',
        stuff: 'stuff',
      };
      return graphql(jsSchema, query).then((res) => {
        expect(res.data).toEqual(expected);
      });
    });

    test('runs twice for two queries', () => {
      const simpleResolvers = {
        RootQuery: {
          usecontext: (_r: any, _a: Record<string, any>, ctx: any) =>
            ctx.usecontext,
          species: (root: any, { name }: { name: string }) =>
            (root.species as string) + name,
        },
      };
      const jsSchema = makeExecutableSchema({
        typeDefs: testSchema,
        resolvers: simpleResolvers,
      });
      let count = 0;
      const rootResolver = () => {
        if (count === 0) {
          count += 1;
          return { stuff: 'stuff', species: 'some ' };
        }
        if (count === 1) {
          count += 1;
          return { stuff: 'stuff2', species: 'species2 ' };
        }
        return { stuff: 'EEE', species: 'EEE' };
      };
      addSchemaLevelResolver(jsSchema, rootResolver);
      const query = `{
        species(name: "strix")
        stuff
      }`;
      const expected = {
        species: 'some strix',
        stuff: 'stuff',
      };
      const expected2 = {
        species: 'species2 strix',
        stuff: 'stuff2',
      };
      return graphql(jsSchema, query).then((res) => {
        expect(res.data).toEqual(expected);
        return graphql(jsSchema, query).then((res2) =>
          expect(res2.data).toEqual(expected2),
        );
      });
    });

    test('can attach things to context', () => {
      const jsSchema = makeExecutableSchema({
        typeDefs: testSchema,
        resolvers: testResolvers,
      });
      const rootResolver = (_o: any, _a: Record<string, any>, ctx: any) => {
        ctx.usecontext = 'ABC';
      };
      addSchemaLevelResolver(jsSchema, rootResolver);
      const query = `{
        usecontext
      }`;
      const expected = {
        usecontext: 'ABC',
      };
      return graphql(jsSchema, query, {}, {}).then((res) => {
        expect(res.data).toEqual(expected);
      });
    });
  });
});

describe('Generating a full graphQL schema with resolvers and connectors', () => {
  test('outputs a working GraphQL schema', () => {
    const schema = makeExecutableSchema({
      typeDefs: testSchema,
      resolvers: testResolvers,
    });
    const query = `{
      species(name: "uhu")
      stuff
      usecontext
    }`;
    const expected = {
      species: 'ROOTuhu',
      stuff: 'stuff',
      usecontext: 'ABC',
    };
    return graphql(schema, query, {}, { usecontext: 'ABC' }).then((res) => {
      expect(res.data).toEqual(expected);
    });
  });
});

describe('chainResolvers', () => {
  test('can chain two resolvers', () => {
    const r1 = (root: number) => root + 1;
    const r2 = (root: number, { addend }: { addend: number }) => root + addend;

    const rChained = chainResolvers([r1, r2]);
    expect(rChained(0, { addend: 2 }, null, null)).toBe(3);
  });

  test('uses default resolver when a resolver is undefined', () => {
    const r1 = (_root: any, { name }: { name: string }) => ({
      person: { name },
    });
    const r3 = (root: any) => root.name;
    const rChained = chainResolvers([r1, undefined, r3]);
    // faking the resolve info here.
    const info: GraphQLResolveInfo = ({
      fieldName: 'person',
    } as unknown) as GraphQLResolveInfo;
    expect(rChained(0, { name: 'tony' }, null, info)).toBe('tony');
  });
});

describe('attachDirectiveResolvers on field', () => {
  const testSchemaWithDirectives = `
    directive @upper on FIELD_DEFINITION
    directive @lower on FIELD_DEFINITION
    directive @default(value: String!) on FIELD_DEFINITION
    directive @catchError on FIELD_DEFINITION

    type TestObject {
      hello: String @upper
    }
    type RootQuery {
      hello: String @upper
      withDefault: String @default(value: "some default_value")
      object: TestObject
      asyncResolver: String @upper
      multiDirectives: String @upper @lower
      throwError: String @catchError
    }
    schema {
      query: RootQuery
    }
  `;

  const testObject = {
    hello: 'giau. tran minh',
  };

  const testResolversDirectives = {
    RootQuery: {
      hello: () => 'giau. tran minh',
      object: () => testObject,
      asyncResolver: async () => Promise.resolve('giau. tran minh'),
      multiDirectives: () => 'Giau. Tran Minh',
      throwError: () => {
        throw new Error('This error for testing');
      },
    },
  };

  const directiveResolvers: IDirectiveResolvers = {
    lower(
      next: NextResolverFn,
      _src: any,
      _args: { [argName: string]: any },
      _context: any,
    ) {
      return next().then((str) => {
        if (typeof str === 'string') {
          return str.toLowerCase();
        }
        return str;
      });
    },
    upper(
      next: NextResolverFn,
      _src: any,
      _args: { [argName: string]: any },
      _context: any,
    ) {
      return next().then((str) => {
        if (typeof str === 'string') {
          return str.toUpperCase();
        }
        return str;
      });
    },
    default(
      next: NextResolverFn,
      _src: any,
      args: { [argName: string]: any },
      _context: any,
    ) {
      return next().then((res) => {
        if (undefined === res) {
          return args.value;
        }
        return res;
      });
    },
    catchError(
      next: NextResolverFn,
      _src: any,
      _args: { [argName: string]: any },
      _context: any,
    ) {
      return next().catch((error) => error.message);
    },
  };

  test('throws error if directiveResolvers argument is an array', () => {
    const jsSchema = makeExecutableSchema({
      typeDefs: testSchema,
      resolvers: testResolvers,
    });
    expect(() =>
      attachDirectiveResolvers(jsSchema, ([
        1,
      ] as unknown) as IDirectiveResolvers),
    ).toThrowError(
      'Expected directiveResolvers to be of type object, got Array',
    );
  });

  test('throws error if directiveResolvers argument is not an object', () => {
    const jsSchema = makeExecutableSchema({
      typeDefs: testSchema,
      resolvers: testResolvers,
    });
    return expect(() =>
      attachDirectiveResolvers(
        jsSchema,
        ('a' as unknown) as IDirectiveResolvers,
      ),
    ).toThrowError(
      'Expected directiveResolvers to be of type object, got string',
    );
  });

  test('upper String from resolvers', () => {
    const schema = makeExecutableSchema({
      typeDefs: testSchemaWithDirectives,
      resolvers: testResolversDirectives,
      directiveResolvers,
    });
    const query = `{
      hello
    }`;
    const expected = {
      hello: 'GIAU. TRAN MINH',
    };
    return graphql(schema, query, {}, {}).then((res) => {
      expect(res.data).toEqual(expected);
    });
  });

  test('using default resolver for object property', () => {
    const schema = makeExecutableSchema({
      typeDefs: testSchemaWithDirectives,
      resolvers: testResolversDirectives,
      directiveResolvers,
    });
    const query = `{
      object {
        hello
      }
    }`;
    const expected = {
      object: {
        hello: 'GIAU. TRAN MINH',
      },
    };
    return graphql(schema, query, {}, {}).then((res) => {
      expect(res.data).toEqual(expected);
    });
  });

  test('passes in directive arguments to the directive resolver', () => {
    const schema = makeExecutableSchema({
      typeDefs: testSchemaWithDirectives,
      resolvers: testResolversDirectives,
      directiveResolvers,
    });
    const query = `{
      withDefault
    }`;
    const expected = {
      withDefault: 'some default_value',
    };
    return graphql(schema, query, {}, {}).then((res) => {
      expect(res.data).toEqual(expected);
    });
  });

  test('No effect if missing directive resolvers', () => {
    const schema = makeExecutableSchema({
      typeDefs: testSchemaWithDirectives,
      resolvers: testResolversDirectives,
      directiveResolvers: {}, // Empty resolver
    });
    const query = `{
      hello
    }`;
    const expected = {
      hello: 'giau. tran minh',
    };
    return graphql(schema, query, {}, {}).then((res) => {
      expect(res.data).toEqual(expected);
    });
  });

  test('If resolver return Promise, keep using it', () => {
    const schema = makeExecutableSchema({
      typeDefs: testSchemaWithDirectives,
      resolvers: testResolversDirectives,
      directiveResolvers,
    });
    const query = `{
      asyncResolver
    }`;
    const expected = {
      asyncResolver: 'GIAU. TRAN MINH',
    };
    return graphql(schema, query, {}, {}).then((res) => {
      expect(res.data).toEqual(expected);
    });
  });

  test('Multi directives apply with LTR order', () => {
    const schema = makeExecutableSchema({
      typeDefs: testSchemaWithDirectives,
      resolvers: testResolversDirectives,
      directiveResolvers,
    });
    const query = `{
      multiDirectives
    }`;
    const expected = {
      multiDirectives: 'giau. tran minh',
    };
    return graphql(schema, query, {}, {}).then((res) => {
      expect(res.data).toEqual(expected);
    });
  });

  test('Allow to catch error from next resolver', () => {
    const schema = makeExecutableSchema({
      typeDefs: testSchemaWithDirectives,
      resolvers: testResolversDirectives,
      directiveResolvers,
    });
    const query = `{
      throwError
    }`;
    const expected = {
      throwError: 'This error for testing',
    };
    return graphql(schema, query, {}, {}).then((res) => {
      expect(res.data).toEqual(expected);
    });
  });
});

describe('can specify lexical parser options', () => {
  test("can specify 'noLocation' option", () => {
    const schema = makeExecutableSchema({
      typeDefs: `
        type RootQuery {
          test: String
        }
        schema {
          query: RootQuery
        }
      `,
      resolvers: {},
      parseOptions: {
        noLocation: true,
      },
    });

    expect(schema.astNode.loc).toBeUndefined();
  });

  test("can specify 'experimentalFragmentVariables' option", () => {
    const typeDefs = `
      type Query {
        version: Int
      }
    `;

    const resolvers = {
      Query: {
        version: () => 1,
      },
    };

    expect(() => {
      makeExecutableSchema({
        typeDefs,
        resolvers,
        parseOptions: {
          experimentalFragmentVariables: true,
        },
      });
    }).not.toThrowError();
  });

  // Note that the experimentalFragmentVariables option requires a client side transform
  // to hoist the parsed variables into queries, see https://github.com/graphql/graphql-js/pull/1141
  // and so this really has nothing to do with schema creation or execution.
  test("can use 'experimentalFragmentVariables' option", async () => {
    const typeDefs = `
      type Query {
        hello(phrase: String): String
      }
    `;

    const resolvers = {
      Query: {
        hello: (_root: any, args: any) => `hello ${args.phrase as string}`,
      },
    };

    const jsSchema = makeExecutableSchema({
      typeDefs,
      resolvers,
    });

    const query = `
      fragment Hello($phrase: String = "world") on Query {
        hello(phrase: $phrase)
      }
      query {
        ...Hello
      }
    `;

    const parsedQuery = parse(query, { experimentalFragmentVariables: true });

    const hoist = (document: DocumentNode) => {
      let variableDefs: Array<VariableDefinitionNode> = [];

      document.definitions.forEach((def) => {
        if (def.kind === Kind.FRAGMENT_DEFINITION) {
          variableDefs = variableDefs.concat(def.variableDefinitions);
        }
      });

      return {
        kind: Kind.DOCUMENT,
        definitions: parsedQuery.definitions.map((def) => ({
          ...def,
          variableDefinitions: variableDefs,
        })),
      };
    };

    const hoistedQuery = hoist(parsedQuery);

    const result = await execute(jsSchema, hoistedQuery);
    expect(result.data).toEqual({ hello: 'hello world' });

    const result2 = await execute(jsSchema, hoistedQuery, null, null, {
      phrase: 'world again!',
    });
    expect(result2.data).toEqual({ hello: 'hello world again!' });
  });
});

describe('interfaces', () => {
  const testSchemaWithInterfaces = `
  interface Node {
    id: ID!
  }
  type User implements Node {
    id: ID!
    name: String!
  }
  type Query {
    node: Node!
    user: User!
  }
  schema {
    query: Query
  }
  `;
  const user = { id: 1, type: 'User', name: 'Kim' };
  const queryResolver = {
    node: () => user,
    user: () => user,
  };
  const query = `query {
    node { id __typename }
    user { id name }
  }`;

  test('throws if there is no interface resolveType resolver', () => {
    const resolvers = {
      Query: queryResolver,
    };
    try {
      makeExecutableSchema({
        typeDefs: testSchemaWithInterfaces,
        resolvers,
        resolverValidationOptions: { requireResolversForResolveType: true },
      });
    } catch (error) {
      expect(error.message).toEqual(
        'Type "Node" is missing a "__resolveType" resolver. Pass false into "resolverValidationOptions.requireResolversForResolveType" to disable this error.',
      );
      return;
    }
    throw new Error('Should have had an error.');
  });
  test('does not throw if there is an interface resolveType resolver', async () => {
    const resolvers = {
      Query: queryResolver,
      Node: {
        __resolveType: ({ type }: { type: string }) => type,
      },
    };
    const schema = makeExecutableSchema({
      typeDefs: testSchemaWithInterfaces,
      resolvers,
      resolverValidationOptions: { requireResolversForResolveType: true },
    });
    const response = await graphql(schema, query);
    expect(response.errors).not.toBeDefined();
  });
  test('does not warn if requireResolversForResolveType is disabled and there are missing resolvers', () => {
    const resolvers = {
      Query: queryResolver,
    };
    makeExecutableSchema({
      typeDefs: testSchemaWithInterfaces,
      resolvers,
      resolverValidationOptions: { requireResolversForResolveType: false },
    });
  });
});

describe('interface resolver inheritance', () => {
  test('copies resolvers from the interfaces', async () => {
    const testSchemaWithInterfaceResolvers = `
    interface Node {
      id: ID!
    }
    type User implements Node {
      id: ID!
      name: String!
    }
    type Query {
      user: User!
    }
    schema {
      query: Query
    }
    `;
    const user = { id: 1, name: 'Ada', type: 'User' };
    const resolvers = {
      Node: {
        __resolveType: ({ type }: { type: string }) => type,
        id: ({ id }: { id: number }) => `Node:${id.toString()}`,
      },
      User: {
        name: ({ name }: { name: string }) => `User:${name}`,
      },
      Query: {
        user: () => user,
      },
    };
    const schema = makeExecutableSchema({
      typeDefs: testSchemaWithInterfaceResolvers,
      resolvers,
      inheritResolversFromInterfaces: true,
      resolverValidationOptions: {
        requireResolversForAllFields: true,
        requireResolversForResolveType: true,
      },
    });
    const query = '{ user { id name } }';
    const response = await graphql(schema, query);
    expect(response).toEqual({
      data: {
        user: {
          id: 'Node:1',
          name: 'User:Ada',
        },
      },
    });
  });

  test('respects interface order and existing resolvers', async () => {
    const testSchemaWithInterfaceResolvers = `
    interface Node {
      id: ID!
    }
    interface Person {
      id: ID!
      name: String!
    }
    type Replicant implements Node, Person {
      id: ID!
      name: String!
    }
    type Cyborg implements Person, Node {
      id: ID!
      name: String!
    }
    type Query {
      cyborg: Cyborg!
      replicant: Replicant!
    }
    schema {
      query: Query
    }
    `;
    const cyborg = { id: 1, name: 'Alex Murphy', type: 'Cyborg' };
    const replicant = { id: 2, name: 'Rachael Tyrell', type: 'Replicant' };
    const resolvers = {
      Node: {
        __resolveType: ({ type }: { type: string }) => type,
        id: ({ id }: { id: number }) => `Node:${id.toString()}`,
      },
      Person: {
        __resolveType: ({ type }: { type: string }) => type,
        id: ({ id }: { id: number }) => `Person:${id.toString()}`,
        name: ({ name }: { name: string }) => `Person:${name}`,
      },
      Query: {
        cyborg: () => cyborg,
        replicant: () => replicant,
      },
    };
    const schema = makeExecutableSchema({
      parseOptions: { allowLegacySDLImplementsInterfaces: true },
      typeDefs: testSchemaWithInterfaceResolvers,
      resolvers,
      inheritResolversFromInterfaces: true,
      resolverValidationOptions: {
        requireResolversForAllFields: true,
        requireResolversForResolveType: true,
      },
    });
    const query = '{ cyborg { id name } replicant { id name }}';
    const response = await graphql(schema, query);
    expect(response).toEqual({
      data: {
        cyborg: {
          id: 'Node:1',
          name: 'Person:Alex Murphy',
        },
        replicant: {
          id: 'Person:2',
          name: 'Person:Rachael Tyrell',
        },
      },
    });
  });
});

describe('unions', () => {
  const testSchemaWithUnions = `
    type Post {
      title: String!
    }
    type Page {
      title: String!
    }
    union Displayable = Page | Post
    type Query {
      page: Page!
      post: Post!
      displayable: [Displayable!]!
    }
    schema {
      query: Query
    }
  `;
  const post = { title: 'I am a post', type: 'Post' };
  const page = { title: 'I am a page', type: 'Page' };
  const queryResolver = {
    page: () => page,
    post: () => post,
    displayable: () => [post, page],
  };
  const query = `query {
    post { title }
    page { title }
    displayable {
      ... on Post { title }
      ... on Page { title }
    }
  }`;

  test('throws if there is no union resolveType resolver', () => {
    const resolvers = {
      Query: queryResolver,
    };
    try {
      makeExecutableSchema({
        typeDefs: testSchemaWithUnions,
        resolvers,
        resolverValidationOptions: { requireResolversForResolveType: true },
      });
    } catch (error) {
      expect(error.message).toEqual(
        'Type "Displayable" is missing a "__resolveType" resolver. Pass false into "resolverValidationOptions.requireResolversForResolveType" to disable this error.',
      );
      return;
    }
    throw new Error('Should have had an error.');
  });
  test('does not throw if there is a resolveType resolver', async () => {
    const resolvers = {
      Query: queryResolver,
      Displayable: {
        __resolveType: ({ type }: { type: string }) => type,
      },
    };
    const schema = makeExecutableSchema({
      typeDefs: testSchemaWithUnions,
      resolvers,
      resolverValidationOptions: { requireResolversForResolveType: true },
    });
    const response = await graphql(schema, query);
    expect(response.errors).not.toBeDefined();
  });
  test('does not warn if requireResolversForResolveType is disabled', () => {
    const resolvers = {
      Query: queryResolver,
    };
    makeExecutableSchema({
      typeDefs: testSchemaWithUnions,
      resolvers,
      resolverValidationOptions: { requireResolversForResolveType: false },
    });
  });
});
