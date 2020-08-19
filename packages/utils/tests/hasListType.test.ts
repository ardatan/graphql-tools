import { GraphQLNonNull, GraphQLList, GraphQLFloat } from 'graphql';
import { hasListType } from '../src/hasListType';

describe('hasListType', () => {
  test('should return false for plain output type', () => {
    const outputType = GraphQLFloat;
    const hasList = hasListType(outputType);
    expect(hasList).toBeFalsy();
  });

  test('should return false for wrapped output type', () => {
    const outputType = GraphQLNonNull(GraphQLFloat);
    const hasList = hasListType(outputType);
    expect(hasList).toBeFalsy();
  });

  test('should return true for list output type', () => {
    const outputType = GraphQLList(GraphQLFloat);
    const hasList = hasListType(outputType);
    expect(hasList).toBeDefined();
  });

  test('should return true for wrapped list', () => {
    const outputType = GraphQLNonNull(GraphQLList(GraphQLFloat));
    const hasList = hasListType(outputType);
    expect(hasList).toBeDefined();
  });

})
