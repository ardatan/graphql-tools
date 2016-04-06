import { generateSchema, addMockFunctionsToSchema } from '../src/schemaGenerator.js';
import { expect } from 'chai';
import {
  graphql,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLString,
  GraphQLID,
 } from 'graphql';

describe('Mock', () => {
  const shorthand = `
    type RootQuery {
      returnInt: Int
      returnFloat: Float
      returnString: String
      returnBoolean: Boolean
      returnID: ID
    }
    schema {
      query: RootQuery
    }
  `;

  it('can mock an Int', () => {
    const jsSchema = generateSchema(shorthand, {});
    const mockMap = new Map();
    mockMap.set(GraphQLInt, () => 55);
    addMockFunctionsToSchema(jsSchema, mockMap);
    const testQuery = `{
      returnInt
    }`;
    return graphql(jsSchema, testQuery).then((res) => {
      expect(res.data.returnInt).to.equal(55);
    });
  });

  it('can mock a Float', () => {
    const jsSchema = generateSchema(shorthand, {});
    const mockMap = new Map();
    mockMap.set(GraphQLFloat, () => 55.5);
    addMockFunctionsToSchema(jsSchema, mockMap);
    const testQuery = `{
      returnFloat
    }`;
    return graphql(jsSchema, testQuery).then((res) => {
      expect(res.data.returnFloat).to.equal(55.5);
    });
  });
  it('can mock a STRING', () => {
    const jsSchema = generateSchema(shorthand, {});
    const mockMap = new Map();
    mockMap.set(GraphQLString, () => 'a string');
    addMockFunctionsToSchema(jsSchema, mockMap);
    const testQuery = `{
      returnString
    }`;
    return graphql(jsSchema, testQuery).then((res) => {
      expect(res.data.returnString).to.equal('a string');
    });
  });
  it('can mock a Boolean', () => {
    const jsSchema = generateSchema(shorthand, {});
    const mockMap = new Map();
    mockMap.set(GraphQLBoolean, () => true);
    addMockFunctionsToSchema(jsSchema, mockMap);
    const testQuery = `{
      returnBoolean
    }`;
    return graphql(jsSchema, testQuery).then((res) => {
      expect(res.data.returnBoolean).to.equal(true);
    });
  });
  it('can mock an ID', () => {
    const jsSchema = generateSchema(shorthand, {});
    const mockMap = new Map();
    mockMap.set(GraphQLID, () => 'ea5bdc19');
    addMockFunctionsToSchema(jsSchema, mockMap);
    const testQuery = `{
      returnID
    }`;
    return graphql(jsSchema, testQuery).then((res) => {
      expect(res.data.returnID).to.equal('ea5bdc19');
    });
  });
});
