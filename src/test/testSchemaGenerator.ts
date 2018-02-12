// TODO: reduce code repetition in this file.
// see https://github.com/apollostack/graphql-tools/issues/26

import { assert, expect } from 'chai';
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
} from 'graphql';
// import { printSchema } from 'graphql';
const GraphQLJSON = require('graphql-type-json');
import { Logger } from '../Logger';
import TypeA from './circularSchemaA';
import {
  makeExecutableSchema,
  SchemaError,
  addErrorLoggingToSchema,
  addSchemaLevelResolveFunction,
  attachConnectorsToContext,
  attachDirectiveResolvers,
  chainResolvers,
  concatenateTypeDefs,
} from '../schemaGenerator';
import {
  IResolverValidationOptions,
  IResolvers,
  IExecutableSchemaDefinition,
  IDirectiveResolvers,
  NextResolverFn,
} from '../Interfaces';
import 'mocha';

interface Bird {
  name: string;
  wingspan?: number;
}

function expectWarning(fn: () => void, warnMatcher?: string) {
  let originalWarn = console.warn;
  let warning: string = null;

  try {
    console.warn = function warn(message: string) {
      warning = message;
    };

    fn();

    if (undefined === warnMatcher) {
      expect(warning).to.be.equal(null);
    } else {
      expect(warning).to.contain(warnMatcher);
    }
  } finally {
    console.warn = originalWarn;
  }
}

