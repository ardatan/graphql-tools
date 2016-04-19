// TODO: reduce code repetition in this file.
// see https://github.com/apollostack/graphql-tools/issues/26

import {
  generateSchema,
  makeExecutableSchema,
  SchemaError,
  addErrorLoggingToSchema,
  addSchemaLevelResolveFunction,
  attachConnectorsToContext,
  assertResolveFunctionsPresent,
} from '../src/schemaGenerator.js';
import { assert, expect } from 'chai';
import { graphql, GraphQLInt, GraphQLObjectType, GraphQLSchema } from 'graphql';
import { Logger } from '../src/Logger.js';
import TypeA from './circularSchemaA';


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
  __schema: () => {
    return { stuff: 'stuff', species: 'ROOT' };
  },
  RootQuery: {
    usecontext: (r, a, ctx) => {
      return ctx.usecontext;
    },
    useTestConnector: (r, a, ctx) => {
      return ctx.connectors.TestConnector.get();
    },
    useContextConnector: (r, a, ctx) => {
      return ctx.connectors.ContextConnector.get();
    },
    species: (root, { name }) => root.species + name,
  },
};
class TestConnector {
  get() {
    return 'works';
  }
}

class ContextConnector {
  constructor(ctx) {
    this.str = ctx.str;
  }
  get() {
    return this.str;
  }
}
const testConnectors = {
  TestConnector,
  ContextConnector,
};




describe('generating schema from shorthand', () => {
  it('throws an error if no schema is provided', () => {
    return assert.throw(generateSchema, SchemaError);
  });

  it('throws an error if no resolveFunctions are provided', () => {
    return assert.throw(generateSchema.bind(null, 'blah'), SchemaError);
  });

  it('throws an error if typeDefinitions is neither string nor array', () => {
    return assert.throw(generateSchema.bind(null, {}, {}), SchemaError);
  });

  it('throws an error if typeDefinition array contains not only functions and strings', () => {
    return assert.throw(generateSchema.bind(null, [17], {}), SchemaError);
  });

  it('can generate a schema', (done) => {
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

    const resolve = {
      RootQuery: {
        species() { return; },
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
          description: null,
          fields: [
            {
              name: 'name',
              type: {
                kind: 'NON_NULL',
                name: null,
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
          description: null,
          fields: [
            {
              name: 'species',
              type: {
                kind: 'LIST',
                name: null,
                ofType: {
                  name: 'BirdSpecies',
                },
              },
              args: [{
                name: 'name',
                type: {
                  name: null,
                  kind: 'NON_NULL',
                  ofType: {
                    name: 'String',
                  },
                },
              }],
            },
          ],
        },
      },
    };

    const jsSchema = generateSchema(shorthand, resolve);
    const resultPromise = graphql(jsSchema, introspectionQuery);
    return resultPromise.then((result) => {
      assert.deepEqual(result, solution);
      done();
    });
  });

  it('can generate a schema from an array of types', () => {
    const typeDefAry = [`
      type Query {
        foo: String
      }
      `, `
      schema {
        query: Query
      }
    `];

    const jsSchema = generateSchema(typeDefAry, {});
    return expect(jsSchema.getQueryType().name).to.equal('Query');
  });
  it('properly deduplicates the array of type definitions', () => {
    const typeDefAry = [`
      type Query {
        foo: String
      }
      `, `
      schema {
        query: Query
      }
      `, `
      schema {
        query: Query
      }
    `];

    const jsSchema = generateSchema(typeDefAry, {});
    return expect(jsSchema.getQueryType().name).to.equal('Query');
  });

  it('works with imports, even circular ones', () => {
    const typeDefAry = [`
      type Query {
        foo: TypeA
      }
      `, `
      schema {
        query: Query
      }
    `, TypeA];

    const jsSchema = generateSchema(typeDefAry, {
      Query: { foo: () => null },
      TypeA: { b: () => null },
      TypeB: { a: () => null },
    });
    return expect(jsSchema.getQueryType().name).to.equal('Query');
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
        species: (root, { name }) => {
          return [{
            name: `Hello ${name}!`,
            wingspan: 200,
          }];
        },
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
    const jsSchema = generateSchema(shorthand, resolveFunctions);
    const resultPromise = graphql(jsSchema, testQuery);
    return resultPromise.then((result) => {
      return assert.deepEqual(result, solution);
    });
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
          resolve(root, { name }) {
            return [{
              name: `Tom ${name}`,
              age: 100,
            }, {
              name: 'North Pole',
              coordinates: '90, 0',
            }];
          },
        },
      },
      Searchable: {
        __resolveType(data, context, info) {
          if (data.age) {
            return info.schema.getType('Person');
          }
          if (data.coordinates) {
            return info.schema.getType('Location');
          }
          console.log('no type!');
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

    const jsSchema = generateSchema(shorthand, resolveFunctions);
    const resultPromise = graphql(jsSchema, testQuery);
    return resultPromise.then((result) => {
      return assert.deepEqual(result, solution);
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
          resolve: (root, { name }) => {
            return [{
              name: `Hello ${name}!`,
              wingspan: 200,
            }];
          },
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
          fields: [{
            name: 'species',
            description: 'A species',
            deprecationReason: 'Just because',
          }],
        },
      },
    };

    const jsSchema = generateSchema(shorthand, resolveFunctions);
    const resultPromise = graphql(jsSchema, testQuery);
    return resultPromise.then((result) => {
      return assert.deepEqual(result, solution);
    });
  });

  it('throws an error if a field has arguments but no resolve func', () => {
    const short = `
    type Query{
      bird(id: ID): String
    }
    schema {
      query: Query
    }`;

    const rf = { Query: {} };

    assert.throws(generateSchema.bind(null, short, rf), SchemaError);
  });

  it('throws an error if field.resolve is not a function', () => {
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          aField: {
            type: GraphQLInt,
            args: { a: { type: GraphQLInt } },
            resolve: 'NOT A FUNCTION',
          },
        },
      }),
    });

    assert.throws(() => assertResolveFunctionsPresent(schema), SchemaError);
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

    assert.throws(generateSchema.bind(null, short, rf), SchemaError);
  });

  it('throws an error if a field is not scalar, but has no resolve func', () => {
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

    assert.throws(generateSchema.bind(null, short, rf), SchemaError);
  });

  it('throws an error if a resolve field cannot be used', (done) => {
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
        speciez: (root, { name }) => {
          return [{
            name: `Hello ${name}!`,
            wingspan: 200,
          }];
        },
      },
    };
    assert.throw(generateSchema.bind(null, shorthand, resolveFunctions), SchemaError);
    done();
  });
  it('throws an error if a resolve type is not in schema', (done) => {
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
        species: (root, { name }) => {
          return [{
            name: `Hello ${name}!`,
            wingspan: 200,
          }];
        },
      },
    };
    assert.throw(generateSchema.bind(null, shorthand, resolveFunctions), SchemaError);

    done();
  });
});


