import { addMocksToSchema, MockList, mockServer } from '../mock';
import {
  buildSchemaFromTypeDefinitions,
  addResolversToSchema,
  makeExecutableSchema,
} from '../makeExecutableSchema';
import { IMocks } from '../Interfaces';

import { expect } from 'chai';
import { graphql, GraphQLResolveInfo, GraphQLSchema, GraphQLFieldResolver } from 'graphql';

describe('Mock', () => {
  const shorthand = `
    scalar MissingMockType

    interface Flying {
      id:String!
      returnInt: Int
    }

    type Bird implements Flying {
      id:String!
      returnInt: Int
      returnString: String
      returnStringArgument(s: String): String
    }

    type Bee implements Flying {
      id:String!
      returnInt: Int
      returnEnum: SomeEnum
    }

    union BirdsAndBees = Bird | Bee

    enum SomeEnum {
      A
      B
      C
    }

    type RootQuery {
      returnInt: Int
      returnFloat: Float
      returnString: String
      returnBoolean: Boolean
      returnID: ID
      returnEnum: SomeEnum
      returnBirdsAndBees: [BirdsAndBees]
      returnFlying: [Flying]
      returnMockError: MissingMockType
      returnNullableString: String
      returnNonNullString: String!
      returnObject: Bird
      returnListOfInt: [Int]
      returnListOfIntArg(l: Int): [Int]
      returnListOfListOfInt: [[Int!]!]!
      returnListOfListOfIntArg(l: Int): [[Int]]
      returnListOfListOfObject: [[Bird!]]!
      returnStringArgument(s: String): String
      node(id:String!):Flying
      node2(id:String!):BirdsAndBees
    }

    type RootMutation{
      returnStringArgument(s: String): String
    }
    schema {
      query: RootQuery
      mutation: RootMutation
    }
  `;

  const resolveFunctions = {
    BirdsAndBees: {
      __resolveType(data: any, _context: any, info: GraphQLResolveInfo) {
        return info.schema.getType(data.__typename);
      },
    },
    Flying: {
      __resolveType(data: any, _context: any, info: GraphQLResolveInfo) {
        return info.schema.getType(data.__typename);
      },
    },
  };

  it('throws an error if you forget to pass schema', () => {
    expect(() => addMocksToSchema({})).to.throw(
      'Must provide schema to mock',
    );
  });

  it('throws an error if the property "schema" on the first argument is not of type GraphQLSchema', () => {
    expect(() => addMocksToSchema({ schema: {} as unknown as GraphQLSchema })).to.throw(
      'Value at "schema" must be of type GraphQLSchema',
    );
  });

  it('throws an error if second argument is not a Map', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    expect(() =>
      addMocksToSchema({ schema: jsSchema, mocks: ['a'] as unknown as IMocks }),
    ).to.throw('mocks must be of type Object');
  });

  it('throws an error if mockFunctionMap contains a non-function thingy', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = { Int: 55 };
    expect(() =>
      addMocksToSchema({ schema: jsSchema, mocks: mockMap as unknown as IMocks }),
    ).to.throw('mockFunctionMap[Int] must be a function');
  });

  it('mocks the default types for you', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = {};
    addMocksToSchema({ schema: jsSchema, mocks: mockMap });
    const testQuery = `{
      returnInt
      returnFloat
      returnBoolean
      returnString
      returnID
    }`;
    return graphql(jsSchema, testQuery).then(res => {
      expect(res.data['returnInt']).to.be.within(-1000, 1000);
      expect(res.data['returnFloat']).to.be.within(-1000, 1000);
      expect(res.data['returnBoolean']).to.be.a('boolean');
      expect(res.data['returnString']).to.be.a('string');
      expect(res.data['returnID']).to.be.a('string');
    });
  });

  it('lets you use mockServer for convenience', () => {
    const testQuery = `{
      returnInt
      returnFloat
      returnBoolean
      returnString
      returnID
      returnBirdsAndBees {
        ... on Bird {
          returnInt
          returnString
        }
        ... on Bee {
          returnInt
          returnEnum
        }
      }
    }`;
    const mockMap = {
      Int: () => 12345,
      Bird: () => ({ returnInt: () => 54321 }),
      Bee: () => ({ returnInt: () => 54321 }),
    };
    return mockServer(shorthand, mockMap)
      .query(testQuery)
      .then((res: any) => {
        expect(res.data.returnInt).to.equal(12345);
        expect(res.data.returnFloat)
          .to.be.a('number')
          .within(-1000, 1000);
        expect(res.data.returnBoolean).to.be.a('boolean');
        expect(res.data.returnString).to.be.a('string');
        expect(res.data.returnID).to.be.a('string');
        // tests that resolveType is correctly set for unions and interfaces
        // and that the correct mock function is used
        expect(res.data.returnBirdsAndBees[0].returnInt).to.equal(54321);
        expect(res.data.returnBirdsAndBees[1].returnInt).to.equal(54321);
      });
  });

  it('mockServer is able to preserveResolvers of a prebuilt schema', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const resolvers = {
      RootQuery: {
        returnString: () => 'someString',
      },
    };
    addResolversToSchema(jsSchema, resolvers);
    const testQuery = `{
      returnInt
      returnString
      returnBirdsAndBees {
        ... on Bird {
          returnInt
        }
        ... on Bee {
          returnInt
        }
      }
    }`;
    const mockMap = {
      Int: () => 12345,
      Bird: () => ({ returnInt: () => 54321 }),
      Bee: () => ({ returnInt: () => 54321 }),
    };
    return mockServer(jsSchema, mockMap, true)
      .query(testQuery)
      .then((res: any) => {
        expect(res.data.returnInt).to.equal(12345);
        expect(res.data.returnString).to.equal('someString');
        // tests that resolveType is correctly set for unions and interfaces
        // and that the correct mock function is used
        expect(res.data.returnBirdsAndBees[0].returnInt).to.equal(54321);
        expect(res.data.returnBirdsAndBees[1].returnInt).to.equal(54321);
      });
  });

  it('lets you use mockServer with prebuilt schema', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const testQuery = `{
      returnInt
      returnFloat
      returnBoolean
      returnString
      returnID
      returnBirdsAndBees {
        ... on Bird {
          returnInt
          returnString
        }
        ... on Bee {
          returnInt
          returnEnum
        }
      }
    }`;
    const mockMap = {
      Int: () => 12345,
      Bird: () => ({ returnInt: () => 54321 }),
      Bee: () => ({ returnInt: () => 54321 }),
    };
    return mockServer(jsSchema, mockMap)
      .query(testQuery)
      .then((res: any) => {
        expect(res.data.returnInt).to.equal(12345);
        expect(res.data.returnFloat)
          .to.be.a('number')
          .within(-1000, 1000);
        expect(res.data.returnBoolean).to.be.a('boolean');
        expect(res.data.returnString).to.be.a('string');
        expect(res.data.returnID).to.be.a('string');
        // tests that resolveType is correctly set for unions and interfaces
        // and that the correct mock function is used
        expect(res.data.returnBirdsAndBees[0].returnInt).to.equal(54321);
        expect(res.data.returnBirdsAndBees[1].returnInt).to.equal(54321);
      });
  });

  it('does not mask resolveType functions if you tell it not to', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    let spy = 0;
    const resolvers = {
      BirdsAndBees: {
        __resolveType(data: any, _context: any, info: GraphQLResolveInfo) {
          ++spy;
          return info.schema.getType(data.__typename);
        },
      },
    };
    addResolversToSchema(jsSchema, resolvers);
    addMocksToSchema({
      schema: jsSchema,
      mocks: {},
      preserveResolvers: true,
    });
    const testQuery = `{
      returnBirdsAndBees {
        ... on Bird {
          returnInt
          returnString
        }
        ... on Bee {
          returnInt
          returnEnum
        }
      }
    }`;
    return graphql(jsSchema, testQuery).then(_res => {
      // the resolveType has been called twice
      expect(spy).to.equal(2);
    });
  });

  // TODO test mockServer with precompiled schema
  it('can mock Enum', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = {};
    addMocksToSchema({ schema: jsSchema, mocks: mockMap });
    const testQuery = `{
      returnEnum
    }`;
    return graphql(jsSchema, testQuery).then(res => {
      expect(res.data['returnEnum']).to.be.oneOf(['A', 'B', 'C']);
    });
  });

  it('can mock Unions', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    addResolversToSchema(jsSchema, resolveFunctions);
    const mockMap = {
      Int: () => 10,
      String: () => 'aha',
      SomeEnum: () => 'A',
      RootQuery: () => ({
        returnBirdsAndBees: () => new MockList(40),
      }),
    };
    addMocksToSchema({ schema: jsSchema, mocks: mockMap });
    const testQuery = `{
      returnBirdsAndBees {
        ... on Bird {
          returnInt
          returnString
        }
        ... on Bee {
          returnInt
          returnEnum
        }
      }
    }`;
    return graphql(jsSchema, testQuery).then(res => {
      // XXX this test is expected to fail once every 2^40 times ;-)
      expect(res.data['returnBirdsAndBees']).to.deep.include({
        returnInt: 10,
        returnString: 'aha',
      });
      return expect(res.data['returnBirdsAndBees']).to.deep.include({
        returnInt: 10,
        returnEnum: 'A',
      });
    });
  });

  it('can mock Interfaces by default', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    addResolversToSchema(jsSchema, resolveFunctions);
    const mockMap = {
      Int: () => 10,
      String: () => 'aha',
      SomeEnum: () => 'A',
      RootQuery: () => ({
        returnFlying: () => new MockList(40),
      }),
    };
    addMocksToSchema({
      schema: jsSchema,
      mocks: mockMap,
      preserveResolvers: true,
    });
    const testQuery = `{
      returnFlying {
        ... on Bird {
          returnInt
          returnString
        }
        ... on Bee {
          returnInt
          returnEnum
        }
      }
    }`;
    return graphql(jsSchema, testQuery).then(res => {
      expect(res.data['returnFlying']).to.deep.include({
        returnInt: 10,
        returnString: 'aha',
      });
      return expect(res.data['returnFlying']).to.deep.include({
        returnInt: 10,
        returnEnum: 'A',
      });
    });
  });

  it('can support explicit Interface mock', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    addResolversToSchema(jsSchema, resolveFunctions);
    let spy = 0;
    const mockMap = {
      Bird: (_root: any, args: any) => ({
        id: args.id,
        returnInt: 100,
      }),
      Bee: (_root: any, args: any) => ({
        id: args.id,
        returnInt: 200,
      }),
      Flying: (_root: any, args: any) => {
        spy++;
        const { id } = args;
        const type = id.split(':')[0];
        const __typename = ['Bird', 'Bee'].find(r => r.toLowerCase() === type);
        return { __typename };
      },
    };
    addMocksToSchema({
      schema: jsSchema,
      mocks: mockMap,
      preserveResolvers: true,
    });
    const testQuery = `{
      node(id:"bee:123456"){
        id,
        returnInt
      }
    }`;

    return graphql(jsSchema, testQuery).then(res => {
      expect(spy).to.equal(1); // to make sure that Flying possible types are not randomly selected
      expect(res.data['node']).to.include({
        id: 'bee:123456',
        returnInt: 200,
      });
    });
  });

  it('can support explicit UnionType mock', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    addResolversToSchema(jsSchema, resolveFunctions);
    let spy = 0;
    const mockMap = {
      Bird: (_root: any, args: any) => ({
        id: args.id,
        returnInt: 100,
      }),
      Bee: (_root: any, args: any) => ({
        id: args.id,
        returnEnum: 'A',
      }),
      BirdsAndBees: (_root: any, args: any) => {
        spy++;
        const { id } = args;
        const type = id.split(':')[0];
        return {
          __typename: ['Bird', 'Bee'].find(r => r.toLowerCase() === type),
        };
      },
    };
    addMocksToSchema({
      schema: jsSchema,
      mocks: mockMap,
      preserveResolvers: true,
    });
    const testQuery = `{
        node2(id:"bee:123456"){
          ...on Bee{
            id,
            returnEnum
          }
        }
      }`;

    return graphql(jsSchema, testQuery).then(res => {
      expect(spy).to.equal(1);
      expect(res.data['node2']).to.include({
        id: 'bee:123456',
        returnEnum: 'A',
      });
    });
  });

  it('throws an error when __typename is not returned within an explicit interface mock', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    addResolversToSchema(jsSchema, resolveFunctions);
    const mockMap = {
      Bird: (_root: any, args: any) => ({
        id: args.id,
        returnInt: 100,
      }),
      Bee: (_root: any, args: any) => ({
        id: args.id,
        returnInt: 100,
      }),
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      Flying: (_root: any, _args: any): void => {},
    };
    addMocksToSchema({ schema: jsSchema, mocks: mockMap });
    const testQuery = `{
        node(id:"bee:123456"){
          id,
          returnInt
        }
      }`;
    const expected = 'Please return a __typename in "Flying"';
    return graphql(jsSchema, testQuery).then(res => {
      expect(res.errors[0].originalError.message).to.equal(expected);
    });
  });

  it('throws an error in resolve if mock type is not defined', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = {};
    addMocksToSchema({ schema: jsSchema, mocks: mockMap });
    const testQuery = `{
      returnMockError
    }`;
    const expected = 'No mock defined for type "MissingMockType"';
    return graphql(jsSchema, testQuery).then(res => {
      expect(res.errors[0].originalError.message).to.equal(expected);
    });
  });

  it('throws an error in resolve if mock type is not defined and resolver failed', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const resolvers = {
      MissingMockType: {
        __serialize: (val: string) => val,
        __parseValue: (val: string) => val,
        __parseLiteral: (val: string) => val,
      },
      RootQuery: {
        returnMockError: (): string => undefined,
      },
    };
    addResolversToSchema(jsSchema, resolvers);

    const mockMap = {};
    addMocksToSchema({
      schema: jsSchema,
      mocks: mockMap,
      preserveResolvers: true,
    });
    const testQuery = `{
      returnMockError
    }`;
    const expected = 'No mock defined for type "MissingMockType"';
    return graphql(jsSchema, testQuery).then(res => {
      expect(res.errors[0].originalError.message).to.equal(expected);
    });
  });

  it('can preserve scalar resolvers', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const resolvers = {
      MissingMockType: {
        __serialize: (val: string) => val,
        __parseValue: (val: string) => val,
        __parseLiteral: (val: string) => val,
      },
      RootQuery: {
        returnMockError: () => '10-11-2012',
      },
    };
    addResolversToSchema(jsSchema, resolvers);

    const mockMap = {};
    addMocksToSchema({
      schema: jsSchema,
      mocks: mockMap,
      preserveResolvers: true,
    });
    const testQuery = `{
      returnMockError
    }`;
    const expected = {
      returnMockError: '10-11-2012',
    };
    return graphql(jsSchema, testQuery).then(res => {
      expect(res.data).to.deep.equal(expected);
      expect(res.errors).to.equal(undefined);
    });
  });

  it('can mock an Int', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = { Int: () => 55 };
    addMocksToSchema({ schema: jsSchema, mocks: mockMap });
    const testQuery = `{
      returnInt
    }`;
    return graphql(jsSchema, testQuery).then(res => {
      expect(res.data['returnInt']).to.equal(55);
    });
  });

  it('can mock a Float', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = { Float: () => 55.5 };
    addMocksToSchema({ schema: jsSchema, mocks: mockMap });
    const testQuery = `{
      returnFloat
    }`;
    return graphql(jsSchema, testQuery).then(res => {
      expect(res.data['returnFloat']).to.equal(55.5);
    });
  });
  it('can mock a String', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = { String: () => 'a string' };
    addMocksToSchema({ schema: jsSchema, mocks: mockMap });
    const testQuery = `{
      returnString
    }`;
    return graphql(jsSchema, testQuery).then(res => {
      expect(res.data['returnString']).to.equal('a string');
    });
  });
  it('can mock a Boolean', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = { Boolean: () => true };
    addMocksToSchema({ schema: jsSchema, mocks: mockMap });
    const testQuery = `{
      returnBoolean
    }`;
    return graphql(jsSchema, testQuery).then(res => {
      expect(res.data['returnBoolean']).to.equal(true);
    });
  });
  it('can mock an ID', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = { ID: () => 'ea5bdc19' };
    addMocksToSchema({ schema: jsSchema, mocks: mockMap });
    const testQuery = `{
      returnID
    }`;
    return graphql(jsSchema, testQuery).then(res => {
      expect(res.data['returnID']).to.equal('ea5bdc19');
    });
  });
  it('nullable type is nullable', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = { String: (): null => null };
    addMocksToSchema({ schema: jsSchema, mocks: mockMap });
    const testQuery = `{
      returnNullableString
    }`;
    return graphql(jsSchema, testQuery).then(res => {
      expect(res.data['returnNullableString']).to.equal(null);
    });
  });
  it('can mock a nonNull type', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = { String: () => 'nonnull' };
    addMocksToSchema({ schema: jsSchema, mocks: mockMap });
    const testQuery = `{
      returnNonNullString
    }`;
    return graphql(jsSchema, testQuery).then(res => {
      expect(res.data['returnNonNullString']).to.equal('nonnull');
    });
  });
  it('nonNull type is not nullable', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = { String: (): null => null };
    addMocksToSchema({ schema: jsSchema, mocks: mockMap });
    const testQuery = `{
      returnNonNullString
    }`;
    return graphql(jsSchema, testQuery).then(res => {
      expect(res.data).to.equal(null);
      expect(res.errors.length).to.equal(1);
    });
  });
  it('can mock object types', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = {
      String: () => 'abc',
      Int: () => 123,
    };
    addMocksToSchema({ schema: jsSchema, mocks: mockMap });
    const testQuery = `{
      returnObject { returnInt, returnString }
    }`;
    const expected = {
      returnObject: { returnInt: 123, returnString: 'abc' },
    };
    return graphql(jsSchema, testQuery).then(res => {
      expect(res.data).to.deep.equal(expected);
    });
  });

  it('can mock a list of ints', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = { Int: () => 123 };
    addMocksToSchema({ schema: jsSchema, mocks: mockMap });
    const testQuery = `{
      returnListOfInt
    }`;
    const expected = {
      returnListOfInt: [123, 123],
    };
    return graphql(jsSchema, testQuery).then(res => {
      expect(res.data).to.deep.equal(expected);
    });
  });

  it('can mock a list of lists of objects', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = {
      String: () => 'a',
      Int: () => 1,
    };
    addMocksToSchema({ schema: jsSchema, mocks: mockMap });
    const testQuery = `{
      returnListOfListOfObject { returnInt, returnString }
    }`;
    const expected = {
      returnListOfListOfObject: [
        [
          { returnInt: 1, returnString: 'a' },
          { returnInt: 1, returnString: 'a' },
        ],
        [
          { returnInt: 1, returnString: 'a' },
          { returnInt: 1, returnString: 'a' },
        ],
      ],
    };
    return graphql(jsSchema, testQuery).then(res => {
      expect(res.data).to.deep.equal(expected);
    });
  });

  it('does not mask resolvers if you tell it not to', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = {
      RootQuery: () => ({
        returnInt: (_root: any, _args: { [key: string]: any }) => 42, // a) in resolvers, will not be used
        returnFloat: (_root: any, _args: { [key: string]: any }) => 1.3, // b) not in resolvers, will be used
        returnString: (_root: any, _args: { [key: string]: any }) =>
          Promise.resolve('foo'), // c) in resolvers, will not be used
      }),
    };
    const resolvers = {
      RootQuery: {
        returnInt: () => 5, // see a)
        returnString: () => Promise.resolve('bar'), // see c)
      },
    };
    addResolversToSchema(jsSchema, resolvers);
    addMocksToSchema({
      schema: jsSchema,
      mocks: mockMap,
      preserveResolvers: true,
    });
    const testQuery = `{
      returnInt
      returnFloat
      returnString
    }`;
    const expected = {
      returnInt: 5, // a) from resolvers, not masked by mock
      returnFloat: 1.3, // b) from mock
      returnString: 'bar', // c) from resolvers, not masked by mock (and promise)
    };
    return graphql(jsSchema, testQuery).then(res => {
      expect(res.data).to.deep.equal(expected);
    });
  });

  it('lets you mock non-leaf types conveniently', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = {
      Bird: () => ({
        returnInt: 12,
        returnString: 'woot!?',
      }),
      Int: () => 15,
    };
    addMocksToSchema({ schema: jsSchema, mocks: mockMap });
    const testQuery = `{
      returnObject{
        returnInt
        returnString
      }
      returnInt
    }`;
    const expected = {
      returnObject: {
        returnInt: 12,
        returnString: 'woot!?',
      },
      returnInt: 15,
    };
    return graphql(jsSchema, testQuery).then(res => {
      expect(res.data).to.deep.equal(expected);
    });
  });

  it('lets you mock and resolve non-leaf types concurrently', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const resolvers = {
      RootQuery: {
        returnListOfInt: () => [1, 2, 3],
        returnObject: () => ({
          returnInt: 12, // a) part of a Bird, should not be masked by mock
          // no returnString returned
        }),
      },
    };
    addResolversToSchema(jsSchema, resolvers);
    const mockMap = {
      returnListOfInt: () => [5, 6, 7],
      Bird: () => ({
        returnInt: 3, // see a)
        returnString: 'woot!?', // b) another part of a Bird
      }),
    };
    addMocksToSchema({
      schema: jsSchema,
      mocks: mockMap,
      preserveResolvers: true,
    });
    const testQuery = `{
      returnListOfInt
      returnObject{
        returnInt
        returnString
      }
    }`;
    const expected = {
      returnListOfInt: [1, 2, 3],
      returnObject: {
        returnInt: 12, // from the resolver, see a)
        returnString: 'woot!?', // from the mock, see b)
      },
    };
    return graphql(jsSchema, testQuery).then(res => {
      expect(res.data).to.deep.equal(expected);
    });
  });

  it('lets you mock and resolve non-leaf types concurrently, support promises', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const resolvers = {
      RootQuery: {
        returnObject: () =>
          Promise.resolve({
            returnInt: 12, // a) part of a Bird, should not be masked by mock
            // no returnString returned
          }),
      },
    };
    addResolversToSchema(jsSchema, resolvers);
    const mockMap = {
      Bird: () => ({
        returnInt: 3, // see a)
        returnString: 'woot!?', // b) another part of a Bird
      }),
    };
    addMocksToSchema({
      schema: jsSchema,
      mocks: mockMap,
      preserveResolvers: true,
    });
    const testQuery = `{
      returnObject{
        returnInt
        returnString
      }
    }`;
    const expected = {
      returnObject: {
        returnInt: 12, // from the resolver, see a)
        returnString: 'woot!?', // from the mock, see b)
      },
    };
    return graphql(jsSchema, testQuery).then(res => {
      expect(res.data).to.deep.equal(expected);
    });
  });

  it('lets you mock and resolve non-leaf types concurrently, support defineProperty', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const objProxy = {};
    Object.defineProperty(
      objProxy,
      'returnInt', // a) part of a Bird, should not be masked by mock
      { value: 12 },
    );
    const resolvers = {
      RootQuery: {
        returnObject: () => objProxy,
      },
    };
    addResolversToSchema(jsSchema, resolvers);
    const mockMap = {
      Bird: () => ({
        returnInt: 3, // see a)
        returnString: 'woot!?', // b) another part of a Bird
      }),
    };
    addMocksToSchema({
      schema: jsSchema,
      mocks: mockMap,
      preserveResolvers: true,
    });
    const testQuery = `{
      returnObject{
        returnInt
        returnString
      }
    }`;
    const expected = {
      returnObject: {
        returnInt: 12, // from the resolver, see a)
        returnString: 'woot!?', // from the mock, see b)
      },
    };
    return graphql(jsSchema, testQuery).then(res => {
      expect(res.data).to.deep.equal(expected);
    });
  });

  it('let you mock with preserving resolvers, also when using logger', () => {
    const resolvers = {
      RootQuery: {
        returnString: () => 'woot!?', // a) resolve of a string
      },
    };
    const jsSchema = makeExecutableSchema({
      typeDefs: [shorthand],
      resolvers,
      resolverValidationOptions: {
        requireResolversForArgs: false,
        requireResolversForNonScalar: false,
        requireResolversForAllFields: false,
      },
      logger: console,
    });
    const mockMap = {
      Int: () => 123, // b) mock of Int.
    };
    addMocksToSchema({
      schema: jsSchema,
      mocks: mockMap,
      preserveResolvers: true,
    });
    const testQuery = `{
      returnObject {
        returnInt
          returnString
      }
      returnString
    }`;
    const expected = {
      returnObject: {
        returnInt: 123, // from the mock, see b)
        returnString: 'Hello World', // from mock default values.
      },
      returnString: 'woot!?', // from the mock, see a)
    };
    return graphql(jsSchema, testQuery).then(res => {
      expect(res.data).to.deep.equal(expected);
    });
  });

  it('let you mock with preserving resolvers, also when using connectors', () => {
    const resolvers = {
      RootQuery: {
        returnString: () => 'woot!?', // a) resolve of a string
      },
    };
    const jsSchema = makeExecutableSchema({
      typeDefs: [shorthand],
      resolvers,
      resolverValidationOptions: {
        requireResolversForArgs: false,
        requireResolversForNonScalar: false,
        requireResolversForAllFields: false,
      },
      connectors: {
        testConnector: () => ({}),
      },
    });
    const mockMap = {
      Int: () => 123, // b) mock of Int.
    };
    addMocksToSchema({
      schema: jsSchema,
      mocks: mockMap,
      preserveResolvers: true,
    });
    const testQuery = `{
      returnObject {
        returnInt
          returnString
      }
      returnString
    }`;
    const expected = {
      returnObject: {
        returnInt: 123, // from the mock, see b)
        returnString: 'Hello World', // from mock default values.
      },
      returnString: 'woot!?', // from the mock, see a)
    };
    return graphql(jsSchema, testQuery, undefined, {}).then(res => {
      expect(res.data).to.deep.equal(expected);
    });
  });

  it('let you mock with preserving resolvers, also when using both connectors and logger', () => {
    const resolvers = {
      RootQuery: {
        returnString: () => 'woot!?', // a) resolve of a string
      },
    };
    const jsSchema = makeExecutableSchema({
      typeDefs: [shorthand],
      resolvers,
      resolverValidationOptions: {
        requireResolversForArgs: false,
        requireResolversForNonScalar: false,
        requireResolversForAllFields: false,
      },
      logger: console,
      connectors: {
        testConnector: () => ({}),
      },
    });
    const mockMap = {
      Int: () => 123, // b) mock of Int.
    };
    addMocksToSchema({
      schema: jsSchema,
      mocks: mockMap,
      preserveResolvers: true,
    });
    const testQuery = `{
      returnObject {
        returnInt
          returnString
      }
      returnString
    }`;
    const expected = {
      returnObject: {
        returnInt: 123, // from the mock, see b)
        returnString: 'Hello World', // from mock default values.
      },
      returnString: 'woot!?', // from the mock, see a)
    };
    return graphql(jsSchema, testQuery, undefined, {}).then(res => {
      expect(res.data).to.deep.equal(expected);
    });
  });

  it('let you resolve null with mocking and preserving resolvers', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const resolvers = {
      RootQuery: {
        returnString: (): string => null, // a) resolve of a string
      },
    };
    addResolversToSchema(jsSchema, resolvers);
    const mockMap = {
      Int: () => 666, // b) mock of Int.
    };
    addMocksToSchema({
      schema: jsSchema,
      mocks: mockMap,
      preserveResolvers: true,
    });
    const testQuery = `{
      returnObject {
        returnInt
        returnString
      }
      returnString
    }`;
    const expected = {
      returnObject: {
        returnInt: 666, // from the mock, see b)
        returnString: 'Hello World', // from mock default values.
      },
      returnString: null as string, // from the mock, see a)
    };
    return graphql(jsSchema, testQuery, undefined, {}).then(res => {
      expect(res.data).to.deep.equal(expected);
    });
  });

  it('lets you mock root query fields', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = {
      RootQuery: () => ({
        returnStringArgument: (_o: any, a: { [key: string]: any }) => a['s'],
      }),
    };
    addMocksToSchema({ schema: jsSchema, mocks: mockMap });
    const testQuery = `{
      returnStringArgument(s: "adieu")
    }`;
    const expected = {
      returnStringArgument: 'adieu',
    };
    return graphql(jsSchema, testQuery).then(res => {
      expect(res.data).to.deep.equal(expected);
    });
  });

  it('lets you mock root mutation fields', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = {
      RootMutation: () => ({
        returnStringArgument: (_o: any, a: { [key: string]: any }) => a['s'],
      }),
    };
    addMocksToSchema({ schema: jsSchema, mocks: mockMap });
    const testQuery = `mutation {
      returnStringArgument(s: "adieu")
    }`;
    const expected = {
      returnStringArgument: 'adieu',
    };
    return graphql(jsSchema, testQuery).then(res => {
      expect(res.data).to.deep.equal(expected);
    });
  });

  it('lets you mock a list of a certain length', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = {
      RootQuery: () => ({ returnListOfInt: () => new MockList(3) }),
      Int: () => 12,
    };
    addMocksToSchema({ schema: jsSchema, mocks: mockMap });
    const testQuery = `{
      returnListOfInt
    }`;
    const expected = {
      returnListOfInt: [12, 12, 12],
    };
    return graphql(jsSchema, testQuery).then(res => {
      expect(res.data).to.deep.equal(expected);
    });
  });

  it('lets you mock a list of a random length', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = {
      RootQuery: () => ({ returnListOfInt: () => new MockList([10, 20]) }),
      Int: () => 12,
    };
    addMocksToSchema({ schema: jsSchema, mocks: mockMap });
    const testQuery = `{
      returnListOfInt
    }`;
    return graphql(jsSchema, testQuery).then(res => {
      expect(res.data['returnListOfInt']).to.have.length.within(10, 20);
      expect(res.data['returnListOfInt'][0]).to.equal(12);
    });
  });

  it('lets you mock a list of specific variable length', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = {
      RootQuery: () => ({
        returnListOfIntArg: (_o: any, a: { [key: string]: any }) =>
          new MockList(a['l']),
      }),
      Int: () => 12,
    };
    addMocksToSchema({ schema: jsSchema, mocks: mockMap });
    const testQuery = `{
      l3: returnListOfIntArg(l: 3)
      l5: returnListOfIntArg(l: 5)
    }`;
    return graphql(jsSchema, testQuery).then(res => {
      expect(res.data['l3'].length).to.equal(3);
      expect(res.data['l5'].length).to.equal(5);
    });
  });

  it('lets you provide a function for your MockList', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = {
      RootQuery: () => ({
        returnListOfInt: () => new MockList(2, () => 33),
      }),
      Int: () => 12,
    };
    addMocksToSchema({ schema: jsSchema, mocks: mockMap });
    const testQuery = `{
      returnListOfInt
    }`;
    const expected = {
      returnListOfInt: [33, 33],
    };
    return graphql(jsSchema, testQuery).then(res => {
      expect(res.data).to.deep.equal(expected);
    });
  });

  it('throws an error if the second argument to MockList is not a function', () => {
    expect(() => new MockList(5, 'abc' as unknown as GraphQLFieldResolver<any, any>)).to.throw(
      'Second argument to MockList must be a function or undefined',
    );
  });

  it('lets you nest MockList in MockList', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = {
      RootQuery: () => ({
        returnListOfListOfInt: () => new MockList(2, () => new MockList(3)),
      }),
      Int: () => 12,
    };
    addMocksToSchema({ schema: jsSchema, mocks: mockMap });
    const testQuery = `{
      returnListOfListOfInt
    }`;
    const expected = {
      returnListOfListOfInt: [[12, 12, 12], [12, 12, 12]],
    };
    return graphql(jsSchema, testQuery).then(res => {
      expect(res.data).to.deep.equal(expected);
    });
  });

  it('lets you use arguments in nested MockList', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = {
      RootQuery: () => ({
        returnListOfListOfIntArg: () =>
          new MockList(
            2,
            (_o: any, a: { [key: string]: any }) => new MockList(a['l']),
          ),
      }),
      Int: () => 12,
    };
    addMocksToSchema({ schema: jsSchema, mocks: mockMap });
    const testQuery = `{
      returnListOfListOfIntArg(l: 1)
    }`;
    const expected = {
      returnListOfListOfIntArg: [[12], [12]],
    };
    return graphql(jsSchema, testQuery).then(res => {
      expect(res.data).to.deep.equal(expected);
    });
  });

  it('works for a slightly more elaborate example', () => {
    const short = `
      type Thread {
        id: ID!
        name: String!
        posts(page: Int = 0, num: Int = 1): [Post]
      }
      type Post {
        id: ID!
        user: User!
        text: String!
      }

      type User {
        id: ID!
        name: String
      }

      type RootQuery {
        thread(id: ID): Thread
        threads(page: Int = 0, num: Int = 1): [Thread]
      }

      schema {
        query: RootQuery
      }
    `;
    const jsSchema = buildSchemaFromTypeDefinitions(short);
    const ITEMS_PER_PAGE = 2;
    // This mock map demonstrates default merging on objects and nested lists.
    // thread on root query will have id a.id, and missing properties
    // come from the Thread mock type
    // TODO: this tests too many things at once, it should really be broken up
    // it was really useful to have this though, because it made me find many
    // unintuitive corner-cases
    const mockMap = {
      RootQuery: () => ({
        thread: (_o: any, a: { [key: string]: any }) => ({ id: a['id'] }),
        threads: (_o: any, a: { [key: string]: any }) =>
          new MockList(ITEMS_PER_PAGE * a['num']),
      }),
      Thread: () => ({
        name: 'Lorem Ipsum',
        posts: (_o: any, a: { [key: string]: any }) =>
          new MockList(
            ITEMS_PER_PAGE * a['num'],
            (_oi: any, ai: { [key: string]: any }) => ({ id: ai['num'] }),
          ),
      }),
      Post: () => ({
        id: '41ae7bd',
        text: 'superlongpost',
      }),
      Int: () => 123,
    };
    addMocksToSchema({ schema: jsSchema, mocks: mockMap });
    const testQuery = `query abc{
      thread(id: "67"){
        id
        name
        posts(num: 2){
          id
          text
        }
      }
    }`;
    const expected = {
      thread: {
        id: '67',
        name: 'Lorem Ipsum',
        posts: [
          { id: '2', text: 'superlongpost' },
          { id: '2', text: 'superlongpost' },
          { id: '2', text: 'superlongpost' },
          { id: '2', text: 'superlongpost' },
        ],
      },
    };
    return graphql(jsSchema, testQuery).then(res => {
      expect(res.data).to.deep.equal(expected);
    });
  });

  it('works for resolvers returning javascript Dates', () => {
    const typeDefs = `
      scalar Date

      type DateObject {
        start: Date!
      }

      type Query {
        date1: DateObject
        date2: Date
        date3: Date
      }
    `;

    const resolvers = {
      Query: {
        date1: () => ({
          start: new Date('2018-01-03'),
        }),
        date2: () => new Date('2016-01-01'),
      },
      DateObject: {
        start: (obj: { start: Date }) => obj.start,
      },
      Date: {
        __serialize: (val: Date) => val.toISOString(),
        __parseValue: (val: string) => new Date(val),
        __parseLiteral: (val: string) => new Date(val),
      },
    };

    const schema = makeExecutableSchema({
      typeDefs,
      resolvers,
    });

    addMocksToSchema({
      schema,
      mocks: {
        Date: () => new Date('2016-05-04'),
      },
      preserveResolvers: true,
    });

    const query = `
    {
      date1 {
        start
      }
      date2
      date3
    }
    `;

    const expected = {
      date1: {
        start: '2018-01-03T00:00:00.000Z',
      },
      date2: '2016-01-01T00:00:00.000Z',
      date3: '2016-05-04T00:00:00.000Z',
    };
    return graphql(schema, query).then(res => {
      expect(res.data).to.deep.equal(expected);
    });
  });

  it('allows instanceof checks in __resolveType', () => {
    class Account {
      public id: string;
      public username: string;

      constructor() {
        this.id = '123nmasb';
        this.username = 'foo@bar.com';
      }
    }

    const typeDefs = `
      interface Node {
        id: ID!
      }

      type Account implements Node {
        id: ID!
        username: String
      }

      type User implements Node {
        id: ID!
      }

      type Query {
        node: Node
      }
    `;

    const resolvers = {
      Query: {
        node: () => new Account(),
      },
      Node: {
        __resolveType: (obj: any) => {
          if (obj instanceof Account) {
            return 'Account';
          }

          return null;
        },
      },
    };

    const schema = makeExecutableSchema({
      typeDefs,
      resolvers,
    });

    addMocksToSchema({
      schema,
      preserveResolvers: true,
    });

    const query = `
    {
      node {
        ...on Account {
          id
          username
        }
      }
    }
    `;

    const expected = {
      data: {
        node: {
          id: '123nmasb',
          username: 'foo@bar.com',
        },
      },
    };
    return graphql(schema, query).then(res => {
      expect(res).to.deep.equal(expected);
    });
  });

  // TODO add a test that checks that even when merging defaults, lists invoke
  // the function for every object, not just once per list.

  // TODO test that you can call mock server with a graphql-js schema
});