const testSchema = `
      type RootQuery {
        usecontext: String
        useTestConnector: String
        useContextConnector: String
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
    usecontext: (r: any, a: { [key: string]: any }, ctx: any) => ctx.usecontext,
    useTestConnector: (r: any, a: { [key: string]: any }, ctx: any) =>
      ctx.connectors.TestConnector.get(),
    useContextConnector: (r: any, a: { [key: string]: any }, ctx: any) =>
      ctx.connectors.ContextConnector.get(),
    species: (root: any, { name }: { name: string }) => root.species + name,
  },
};
class TestConnector {
  public get() {
    return 'works';
  }
}

class ContextConnector {
  private str: string;

  constructor(ctx: any) {
    this.str = ctx.str;
  }
  public get() {
    return this.str;
  }
}
const testConnectors = {
  TestConnector,
  ContextConnector,
};

describe('generating schema from shorthand', () => {
  it('throws an error if no schema is provided', () => {
    expect(() => (<any>makeExecutableSchema)()).to.throw('undefined');
  });

  it('throws an error if typeDefinitionNodes are not provided', () => {
    expect(() =>
      (<any>makeExecutableSchema)({ typeDefs: undefined, resolvers: {} }),
    ).to.throw('Must provide typeDefs');
  });

  it('throws an error if no resolveFunctions are provided', () => {
    expect(() =>
      (<any>makeExecutableSchema)({ typeDefs: 'blah', resolvers: {} }),
    ).to.throw(GraphQLError);
  });

  it('throws an error if typeDefinitionNodes is neither string nor array nor schema AST', () => {
    expect(() =>
      (<any>makeExecutableSchema)({ typeDefs: {}, resolvers: {} }),
    ).to.throw('typeDefs must be a string, array or schema AST, got object');
  });

  it('throws an error if typeDefinitionNode array contains not only functions and strings', () => {
    expect(() =>
      (<any>makeExecutableSchema)({ typeDefs: [17], resolvers: {} }),
    ).to.throw(
      'typeDef array must contain only strings and functions, got number',
    );
  });

  it('throws an error if resolverValidationOptions is not an object', () => {
    expect(() =>
      makeExecutableSchema({
        typeDefs: 'blah',
        resolvers: {},
        resolverValidationOptions: 'string',
      } as IExecutableSchemaDefinition),
    ).to.throw('Expected `resolverValidationOptions` to be an object');
  });

  it('can generate a schema', () => {
    let shorthand = `
      """
      A bird species
      """
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

    if (process.env.GRAPHQL_VERSION === '^0.11') {
      shorthand = `
        # A bird species
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
    }

    const resolve = {
      RootQuery: {
        species() {
          return;
        },
      },
    };

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
                name: <string>null,
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
          description: '',
          fields: [
            {
              name: 'species',
              type: {
                kind: 'LIST',
                name: <string>null,
                ofType: {
                  name: 'BirdSpecies',
                },
              },
              args: [
                {
                  name: 'name',
                  type: {
                    name: <string>null,
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
      resolvers: resolve,
    });
    const resultPromise = graphql(jsSchema, introspectionQuery);
    return resultPromise.then(result =>
      assert.deepEqual(result, solution as ExecutionResult),
    );
  });

  it('can generate a schema from an array of types', () => {
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
    expect(jsSchema.getQueryType().name).to.equal('Query');
  });

  it('can generate a schema from a parsed type definition', () => {
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
    expect(jsSchema.getQueryType().name).to.equal('Query');
  });

  it('can generate a schema from an array of parsed and none parsed type definitions', () => {
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
    expect(jsSchema.getQueryType().name).to.equal('Query');
  });

  it('can generate a schema from an array of types with extensions', () => {
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
    expect(jsSchema.getQueryType().name).to.equal('Query');
    expect(jsSchema.getQueryType().getFields()).to.have.all.keys('foo', 'bar');
  });

  it('can concatenateTypeDefs created by a function inside a closure', () => {
    const typeA = { typeDefs: () => ['type TypeA { foo: String }'] };
    const typeB = { typeDefs: () => ['type TypeB { bar: String }'] };
    const typeC = { typeDefs: () => ['type TypeC { foo: String }'] };
    const typeD = { typeDefs: () => ['type TypeD { bar: String }'] };

    function combineTypeDefs(...args: Array<any>): any {
      return { typeDefs: () => args.map(o => o.typeDefs) };
    }

    const combinedAandB = combineTypeDefs(typeA, typeB);
    const combinedCandD = combineTypeDefs(typeC, typeD);

    const result = concatenateTypeDefs([
      combinedAandB.typeDefs,
      combinedCandD.typeDefs,
    ]);

    expect(result).to.contain('type TypeA');
    expect(result).to.contain('type TypeB');
    expect(result).to.contain('type TypeC');
    expect(result).to.contain('type TypeD');
  });

  it('properly deduplicates the array of type DefinitionNodes', () => {
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
    expect(jsSchema.getQueryType().name).to.equal('Query');
  });

  it('works with imports, even circular ones', () => {
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
    expect(jsSchema.getQueryType().name).to.equal('Query');
  });

  it('can generate a schema with resolve functions', () => {
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
        species: (root: any, { name }: { name: string }) => [
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
    return resultPromise.then(result =>
      assert.deepEqual(result, solution as ExecutionResult),
    );
  });

  it('can generate a schema with extensions that can use resolvers', () => {
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
        species: (root: any, { name }: { name: string }) => [
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
    return resultPromise.then(result =>
      assert.deepEqual(result, solution as ExecutionResult),
    );
  });

  it('supports resolveType for unions', () => {
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
          resolve(root: any, { name }: { name: string }) {
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
        __resolveType(data: any, context: any, info: GraphQLResolveInfo) {
          if (data.age) {
            return info.schema.getType('Person');
          }
          if (data.coordinates) {
            return info.schema.getType('Location');
          }
          console.error('no type!');
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
    return resultPromise.then(result =>
      assert.deepEqual(result, solution as ExecutionResult),
    );
  });

  it('can generate a schema with an array of resolvers', () => {
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

    const resolveFunctions = {
      RootQuery: {
        species: (root: any, { name }: { name: string }) => [
          {
            name: `Hello ${name}!`,
            wingspan: 200,
            height: 30.2,
          },
        ],
      },
    };

    const otherResolveFunctions = {
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
      resolvers: [resolveFunctions, otherResolveFunctions],
    });
    const resultPromise = graphql(jsSchema, testQuery);
    return resultPromise.then(result =>
      assert.deepEqual(result, solution as ExecutionResult),
    );
  });

  describe('scalar types', () => {
    it('supports passing a GraphQLScalarType in resolveFunctions', () => {
      // Here GraphQLJSON is used as an example of non-default GraphQLScalarType
      const shorthand = `
        scalar JSON

        type Foo {
          aField: JSON
        }

        type Query {
          foo: Foo
        }
      `;
      const resolveFunctions = {
        JSON: GraphQLJSON,
      };
      const jsSchema = makeExecutableSchema({
        typeDefs: shorthand,
        resolvers: resolveFunctions,
      });
      expect(jsSchema.getQueryType().name).to.equal('Query');
      expect(jsSchema.getType('JSON')).to.be.an.instanceof(GraphQLScalarType);
      expect(jsSchema.getType('JSON'))
        .to.have.property('description')
        .that.is.a('string');
      expect(jsSchema.getType('JSON')['description']).to.have.length.above(0);
    });

    it('should support custom scalar usage on client-side query execution', () => {
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
      return resultPromise.then(result => expect(result.errors).to.not.exist);
    });

    it('should work with an Odd custom scalar type', () => {
      const oddValue = (value: number) => {
        return value % 2 === 1 ? value : null;
      };

      const OddType = new GraphQLScalarType({
        name: 'Odd',
        description: 'Odd custom scalar type',
        parseValue: oddValue,
        serialize: oddValue,
        parseLiteral(ast) {
          if (ast.kind === Kind.INT) {
            const intValue: IntValueNode = <IntValueNode>ast;
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
        typeDefs: typeDefs,
        resolvers: resolvers,
      });
      const testQuery = `
        {
          post {
            something
          }
        }
  `;
      const resultPromise = graphql(jsSchema, testQuery);
      return resultPromise.then(result => {
        assert.equal(result.data['post'].something, testValue);
        assert.equal(result.errors, undefined);
      });
    });

    it('should work with a Date custom scalar type', () => {
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
            const intValue: IntValueNode = <IntValueNode>ast;
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
        typeDefs: typeDefs,
        resolvers: resolvers,
      });
      const testQuery = `
        {
          post {
            something
          }
        }
  `;
      const resultPromise = graphql(jsSchema, testQuery);
      return resultPromise.then(result => {
        assert.equal(result.data['post'].something, testDate.getTime());
        assert.equal(result.errors, undefined);
      });
    });
  });

  describe('enum support', () => {
    it('supports passing a GraphQLEnumType in resolveFunctions', () => {
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

      expect(jsSchema.getQueryType().name).to.equal('Query');
      expect(jsSchema.getType('Color')).to.be.an.instanceof(GraphQLEnumType);
      expect(jsSchema.getType('NumericEnum')).to.be.an.instanceof(
        GraphQLEnumType,
      );
    });

    it('supports passing the value for a GraphQLEnumType in resolveFunctions', () => {
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

      const testQuery = `{
        color
        numericEnum
       }`;

      const resolveFunctions = {
        Color: {
          RED: '#EA3232',
        },
        NumericEnum: {
          TEST: 1,
        },
        Query: {
          color() {
            return '#EA3232';
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
      return resultPromise.then(result => {
        assert.equal(result.data['color'], 'RED');
        assert.equal(result.data['numericEnum'], 'TEST');
        assert.equal(result.errors, undefined);
      });
    });
  });

  it('can set description and deprecation reason', () => {
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
          resolve: (root: any, { name }: { name: string }) => [
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
    return resultPromise.then(result =>
      assert.deepEqual(result, solution as ExecutionResult),
    );
  });

  it('shows a warning if a field has arguments but no resolve func', () => {
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
    }, 'Resolve function missing for "Query.bird"');
  });

  // tslint:disable-next-line: max-line-length
  it('does not throw an error if `resolverValidationOptions.requireResolversForArgs` is false', () => {
    const short = `
    type Query{
      bird(id: ID): String
    }
    schema {
      query: Query
    }`;

    const rf = { Query: {} };

    // tslint:disable-next-line: max-line-length
    assert.doesNotThrow(
      makeExecutableSchema.bind(null, { typeDefs: short, resolvers: rf }),
      SchemaError,
    );
  });

  it('throws an error if a resolver is not a function', () => {
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
      } as IExecutableSchemaDefinition),
    ).to.throw('Resolver Query.bird must be object or function');
  });

  it('shows a warning if a field is not scalar, but has no resolve func', () => {
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
    }, 'Resolve function missing for "Query.bird"');
  });

  // tslint:disable-next-line: max-line-length
  it('allows non-scalar field to use default resolve func if `resolverValidationOptions.requireResolversForNonScalar` = false', () => {
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

    // tslint:disable-next-line: max-line-length
    assert.doesNotThrow(
      makeExecutableSchema.bind(null, {
        typeDefs: short,
        resolvers: rf,
        resolverValidationOptions: { requireResolversForNonScalar: false },
      }),
      SchemaError,
    );
  });

  it('throws if resolver defined for non-object/interface type', () => {
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
    ).to.throw(`Searchable was defined in resolvers, but it's not an object`);

    expect(() =>
      makeExecutableSchema({
        typeDefs: short,
        resolvers: rf,
        resolverValidationOptions: {
          allowResolversNotInSchema: true,
        },
      }),
    ).to.not.throw();
  });

  it('throws if resolver defined for non existent type', () => {
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
    ).to.throw(`"Searchable" defined in resolvers, but not in schema`);

    expect(() =>
      makeExecutableSchema({
        typeDefs: short,
        resolvers: rf,
        resolverValidationOptions: {
          allowResolversNotInSchema: true,
        },
      }),
    ).to.not.throw();
  });

  it('doesnt let you define resolver field not present in schema', () => {
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
    ).to.throw(`RootQuery.name defined in resolvers, but not in schema`);

    expect(() =>
      makeExecutableSchema({
        typeDefs: short,
        resolvers: rf,
        resolverValidationOptions: {
          allowResolversNotInSchema: true,
        },
      }),
    ).to.not.throw();
  });

  it('throws if conflicting validation options are passed', () => {
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
      // tslint:disable-next-line: max-line-length
      assert.throws(
        () =>
          makeExecutableSchema({
            typeDefs,
            resolvers,
            resolverValidationOptions,
          }),
        TypeError,
      );
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

  // tslint:disable-next-line: max-line-length
  it('throws for any missing field if `resolverValidationOptions.requireResolversForAllFields` = true', () => {
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

    assertFieldError('Bird.id', {});
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

  // tslint:disable-next-line: max-line-length
  it('does not throw if all fields are satisfied when `resolverValidationOptions.requireResolversForAllFields` = true', () => {
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

    // tslint:disable-next-line: max-line-length
    assert.doesNotThrow(() =>
      makeExecutableSchema({
        typeDefs,
        resolvers,
        resolverValidationOptions: { requireResolversForAllFields: true },
      }),
    );
  });

  it('throws an error if a resolve field cannot be used', done => {
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
        speciez: (root: any, { name }: { name: string }) => [
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
    ).to.throw('RootQuery.speciez defined in resolvers, but not in schema');
    done();
  });
  it('throws an error if a resolve type is not in schema', done => {
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
        species: (root: any, { name }: { name: string }) => [
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
    ).to.throw('"BootQuery" defined in resolvers, but not in schema');
    done();
  });
});

describe('providing useful errors from resolve functions', () => {
  it('logs an error if a resolve function fails', () => {
    const shorthand = `
      type RootQuery {
        species(name: String): String
      }
      schema {
        query: RootQuery
      }
    `;
    const resolve = {
      RootQuery: {
        species: (): string => {
          throw new Error('oops!');
        },
      },
    };

    // TODO: Should use a spy here instead of logger class
    // to make sure we don't duplicate tests from Logger.
    const logger = new Logger();
    const jsSchema = makeExecutableSchema({
      typeDefs: shorthand,
      resolvers: resolve,
      logger,
    });
    const testQuery = '{ species }';
    const expected = 'Error in resolver RootQuery.species\noops!';
    return graphql(jsSchema, testQuery).then(res => {
      assert.equal(logger.errors.length, 1);
      assert.equal(logger.errors[0].message, expected);
    });
  });

  it('will throw errors on undefined if you tell it to', () => {
    const shorthand = `
      type RootQuery {
        species(name: String): String
        stuff: String
      }
      schema {
        query: RootQuery
      }
    `;
    const resolve = {
      RootQuery: {
        species: (): string => undefined,
        stuff: () => 'stuff',
      },
    };

    const logger = new Logger();
    const jsSchema = makeExecutableSchema({
      typeDefs: shorthand,
      resolvers: resolve,
      logger,
      allowUndefinedInResolve: false,
    });
    const testQuery = '{ species, stuff }';
    const expectedErr = /Resolve function for "RootQuery.species" returned undefined/;
    const expectedResData = { species: <string>null, stuff: 'stuff' };
    return graphql(jsSchema, testQuery).then(res => {
      assert.equal(logger.errors.length, 1);
      assert.match(logger.errors[0].message, expectedErr);
      assert.deepEqual(res.data, expectedResData);
    });
  });

  it('decorateToCatchUndefined preserves default resolvers', () => {
    const shorthand = `
      type Thread {
        name: String
      }
      type RootQuery {
        thread(name: String): Thread
      }
      schema {
        query: RootQuery
      }
    `;
    const resolve = {
      RootQuery: {
        thread(root: any, args: { [key: string]: any }) {
          return args;
        },
      },
    };

    const jsSchema = makeExecutableSchema({
      typeDefs: shorthand,
      resolvers: resolve,
      allowUndefinedInResolve: false,
    });
    const testQuery = `{
        thread(name: "SomeThread") {
            name
        }
    }`;
    const expectedResData = {
      thread: {
        name: 'SomeThread',
      },
    };
    return graphql(jsSchema, testQuery).then(res => {
      assert.deepEqual(res.data, expectedResData);
    });
  });

  it('decorateToCatchUndefined throws even if default resolvers are preserved', () => {
    const shorthand = `
      type Thread {
        name: String
      }
      type RootQuery {
        thread(name: String): Thread
      }
      schema {
        query: RootQuery
      }
    `;
    const resolve = {
      RootQuery: {
        thread(root: any, args: { [key: string]: any }) {
          return { name: (): any => undefined };
        },
      },
    };

    const jsSchema = makeExecutableSchema({
      typeDefs: shorthand,
      resolvers: resolve,
      allowUndefinedInResolve: false,
    });
    const testQuery = `{
        thread {
            name
        }
    }`;
    return graphql(jsSchema, testQuery).then(res => {
      expect((<any>res.errors[0]).originalError.message).to.equal(
        'Resolve function for "Thread.name" returned undefined',
      );
    });
  });

  it('will use default resolver when returning function properties ', () => {
    const shorthand = `
      type Thread {
        name: String
      }
      type RootQuery {
        thread(name: String): Thread
      }
      schema {
        query: RootQuery
      }
    `;
    const resolve = {
      RootQuery: {
        thread(root: any, args: { [key: string]: any }) {
          return { name: () => args['name'] };
        },
      },
    };

    const jsSchema = makeExecutableSchema({
      typeDefs: shorthand,
      resolvers: resolve,
      allowUndefinedInResolve: false,
    });
    const testQuery = `{
        thread(name: "SomeThread") {
            name
        }
    }`;
    const expectedResData = {
      thread: {
        name: 'SomeThread',
      },
    };
    return graphql(jsSchema, testQuery).then(res => {
      assert.deepEqual(res.data, expectedResData);
    });
  });

  it('will not throw errors on undefined by default', done => {
    const shorthand = `
      type RootQuery {
        species(name: String): String
        stuff: String
      }
      schema {
        query: RootQuery
      }
    `;
    const resolve = {
      RootQuery: {
        species: (): string => undefined,
        stuff: () => 'stuff',
      },
    };

    const logger = new Logger();
    const jsSchema = makeExecutableSchema({
      typeDefs: shorthand,
      resolvers: resolve,
      logger,
    });
    const testQuery = '{ species, stuff }';
    const expectedResData = { species: <string>null, stuff: 'stuff' };
    graphql(jsSchema, testQuery).then(res => {
      assert.equal(logger.errors.length, 0);
      assert.deepEqual(res.data, expectedResData);
      done();
    });
  });
});

describe('Add error logging to schema', () => {
  it('throws an error if no logger is provided', () => {
    assert.throw(
      () => (<any>addErrorLoggingToSchema)({}),
      'Must provide a logger',
    );
  });
  it('throws an error if logger.log is not a function', () => {
    assert.throw(
      () => (<any>addErrorLoggingToSchema)({}, { log: '1' }),
      'Logger.log must be a function',
    );
  });
});

describe('Attaching connectors to schema', () => {
  describe('Schema level resolve function', () => {
    it('actually runs', () => {
      const jsSchema = makeExecutableSchema({
        typeDefs: testSchema,
        resolvers: testResolvers,
      });
      const rootResolver = () => ({ species: 'ROOT' });
      addSchemaLevelResolveFunction(jsSchema, rootResolver);
      const query = `{
        species(name: "strix")
      }`;
      return graphql(jsSchema, query).then(res => {
        expect(res.data['species']).to.equal('ROOTstrix');
      });
    });

    it('can wrap fields that do not have a resolver defined', () => {
      const jsSchema = makeExecutableSchema({
        typeDefs: testSchema,
        resolvers: testResolvers,
      });
      const rootResolver = () => ({ stuff: 'stuff' });
      addSchemaLevelResolveFunction(jsSchema, rootResolver);
      const query = `{
        stuff
      }`;
      return graphql(jsSchema, query).then(res => {
        expect(res.data['stuff']).to.equal('stuff');
      });
    });

    it('runs only once per query', () => {
      const simpleResolvers = {
        RootQuery: {
          usecontext: (r: any, a: { [key: string]: any }, ctx: any) =>
            ctx.usecontext,
          useTestConnector: (r: any, a: { [key: string]: any }, ctx: any) =>
            ctx.connectors.TestConnector.get(),
          useContextConnector: (r: any, a: { [key: string]: any }, ctx: any) =>
            ctx.connectors.ContextConnector.get(),
          species: (root: any, { name }: { name: string }) =>
            root.species + name,
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
      addSchemaLevelResolveFunction(jsSchema, rootResolver);
      const query = `{
        species(name: "strix")
        stuff
      }`;
      const expected = {
        species: 'some strix',
        stuff: 'stuff',
      };
      return graphql(jsSchema, query).then(res => {
        expect(res.data).to.deep.equal(expected);
      });
    });

    it('runs twice for two queries', () => {
      const simpleResolvers = {
        RootQuery: {
          usecontext: (r: any, a: { [key: string]: any }, ctx: any) =>
            ctx.usecontext,
          useTestConnector: (r: any, a: { [key: string]: any }, ctx: any) =>
            ctx.connectors.TestConnector.get(),
          useContextConnector: (r: any, a: { [key: string]: any }, ctx: any) =>
            ctx.connectors.ContextConnector.get(),
          species: (root: any, { name }: { name: string }) =>
            root.species + name,
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
      addSchemaLevelResolveFunction(jsSchema, rootResolver);
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
      return graphql(jsSchema, query).then(res => {
        expect(res.data).to.deep.equal(expected);
        return graphql(jsSchema, query).then(res2 =>
          expect(res2.data).to.deep.equal(expected2),
        );
      });
    });

    it('can attach things to context', () => {
      const jsSchema = makeExecutableSchema({
        typeDefs: testSchema,
        resolvers: testResolvers,
      });
      const rootResolver = (o: any, a: { [key: string]: any }, ctx: any) => {
        ctx['usecontext'] = 'ABC';
      };
      addSchemaLevelResolveFunction(jsSchema, rootResolver);
      const query = `{
        usecontext
      }`;
      const expected = {
        usecontext: 'ABC',
      };
      return graphql(jsSchema, query, {}, {}).then(res => {
        expect(res.data).to.deep.equal(expected);
      });
    });

    it('can attach with existing static connectors', () => {
      const resolvers = {
        RootQuery: {
          testString(root: any, args: { [key: string]: any }, ctx: any) {
            return ctx.connectors.staticString;
          },
        },
      };
      const typeDef = `
          type RootQuery {
            testString: String
          }

          schema {
            query: RootQuery
          }
      `;
      const jsSchema = makeExecutableSchema({
        typeDefs: typeDef,
        resolvers: resolvers,
        connectors: testConnectors,
      });
      const query = `{
        testString
      }`;
      const expected = {
        testString: 'Hi You!',
      };
      return graphql(
        jsSchema,
        query,
        {},
        {
          connectors: {
            staticString: 'Hi You!',
          },
        },
      ).then(res => {
        expect(res.data).to.deep.equal(expected);
      });
    });
  });

  it('actually attaches the connectors', () => {
    const jsSchema = makeExecutableSchema({
      typeDefs: testSchema,
      resolvers: testResolvers,
    });
    attachConnectorsToContext(jsSchema, testConnectors);
    const query = `{
      useTestConnector
    }`;
    const expected = {
      useTestConnector: 'works',
    };
    return graphql(jsSchema, query, {}, {}).then(res => {
      expect(res.data).to.deep.equal(expected);
    });
  });

  it('actually passes the context to the connector constructor', () => {
    const jsSchema = makeExecutableSchema({
      typeDefs: testSchema,
      resolvers: testResolvers,
    });
    attachConnectorsToContext(jsSchema, testConnectors);
    const query = `{
      useContextConnector
    }`;
    const expected = {
      useContextConnector: 'YOYO',
    };
    return graphql(jsSchema, query, {}, { str: 'YOYO' }).then(res => {
      expect(res.data).to.deep.equal(expected);
    });
  });

  it('throws error if trying to attach connectors twice', () => {
    const jsSchema = makeExecutableSchema({
      typeDefs: testSchema,
      resolvers: testResolvers,
    });
    attachConnectorsToContext(jsSchema, testConnectors);
    return expect(() =>
      attachConnectorsToContext(jsSchema, testConnectors),
    ).to.throw(
      'Connectors already attached to context, cannot attach more than once',
    );
  });

  it('throws error during execution if context is not an object', () => {
    const jsSchema = makeExecutableSchema({
      typeDefs: testSchema,
      resolvers: testResolvers,
    });
    (<any>attachConnectorsToContext)(jsSchema, { someConnector: {} });
    const query = `{
      useTestConnector
    }`;
    return graphql(jsSchema, query, {}, 'notObject').then(res => {
      expect((<any>res.errors[0]).originalError.message).to.equal(
        'Cannot attach connector because context is not an object: string',
      );
    });
  });

  it('throws error if trying to attach non-functional connectors', () => {
    const jsSchema = makeExecutableSchema({
      typeDefs: testSchema,
      resolvers: testResolvers,
    });
    (<any>attachConnectorsToContext)(jsSchema, { testString: 'a' });
    const query = `{
      species(name: "strix")
      stuff
      useTestConnector
    }`;
    return graphql(jsSchema, query, undefined, {}).then(res => {
      expect((<any>res.errors[0]).originalError.message).to.equal(
        'Connector must be a function or an class',
      );
    });
  });

  it('does not interfere with schema level resolve function', () => {
    const jsSchema = makeExecutableSchema({
      typeDefs: testSchema,
      resolvers: testResolvers,
    });
    const rootResolver = () => ({ stuff: 'stuff', species: 'ROOT' });
    addSchemaLevelResolveFunction(jsSchema, rootResolver);
    attachConnectorsToContext(jsSchema, testConnectors);
    const query = `{
      species(name: "strix")
      stuff
      useTestConnector
    }`;
    const expected = {
      species: 'ROOTstrix',
      stuff: 'stuff',
      useTestConnector: 'works',
    };
    return graphql(jsSchema, query, {}, {}).then(res => {
      expect(res.data).to.deep.equal(expected);
    });
    // TODO test schemaLevelResolve function with wrong arguments
  });

  // TODO test attachConnectors with wrong arguments
  it('throws error if no schema is passed', () => {
    expect(() => (<any>attachConnectorsToContext)()).to.throw(
      'schema must be an instance of GraphQLSchema. ' +
        'This error could be caused by installing more than one version of GraphQL-JS',
    );
  });

  it('throws error if schema is not an instance of GraphQLSchema', () => {
    expect(() => (<any>attachConnectorsToContext)({})).to.throw(
      'schema must be an instance of GraphQLSchema. ' +
        'This error could be caused by installing more than one version of GraphQL-JS',
    );
  });

  it('throws error if connectors argument is an array', () => {
    const jsSchema = makeExecutableSchema({
      typeDefs: testSchema,
      resolvers: testResolvers,
    });
    expect(() => (<any>attachConnectorsToContext)(jsSchema, [1])).to.throw(
      'Expected connectors to be of type object, got Array',
    );
  });

  it('throws error if connectors argument is an empty object', () => {
    const jsSchema = makeExecutableSchema({
      typeDefs: testSchema,
      resolvers: testResolvers,
    });
    return expect(() => attachConnectorsToContext(jsSchema, {})).to.throw(
      'Expected connectors to not be an empty object',
    );
  });

  it('throws error if connectors argument is not an object', () => {
    const jsSchema = makeExecutableSchema({
      typeDefs: testSchema,
      resolvers: testResolvers,
    });
    return expect(() =>
      (<any>attachConnectorsToContext)(jsSchema, 'a'),
    ).to.throw('Expected connectors to be of type object, got string');
  });
});

describe('Generating a full graphQL schema with resolvers and connectors', () => {
  it('outputs a working GraphQL schema', () => {
    const schema = makeExecutableSchema({
      typeDefs: testSchema,
      resolvers: testResolvers,
      connectors: testConnectors,
    });
    const query = `{
      species(name: "uhu")
      stuff
      usecontext
      useTestConnector
    }`;
    const expected = {
      species: 'ROOTuhu',
      stuff: 'stuff',
      useTestConnector: 'works',
      usecontext: 'ABC',
    };
    return graphql(schema, query, {}, { usecontext: 'ABC' }).then(res => {
      expect(res.data).to.deep.equal(expected);
    });
  });
});

describe('chainResolvers', () => {
  it('can chain two resolvers', () => {
    const r1 = (root: number) => root + 1;
    const r2 = (root: number, { addend }: { addend: number }) => root + addend;

    const rChained = chainResolvers([r1, r2]);
    expect(rChained(0, { addend: 2 }, null, null)).to.equals(3);
  });

  it('uses default resolver when a resolver is undefined', () => {
    const r1 = (root: any, { name }: { name: string }) => ({
      person: { name },
    });
    const r3 = (root: any) => root['name'];
    const rChained = chainResolvers([r1, undefined, r3]);
    // faking the resolve info here.
    expect(
      rChained(0, { name: 'tony' }, null, {
        fieldName: 'person',
      } as GraphQLResolveInfo),
    ).to.equals('tony');
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
      asyncResolver: async () => 'giau. tran minh',
      multiDirectives: () => 'Giau. Tran Minh',
      throwError: () => {
        throw new Error('This error for testing');
      },
    },
  };

  const directiveResolvers: IDirectiveResolvers<any, any> = {
    lower(
      next: NextResolverFn,
      src: any,
      args: { [argName: string]: any },
      context: any,
    ) {
      return next().then(str => {
        if (typeof str === 'string') {
          return str.toLowerCase();
        }
        return str;
      });
    },
    upper(
      next: NextResolverFn,
      src: any,
      args: { [argName: string]: any },
      context: any,
    ) {
      return next().then(str => {
        if (typeof str === 'string') {
          return str.toUpperCase();
        }
        return str;
      });
    },
    default(
      next: NextResolverFn,
      src: any,
      args: { [argName: string]: any },
      context: any,
    ) {
      return next().then(res => {
        if (undefined === res) {
          return args.value;
        }
        return res;
      });
    },
    catchError(
      next: NextResolverFn,
      src: any,
      args: { [argName: string]: any },
      context: any,
    ) {
      return next().catch(error => {
        return error.message;
      });
    },
  };

  it('throws error if directiveResolvers argument is an array', () => {
    const jsSchema = makeExecutableSchema({
      typeDefs: testSchema,
      resolvers: testResolvers,
    });
    expect(() => (<any>attachDirectiveResolvers)(jsSchema, [1])).to.throw(
      'Expected directiveResolvers to be of type object, got Array',
    );
  });

  it('throws error if directiveResolvers argument is not an object', () => {
    const jsSchema = makeExecutableSchema({
      typeDefs: testSchema,
      resolvers: testResolvers,
    });
    return expect(() =>
      (<any>attachDirectiveResolvers)(jsSchema, 'a'),
    ).to.throw('Expected directiveResolvers to be of type object, got string');
  });

  it('upper String from resolvers', () => {
    const schema = makeExecutableSchema({
      typeDefs: testSchemaWithDirectives,
      resolvers: testResolversDirectives,
      directiveResolvers: directiveResolvers,
    });
    const query = `{
      hello
    }`;
    const expected = {
      hello: 'GIAU. TRAN MINH',
    };
    return graphql(schema, query, {}, {}).then(res => {
      expect(res.data).to.deep.equal(expected);
    });
  });

  it('using default resolver for object property', () => {
    const schema = makeExecutableSchema({
      typeDefs: testSchemaWithDirectives,
      resolvers: testResolversDirectives,
      directiveResolvers: directiveResolvers,
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
    return graphql(schema, query, {}, {}).then(res => {
      expect(res.data).to.deep.equal(expected);
    });
  });

  it('passes in directive arguments to the directive resolver', () => {
    const schema = makeExecutableSchema({
      typeDefs: testSchemaWithDirectives,
      resolvers: testResolversDirectives,
      directiveResolvers: directiveResolvers,
    });
    const query = `{
      withDefault
    }`;
    const expected = {
      withDefault: 'some default_value',
    };
    return graphql(schema, query, {}, {}).then(res => {
      expect(res.data).to.deep.equal(expected);
    });
  });

  it('No effect if missing directive resolvers', () => {
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
    return graphql(schema, query, {}, {}).then(res => {
      expect(res.data).to.deep.equal(expected);
    });
  });

  it('If resolver return Promise, keep using it', () => {
    const schema = makeExecutableSchema({
      typeDefs: testSchemaWithDirectives,
      resolvers: testResolversDirectives,
      directiveResolvers: directiveResolvers,
    });
    const query = `{
      asyncResolver
    }`;
    const expected = {
      asyncResolver: 'GIAU. TRAN MINH',
    };
    return graphql(schema, query, {}, {}).then(res => {
      expect(res.data).to.deep.equal(expected);
    });
  });

  it('Multi directives apply with LTR order', () => {
    const schema = makeExecutableSchema({
      typeDefs: testSchemaWithDirectives,
      resolvers: testResolversDirectives,
      directiveResolvers: directiveResolvers,
    });
    const query = `{
      multiDirectives
    }`;
    const expected = {
      multiDirectives: 'giau. tran minh',
    };
    return graphql(schema, query, {}, {}).then(res => {
      expect(res.data).to.deep.equal(expected);
    });
  });

  it('Allow to catch error from next resolver', () => {
    const schema = makeExecutableSchema({
      typeDefs: testSchemaWithDirectives,
      resolvers: testResolversDirectives,
      directiveResolvers: directiveResolvers,
    });
    const query = `{
      throwError
    }`;
    const expected = {
      throwError: 'This error for testing',
    };
    return graphql(schema, query, {}, {}).then(res => {
      expect(res.data).to.deep.equal(expected);
    });
  });

  it('throws error if trying use undefined Directive', () => {
    return expect(() => {
      makeExecutableSchema({
        typeDefs: `
          type RootQuery {
            hello: String @deprecated(reason: "Built-in directive work as normal") @upper
          }
          schema {
            query: RootQuery
          }
        `,
        resolvers: {
          RootQuery: {
            hello: () => 'never touch',
          },
        },
        directiveResolvers: directiveResolvers,
      });
    }).to.throw(
      'Directive @upper is undefined. Please define in schema before using',
    );
  });
});

describe('can specify lexical parser options', () => {
  it("can specify 'noLocation' option", () => {
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

    expect(schema.astNode.loc).to.equal(undefined);
  });

  if (['^0.11', '^0.12'].indexOf(process.env.GRAPHQL_VERSION) === -1) {
    it("can specify 'allowLegacySDLEmptyFields' option", () => {
      return expect(() => {
        makeExecutableSchema({
          typeDefs: `
            type RootQuery {
            }
            schema {
              query: RootQuery
            }
          `,
          resolvers: {},
          parseOptions: {
            allowLegacySDLEmptyFields: true,
          },
        });
      }).to.not.throw();
    });

    it("can specify 'allowLegacySDLImplementsInterfaces' option", () => {
      const typeDefs = `
        interface A {
          hello: String
        }
        interface B {
          world: String
        }
        type RootQuery implements A, B {
          hello: String
          world: String
        }
        schema {
          query: RootQuery
        }
      `;

      const resolvers = {};

      expect(() => {
        makeExecutableSchema({
          typeDefs,
          resolvers,
          parseOptions: {
            allowLegacySDLImplementsInterfaces: true,
          },
        });
      }).to.not.throw();

      expect(() => {
        makeExecutableSchema({
          typeDefs,
          resolvers,
          parseOptions: {
            allowLegacySDLImplementsInterfaces: false,
          },
        });
      }).to.throw('Syntax Error: Unexpected Name');
    });
  }

  if (process.env.GRAPHQL_VERSION !== '^0.11') {
    it("can specify 'experimentalFragmentVariables' option", () => {
      const typeDefs = `
        type Hello {
          world(phrase: String): String
        }

        fragment hello($phrase: String = "world") on Hello {
          world(phrase: $phrase)
        }

        type RootQuery {
          hello: Hello
        }

        schema {
          query: RootQuery
        }
      `;

      const resolvers = {
        RootQuery: {
          hello() {
            return {
              world: (phrase: string) => `hello ${phrase}`,
            };
          },
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
      }).to.not.throw();
    });
  }
});