describe('providing useful errors from resolve functions', () => {
  it('logs an error if a resolve function fails', (done) => {
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
        species: () => {
          throw new Error('oops!');
        },
      },
    };

    // TODO: Should use a spy here instead of logger class
    // to make sure we don't duplicate tests from Logger.
    const logger = new Logger();
    const jsSchema = generateSchema(shorthand, resolve, logger);
    const testQuery = '{ species }';
    const expected = 'Error in resolver RootQuery.species\noops!';
    graphql(jsSchema, testQuery).then(() => {
      assert.equal(logger.errors.length, 1);
      assert.equal(logger.errors[0].message, expected);
      done();
    });
  });

  it('will throw errors on undefined if you tell it to', (done) => {
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
        species: () => undefined,
        stuff: () => 'stuff',
      },
    };

    const logger = new Logger();
    const jsSchema = generateSchema(shorthand, resolve, logger, false);
    const testQuery = '{ species, stuff }';
    const expectedErr = /Resolve function for "RootQuery.species" returned undefined/;
    const expectedResData = { species: null, stuff: 'stuff' };
    graphql(jsSchema, testQuery).then((res) => {
      assert.equal(logger.errors.length, 1);
      assert.match(logger.errors[0].message, expectedErr);
      assert.deepEqual(res.data, expectedResData);
      done();
    });
  });
});

describe('Add error logging to schema', () => {
  it('throws an error if no logger is provided', () => {
    assert.throw(() => addErrorLoggingToSchema({}), 'Must provide a logger');
  });
  it('throws an error if logger.log is not a function', () => {
    assert.throw(() => addErrorLoggingToSchema({}, { log: '1' }), 'Logger.log must be a function');
  });
});

