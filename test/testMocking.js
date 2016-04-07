import {
  buildSchemaFromTypeDefinitions,
  addMockFunctionsToSchema,
  addResolveFunctionsToSchema,
} from '../src/schemaGenerator.js';
import { expect } from 'chai';
import {
  graphql,
 } from 'graphql';

describe('Mock', () => {
  const shorthand = `
    type Bird {
      returnInt: Int
      returnString: String
    }

    type RootQuery {
      returnInt: Int
      returnFloat: Float
      returnString: String
      returnBoolean: Boolean
      returnID: ID
      returnNullableString: String
      returnNonNullString: String!
      returnObject: Bird
      returnListOfInt: [Int]
      returnListOfListOfObject: [[Bird!]]!
    }
    schema {
      query: RootQuery
    }
  `;

  const jsSchema = buildSchemaFromTypeDefinitions(shorthand);

  it('can mock an Int', () => {
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
  it('can mock a STRING', () => {
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

  it('only masks resolve functions if you define a mock', () => {
    const mockMap = new Map();
    const resolvers = { RootQuery: { returnInt: () => 5 } };
    addResolveFunctionsToSchema(jsSchema, resolvers);
    addMockFunctionsToSchema(jsSchema, mockMap);
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
});
