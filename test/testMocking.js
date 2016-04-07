import {
  buildSchemaFromTypeDefinitions,
  addMockFunctionsToSchema,
  addResolveFunctionsToSchema,
  MockList,
} from '../src/schemaGenerator.js';
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
    expect(() => addMockFunctionsToSchema(jsSchema, ['a']))
                  .to.throw('mockFunctionMap must be a Map');
  });

  it('throws an error if mockFunctionMap contains a non-function thingy', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const aMap = new Map();
    aMap.set('Int', 55);
    expect(() => addMockFunctionsToSchema(jsSchema, aMap))
                  .to.throw('mockFunctionMap[Int] must be a function');
  });

  it('mocks the default types for you', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = new Map();
    addMockFunctionsToSchema(jsSchema, mockMap);
    const testQuery = `{
      returnInt
      returnFloat
      returnBoolean
      returnString
      returnID
    }`;
    const expected = {
      returnInt: 58,
      returnFloat: 12.3,
      returnString: 'Lorem Ipsum',
      returnBoolean: false,
      returnID: '41ae7bd',
    };
    return graphql(jsSchema, testQuery).then((res) => {
      expect(res.data).to.deep.equal(expected);
    });
  });

  it('throws an error in resolve if mock type is not defined', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = new Map();
    addMockFunctionsToSchema(jsSchema, mockMap);
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
    const mockMap = new Map();
    mockMap.set('Int', () => 55);
    addMockFunctionsToSchema(jsSchema, mockMap);
    const testQuery = `{
      returnInt
    }`;
    return graphql(jsSchema, testQuery).then((res) => {
      expect(res.data.returnInt).to.equal(55);
    });
  });

  it('can mock a Float', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = new Map();
    mockMap.set('Float', () => 55.5);
    addMockFunctionsToSchema(jsSchema, mockMap);
    const testQuery = `{
      returnFloat
    }`;
    return graphql(jsSchema, testQuery).then((res) => {
      expect(res.data.returnFloat).to.equal(55.5);
    });
  });
  it('can mock a String', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = new Map();
    mockMap.set('String', () => 'a string');
    addMockFunctionsToSchema(jsSchema, mockMap);
    const testQuery = `{
      returnString
    }`;
    return graphql(jsSchema, testQuery).then((res) => {
      expect(res.data.returnString).to.equal('a string');
    });
  });
  it('can mock a Boolean', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = new Map();
    mockMap.set('Boolean', () => true);
    addMockFunctionsToSchema(jsSchema, mockMap);
    const testQuery = `{
      returnBoolean
    }`;
    return graphql(jsSchema, testQuery).then((res) => {
      expect(res.data.returnBoolean).to.equal(true);
    });
  });
  it('can mock an ID', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = new Map();
    mockMap.set('ID', () => 'ea5bdc19');
    addMockFunctionsToSchema(jsSchema, mockMap);
    const testQuery = `{
      returnID
    }`;
    return graphql(jsSchema, testQuery).then((res) => {
      expect(res.data.returnID).to.equal('ea5bdc19');
    });
  });
  it('nullable type is nullable', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = new Map();
    mockMap.set('String', () => null);
    addMockFunctionsToSchema(jsSchema, mockMap);
    const testQuery = `{
      returnNullableString
    }`;
    return graphql(jsSchema, testQuery).then((res) => {
      expect(res.data.returnNullableString).to.equal(null);
    });
  });
  it('can mock a nonNull type', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = new Map();
    mockMap.set('String', () => 'nonnull');
    addMockFunctionsToSchema(jsSchema, mockMap);
    const testQuery = `{
      returnNonNullString
    }`;
    return graphql(jsSchema, testQuery).then((res) => {
      expect(res.data.returnNonNullString).to.equal('nonnull');
    });
  });
  it('nonNull type is not nullable', () => {
    const jsSchema = buildSchemaFromTypeDefinitions(shorthand);
    const mockMap = new Map();
    mockMap.set('String', () => null);
    addMockFunctionsToSchema(jsSchema, mockMap);
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
    const mockMap = new Map();
    mockMap.set('String', () => 'abc');
    mockMap.set('Int', () => 123);
    addMockFunctionsToSchema(jsSchema, mockMap);
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
    const mockMap = new Map();
    mockMap.set('Int', () => 123);
    addMockFunctionsToSchema(jsSchema, mockMap);
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
    const mockMap = new Map();
    mockMap.set('String', () => 'a');
    mockMap.set('Int', () => 1);
    addMockFunctionsToSchema(jsSchema, mockMap);
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
    const mockMap = new Map();
    const resolvers = { RootQuery: { returnInt: () => 5 } };
    addResolveFunctionsToSchema(jsSchema, resolvers);
    addMockFunctionsToSchema(jsSchema, mockMap, true);
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
    const mockMap = new Map();
    mockMap.set('Bird', () => { return { returnInt: 12, returnString: 'woot!?' };});
    mockMap.set('Int', () => 15);
    addMockFunctionsToSchema(jsSchema, mockMap);
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
    const mockMap = new Map();
    mockMap.set('Bird', () => { return { returnStringArgument: (o, a) => a.s };});
    addMockFunctionsToSchema(jsSchema, mockMap);
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
    const mockMap = new Map();
    mockMap.set('RootQuery', () => { return { returnStringArgument: (o, a) => a.s };});
    addMockFunctionsToSchema(jsSchema, mockMap);
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
    const mockMap = new Map();
    mockMap.set('RootMutation', () => {
      return { returnStringArgument: (o, a) => a.s };
    });
    addMockFunctionsToSchema(jsSchema, mockMap);
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
    const mockMap = new Map();
    mockMap.set('RootQuery', () => {
      return { returnListOfInt: () => new MockList(3) };
    });
    mockMap.set('Int', () => 12);
    addMockFunctionsToSchema(jsSchema, mockMap);
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
    const mockMap = new Map();
    mockMap.set('RootQuery', () => {
      return { returnListOfInt: () => new MockList([10, 20]) };
    });
    mockMap.set('Int', () => 12);
    addMockFunctionsToSchema(jsSchema, mockMap);
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
    const mockMap = new Map();
    mockMap.set('RootQuery', () => {
      return { returnListOfIntArg: (o, a) => new MockList(a.l) };
    });
    mockMap.set('Int', () => 12);
    addMockFunctionsToSchema(jsSchema, mockMap);
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
    const mockMap = new Map();
    mockMap.set('RootQuery', () => {
      return { returnListOfInt: () => new MockList(2, () => 33) };
    });
    mockMap.set('Int', () => 12);
    addMockFunctionsToSchema(jsSchema, mockMap);
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
    const mockMap = new Map();
    mockMap.set('RootQuery', () => {
      return { returnListOfListOfInt: () => {
        return new MockList(2, () => new MockList(3));
      } };
    });
    mockMap.set('Int', () => 12);
    addMockFunctionsToSchema(jsSchema, mockMap);
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
    const mockMap = new Map();
    mockMap.set('RootQuery', () => {
      return { returnListOfListOfIntArg: () => {
        return new MockList(2, (o, a) => new MockList(a.l));
      } };
    });
    mockMap.set('Int', () => 12);
    addMockFunctionsToSchema(jsSchema, mockMap);
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
});