describe('Attaching connectors to schema', () => {
  describe('Schema level resolve function', () => {
    it('actually runs', () => {
      const jsSchema = generateSchema(testSchema, testResolvers);
      const rootResolver = () => {
        return { species: 'ROOT' };
      };
      addSchemaLevelResolveFunction(jsSchema, rootResolver);
      const query = `{
        species(name: "strix")
      }`;
      return graphql(jsSchema, query).then((res) => {
        expect(res.data.species).to.equal('ROOTstrix');
      });
    });

    it('can wrap fields that do not have a resolver defined', () => {
      const jsSchema = generateSchema(testSchema, testResolvers);
      const rootResolver = () => {
        return { stuff: 'stuff' };
      };
      addSchemaLevelResolveFunction(jsSchema, rootResolver);
      const query = `{
        stuff
      }`;
      return graphql(jsSchema, query).then((res) => {
        expect(res.data.stuff).to.equal('stuff');
      });
    });

    it('runs only once', () => {
      const jsSchema = generateSchema(testSchema, testResolvers);
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
      return graphql(jsSchema, query).then((res) => {
        expect(res.data).to.deep.equal(expected);
      });
    });

    it('can attach things to context', () => {
      const jsSchema = generateSchema(testSchema, testResolvers);
      const rootResolver = (o, a, ctx) => {
        // eslint-disable-next-line no-param-reassign
        ctx.usecontext = 'ABC';
      };
      addSchemaLevelResolveFunction(jsSchema, rootResolver);
      const query = `{
        usecontext
      }`;
      const expected = {
        usecontext: 'ABC',
      };
      return graphql(jsSchema, query, {}, {}).then((res) => {
        expect(res.data).to.deep.equal(expected);
      });
    });
  });
  it('actually attaches the connectors', () => {
    const jsSchema = generateSchema(testSchema, testResolvers);
    attachConnectorsToContext(jsSchema, testConnectors);
    const query = `{
      useTestConnector
    }`;
    const expected = {
      useTestConnector: 'works',
    };
    return graphql(jsSchema, query, {}, {}).then((res) => {
      expect(res.data).to.deep.equal(expected);
    });
  });
  it('actually passes the context to the connector constructor', () => {
    const jsSchema = generateSchema(testSchema, testResolvers);
    attachConnectorsToContext(jsSchema, testConnectors);
    const query = `{
      useContextConnector
    }`;
    const expected = {
      useContextConnector: 'YOYO',
    };
    return graphql(jsSchema, query, {}, { str: 'YOYO' }).then((res) => {
      expect(res.data).to.deep.equal(expected);
    });
  });
  it('throws error if trying to attach connectors twice', () => {
    const jsSchema = generateSchema(testSchema, testResolvers);
    attachConnectorsToContext(jsSchema, testConnectors);
    return expect(() => attachConnectorsToContext(jsSchema, testConnectors)).to.throw(
      'Connectors already attached to context, cannot attach more than once'
    );
  });
  it('throws error during execution if context is not an object', () => {
    const jsSchema = generateSchema(testSchema, testResolvers);
    attachConnectorsToContext(jsSchema, { someConnector: {} });
    const query = `{
      useTestConnector
    }`;
    return graphql(jsSchema, query, {}, 'notObject').then((res) => {
      expect(res.errors[0].originalError.message).to.equal(
        'Cannot attach connector because context is not an object: string'
      );
    });
  });
  it('does not interfere with schema level resolve function', () => {
    const jsSchema = generateSchema(testSchema, testResolvers);
    const rootResolver = () => {
      return { stuff: 'stuff', species: 'ROOT' };
    };
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
    return graphql(jsSchema, query, {}, {}).then((res) => {
      expect(res.data).to.deep.equal(expected);
    });
  // TODO test schemaLevelResolve function with wrong arguments
  });
  // TODO test attachConnectors with wrong arguments
  it('throws error if no schema is passed', () => {
    return expect(() => attachConnectorsToContext()).to.throw(
      'schema must be an instance of GraphQLSchema. ' +
      'This error could be caused by installing more than one version of GraphQL-JS'
    );
  });
  it('throws error if schema is not an instance of GraphQLSchema', () => {
    return expect(() => attachConnectorsToContext({})).to.throw(
      'schema must be an instance of GraphQLSchema. ' +
      'This error could be caused by installing more than one version of GraphQL-JS'
    );
  });
  it('throws error if connectors argument is an array', () => {
    const jsSchema = generateSchema(testSchema, testResolvers);
    return expect(() => attachConnectorsToContext(jsSchema, [1])).to.throw(
      'Expected connectors to be of type object, got Array'
    );
  });
  it('throws error if connectors argument is an empty object', () => {
    const jsSchema = generateSchema(testSchema, testResolvers);
    return expect(() => attachConnectorsToContext(jsSchema, {})).to.throw(
      'Expected connectors to not be an empty object'
    );
  });
  it('throws error if connectors argument is not an object', () => {
    const jsSchema = generateSchema(testSchema, testResolvers);
    return expect(() => attachConnectorsToContext(jsSchema, 'a')).to.throw(
      'Expected connectors to be of type object, got string'
    );
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
    return graphql(schema, query, {}, { usecontext: 'ABC' }).then((res) => {
      expect(res.data).to.deep.equal(expected);
    });
  });
});
