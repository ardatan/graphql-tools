import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLID,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLObjectType,
  GraphQLString,
  parseType,
} from 'graphql';
import { createStub, isNamedStub } from '../src/stub.js';

describe('createStub', () => {
  test('returns specified scalars instead of named object stubs', () => {
    const cases = [
      ['String', GraphQLString],
      ['ID', GraphQLID],
      ['Int', GraphQLInt],
      ['Float', GraphQLFloat],
      ['Boolean', GraphQLBoolean],
    ] as const;

    for (const [name, scalar] of cases) {
      expect(createStub(parseType(name), 'output')).toBe(scalar);
      expect(createStub(parseType(name), 'input')).toBe(scalar);
    }

    expect(createStub(parseType('String!'), 'output')).toMatchObject({ ofType: GraphQLString });
    expect(createStub(parseType('[ID]'), 'output')).toMatchObject({ ofType: GraphQLID });
  });

  test('still stubs unknown names', () => {
    const output = createStub(parseType('User'), 'output') as GraphQLObjectType;
    const input = createStub(parseType('UserInput'), 'input') as GraphQLInputObjectType;

    expect(isNamedStub(output)).toBe(true);
    expect(isNamedStub(input)).toBe(true);
    expect(output.name).toBe('User');
    expect(input.name).toBe('UserInput');
  });
});
