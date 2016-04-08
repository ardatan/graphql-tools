import {
  addMockFunctionsToSchema,
  MockList,
  mockServer,
} from '../src/mock';
import {
  buildSchemaFromTypeDefinitions,
  addResolveFunctionsToSchema,
} from '../src/schemaGenerator';
import { expect } from 'chai';
import {
  graphql,
 } from 'graphql';

describe('Mock', () => {
  const shorthand = `
    scalar MissingMockType

    type Bird {
      returnInt: Int
      returnString: String
      returnStringArgument(s: String): String
    }

    type RootQuery {
      returnInt: Int
      returnFloat: Float
      returnString: String
      returnBoolean: Boolean
      returnID: ID
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
    }

    type RootMutation{
      returnStringArgument(s: String): String
    }
    schema {
      query: RootQuery
      mutation: RootMutation
    }
  `;

  it('throws an error if you forget to pass schema', () => {
    expect(() => addMockFunctionsToSchema())
                  .to.throw('Must provide schema to mock');
  });

  it('throws an error if second argument is not a Map', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    expect(() => addMockFunctionsToSchema({ schema: jsSchema, mocks: ['a'] }))
                  .to.throw('mocks must be of type Object');
  });

  it('throws an error if mockFunctionMap contains a non-function thingy', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = { Int: 55 };
    expect(() => addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap }))
                  .to.throw('mockFunctionMap[Int] must be a function');
  });

  it('mocks the default types for you', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = {};
    addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
    const testQuery = `{
      returnInt
      returnFloat
      returnBoolean
      returnString
      returnID
    }`;
    return graphql(jsSchema, testQuery).then((res) => {
      expect(res.data.returnInt).to.be.within(-1000, 1000);
      expect(res.data.returnFloat).to.be.within(-1000, 1000);
      expect(res.data.returnBoolean).to.be.a('boolean');
      expect(res.data.returnString).to.be.a('string');
      expect(res.data.returnID).to.be.a('string');
    });
  });

  it('lets you use mockServer for convenience', () => {
    const testQuery = `{
      returnInt
      returnFloat
      returnBoolean
      returnString
      returnID
    }`;
    return mockServer(shorthand, {}).query(testQuery).then((res) => {
      expect(res.data.returnInt).to.be.within(-1000, 1000);
      expect(res.data.returnFloat).to.be.within(-1000, 1000);
      expect(res.data.returnBoolean).to.be.a('boolean');
      expect(res.data.returnString).to.be.a('string');
      expect(res.data.returnID).to.be.a('string');
    });
  });

  it('throws an error in resolve if mock type is not defined', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = {};
    addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
    const testQuery = `{
      returnMockError
    }`;
    const expected = 'No mock defined for type "MissingMockType"';
    return graphql(jsSchema, testQuery).then((res) => {
      expect(res.errors[0].originalError.message).to.equal(expected);
    });
  });

  it('can mock an Int', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = { Int: () => 55 };
    addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
    const testQuery = `{
      returnInt
    }`;
    return graphql(jsSchema, testQuery).then((res) => {
      expect(res.data.returnInt).to.equal(55);
    });
  });

  it('can mock a Float', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = { Float: () => 55.5 };
    addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
    const testQuery = `{
      returnFloat
    }`;
    return graphql(jsSchema, testQuery).then((res) => {
      expect(res.data.returnFloat).to.equal(55.5);
    });
  });
  it('can mock a String', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = { String: () => 'a string' };
    addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
    const testQuery = `{
      returnString
    }`;
    return graphql(jsSchema, testQuery).then((res) => {
      expect(res.data.returnString).to.equal('a string');
    });
  });
  it('can mock a Boolean', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = { Boolean: () => true };
    addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
    const testQuery = `{
      returnBoolean
    }`;
    return graphql(jsSchema, testQuery).then((res) => {
      expect(res.data.returnBoolean).to.equal(true);
    });
  });
  it('can mock an ID', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = { ID: () => 'ea5bdc19' };
    addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
    const testQuery = `{
      returnID
    }`;
    return graphql(jsSchema, testQuery).then((res) => {
      expect(res.data.returnID).to.equal('ea5bdc19');
    });
  });
  it('nullable type is nullable', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = { String: () => null };
    addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
    const testQuery = `{
      returnNullableString
    }`;
    return graphql(jsSchema, testQuery).then((res) => {
      expect(res.data.returnNullableString).to.equal(null);
    });
  });
  it('can mock a nonNull type', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = { String: () => 'nonnull' };
    addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
    const testQuery = `{
      returnNonNullString
    }`;
    return graphql(jsSchema, testQuery).then((res) => {
      expect(res.data.returnNonNullString).to.equal('nonnull');
    });
  });
  it('nonNull type is not nullable', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = { String: () => null };
    addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
    const testQuery = `{
      returnNonNullString
    }`;
    return graphql(jsSchema, testQuery).then((res) => {
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
    addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
    const testQuery = `{
      returnObject { returnInt, returnString }
    }`;
    const expected = {
      returnObject: { returnInt: 123, returnString: 'abc' },
    };
    return graphql(jsSchema, testQuery).then((res) => {
      expect(res.data).to.deep.equal(expected);
    });
  });

  it('can mock a list of ints', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = { Int: () => 123 };
    addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
    const testQuery = `{
      returnListOfInt
    }`;
    const expected = {
      returnListOfInt: [123, 123],
    };
    return graphql(jsSchema, testQuery).then((res) => {
      expect(res.data).to.deep.equal(expected);
    });
  });

  it('can mock a list of lists of objects', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = {
      String: () => 'a',
      Int: () => 1,
    };
    addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
    const testQuery = `{
      returnListOfListOfObject { returnInt, returnString }
    }`;
    const expected = {
      returnListOfListOfObject: [
        [{ returnInt: 1, returnString: 'a' }, { returnInt: 1, returnString: 'a' }],
        [{ returnInt: 1, returnString: 'a' }, { returnInt: 1, returnString: 'a' }],
      ],
    };
    return graphql(jsSchema, testQuery).then((res) => {
      expect(res.data).to.deep.equal(expected);
    });
  });

  it('does not mask resolve functions if you tell it not to', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = {};
    const resolvers = { RootQuery: { returnInt: () => 5 } };
    addResolveFunctionsToSchema(jsSchema, resolvers);
    addMockFunctionsToSchema({
      schema: jsSchema,
      mocks: mockMap,
      preserveResolvers: true,
    });
    const testQuery = `{
      returnInt
    }`;
    const expected = {
      returnInt: 5,
    };
    return graphql(jsSchema, testQuery).then((res) => {
      expect(res.data).to.deep.equal(expected);
    });
  });

  it('lets you mock non-leaf types conveniently', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = {
      Bird: () => { return { returnInt: 12, returnString: 'woot!?' };},
      Int: () => 15,
    };
    addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
    const testQuery = `{
      returnObject{
        returnInt
        returnString
      }
      returnInt
    }`;
    const expected = {
      returnObject: { returnInt: 12, returnString: 'woot!?' },
      returnInt: 15,
    };
    return graphql(jsSchema, testQuery).then((res) => {
      expect(res.data).to.deep.equal(expected);
    });
  });

  it('lets you mock with functions', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = {
      Bird: () => { return { returnStringArgument: (o, a) => a.s }; },
    };
    addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
    const testQuery = `{
      returnObject{
        returnStringArgument(s: "adieu")
      }
    }`;
    const expected = {
      returnObject: { returnStringArgument: 'adieu' },
    };
    return graphql(jsSchema, testQuery).then((res) => {
      expect(res.data).to.deep.equal(expected);
    });
  });

  it('lets you mock root query fields', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = {
      RootQuery: () => { return { returnStringArgument: (o, a) => a.s };},
    };
    addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
    const testQuery = `{
      returnStringArgument(s: "adieu")
    }`;
    const expected = {
      returnStringArgument: 'adieu',
    };
    return graphql(jsSchema, testQuery).then((res) => {
      expect(res.data).to.deep.equal(expected);
    });
  });

  it('lets you mock root mutation fields', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = {
      RootMutation: () => { return { returnStringArgument: (o, a) => a.s }; },
    };
    addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
    const testQuery = `mutation {
      returnStringArgument(s: "adieu")
    }`;
    const expected = {
      returnStringArgument: 'adieu',
    };
    return graphql(jsSchema, testQuery).then((res) => {
      expect(res.data).to.deep.equal(expected);
    });
  });

  it('lets you mock a list of a certain length', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = {
      RootQuery: () => { return { returnListOfInt: () => new MockList(3) }; },
      Int: () => 12,
    };
    addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
    const testQuery = `{
      returnListOfInt
    }`;
    const expected = {
      returnListOfInt: [12, 12, 12],
    };
    return graphql(jsSchema, testQuery).then((res) => {
      expect(res.data).to.deep.equal(expected);
    });
  });

  it('lets you mock a list of a random length', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = {
      RootQuery: () => { return { returnListOfInt: () => new MockList([10, 20]) }; },
      Int: () => 12,
    };
    addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
    const testQuery = `{
      returnListOfInt
    }`;
    return graphql(jsSchema, testQuery).then((res) => {
      expect(res.data.returnListOfInt).to.have.length.within(10, 20);
      expect(res.data.returnListOfInt[0]).to.equal(12);
    });
  });

  it('lets you mock a list of specific variable length', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = {
      RootQuery: () => {
        return { returnListOfIntArg: (o, a) => new MockList(a.l) };
      },
      Int: () => 12,
    };
    addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
    const testQuery = `{
      l3: returnListOfIntArg(l: 3)
      l5: returnListOfIntArg(l: 5)
    }`;
    return graphql(jsSchema, testQuery).then((res) => {
      expect(res.data.l3.length).to.equal(3);
      expect(res.data.l5.length).to.equal(5);
    });
  });

  it('lets you provide a function for your MockList', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = {
      RootQuery: () => {
        return { returnListOfInt: () => new MockList(2, () => 33) };
      },
      Int: () => 12,
    };
    addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
    const testQuery = `{
      returnListOfInt
    }`;
    const expected = {
      returnListOfInt: [33, 33],
    };
    return graphql(jsSchema, testQuery).then((res) => {
      expect(res.data).to.deep.equal(expected);
    });
  });

  it('throws an error if the second argument to MockList is not a function', () => {
    expect(() => new MockList(5, 'abc'))
                  .to.throw('Second argument to MockList must be a function or undefined');
  });

  it('lets you nest MockList in MockList', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = {
      RootQuery: () => ({
        returnListOfListOfInt: () => new MockList(2, () => new MockList(3)),
      }),
      Int: () => 12,
    };
    addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
    const testQuery = `{
      returnListOfListOfInt
    }`;
    const expected = {
      returnListOfListOfInt: [[12, 12, 12], [12, 12, 12]],
    };
    return graphql(jsSchema, testQuery).then((res) => {
      expect(res.data).to.deep.equal(expected);
    });
  });

  it('lets you use arguments in nested MockList', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = {
      RootQuery: () => ({
        returnListOfListOfIntArg: () => new MockList(2, (o, a) => new MockList(a.l)),
      }),
      Int: () => 12,
    };
    addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
    const testQuery = `{
      returnListOfListOfIntArg(l: 1)
    }`;
    const expected = {
      returnListOfListOfIntArg: [[12], [12]],
    };
    return graphql(jsSchema, testQuery).then((res) => {
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
        thread: (o, a) => ({ id: a.id }),
        threads: (o, a) => new MockList(ITEMS_PER_PAGE * a.num),
      }),
      Thread: () => {
        return {
          name: 'Lorem Ipsum',
          posts: (o, a) => {
            return new MockList(ITEMS_PER_PAGE * a.num, (oi, ai) => ({ id: ai.num }));
          },
        };
      },
      Post: () => ({
        id: '41ae7bd',
        text: 'superlongpost',
      }),
      Int: () => 123,
    };
    addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
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
    return graphql(jsSchema, testQuery).then((res) => {
      expect(res.data).to.deep.equal(expected);
    });
  });
});
