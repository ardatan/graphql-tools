import { identityFunc } from '../../jsutils/identityFunc.js';
import type { ObjMap } from '../../jsutils/ObjMap.js';

import { parseValue } from '../../language/parser.js';

import type { GraphQLInputType } from '../../type/definition.js';
import {
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLScalarType,
} from '../../type/definition.js';
import { GraphQLBoolean, GraphQLFloat, GraphQLID, GraphQLInt, GraphQLString } from '../../type/scalars.js';

import { valueFromAST } from '../valueFromAST.js';

describe('valueFromAST', () => {
  function expectValueFrom(valueText: string, type: GraphQLInputType, variables?: ObjMap<unknown>) {
    const ast = parseValue(valueText);
    const value = valueFromAST(ast, type, variables);
    return expect(value);
  }

  it('rejects empty input', () => {
    expect(valueFromAST(null, GraphQLBoolean)).toEqual(undefined);
  });

  it('converts according to input coercion rules', () => {
    expectValueFrom('true', GraphQLBoolean).toEqual(true);
    expectValueFrom('false', GraphQLBoolean).toEqual(false);
    expectValueFrom('123', GraphQLInt).toEqual(123);
    expectValueFrom('123', GraphQLFloat).toEqual(123);
    expectValueFrom('123.456', GraphQLFloat).toEqual(123.456);
    expectValueFrom('"abc123"', GraphQLString).toEqual('abc123');
    expectValueFrom('123456', GraphQLID).toEqual('123456');
    expectValueFrom('"123456"', GraphQLID).toEqual('123456');
  });

  it('does not convert when input coercion rules reject a value', () => {
    expectValueFrom('123', GraphQLBoolean).toEqual(undefined);
    expectValueFrom('123.456', GraphQLInt).toEqual(undefined);
    expectValueFrom('true', GraphQLInt).toEqual(undefined);
    expectValueFrom('"123"', GraphQLInt).toEqual(undefined);
    expectValueFrom('"123"', GraphQLFloat).toEqual(undefined);
    expectValueFrom('123', GraphQLString).toEqual(undefined);
    expectValueFrom('true', GraphQLString).toEqual(undefined);
    expectValueFrom('123.456', GraphQLString).toEqual(undefined);
  });

  it('convert using parseLiteral from a custom scalar type', () => {
    const passthroughScalar = new GraphQLScalarType({
      name: 'PassthroughScalar',
      parseLiteral(node) {
        expect(node.kind === 'StringValue').toBeTruthy();
        // @ts-expect-error
        return node.value;
      },
      parseValue: identityFunc,
    });

    expectValueFrom('"value"', passthroughScalar).toEqual('value');

    const throwScalar = new GraphQLScalarType({
      name: 'ThrowScalar',
      parseLiteral() {
        throw new Error('Test');
      },
      parseValue: identityFunc,
    });

    expectValueFrom('value', throwScalar).toEqual(undefined);

    const returnUndefinedScalar = new GraphQLScalarType({
      name: 'ReturnUndefinedScalar',
      parseLiteral() {
        return undefined;
      },
      parseValue: identityFunc,
    });

    expectValueFrom('value', returnUndefinedScalar).toEqual(undefined);
  });

  it('converts enum values according to input coercion rules', () => {
    const testEnum = new GraphQLEnumType({
      name: 'TestColor',
      values: {
        RED: { value: 1 },
        GREEN: { value: 2 },
        BLUE: { value: 3 },
        NULL: { value: null },
        NAN: { value: NaN },
        NO_CUSTOM_VALUE: { value: undefined },
      },
    });

    expectValueFrom('RED', testEnum).toEqual(1);
    expectValueFrom('BLUE', testEnum).toEqual(3);
    expectValueFrom('3', testEnum).toEqual(undefined);
    expectValueFrom('"BLUE"', testEnum).toEqual(undefined);
    expectValueFrom('null', testEnum).toEqual(null);
    expectValueFrom('NULL', testEnum).toEqual(null);
    expectValueFrom('NULL', new GraphQLNonNull(testEnum)).toEqual(null);
    expectValueFrom('NAN', testEnum).toEqual(NaN);
    expectValueFrom('NO_CUSTOM_VALUE', testEnum).toEqual('NO_CUSTOM_VALUE');
  });

  // Boolean!
  const nonNullBool = new GraphQLNonNull(GraphQLBoolean);
  // [Boolean]
  const listOfBool = new GraphQLList(GraphQLBoolean);
  // [Boolean!]
  const listOfNonNullBool = new GraphQLList(nonNullBool);
  // [Boolean]!
  const nonNullListOfBool = new GraphQLNonNull(listOfBool);
  // [Boolean!]!
  const nonNullListOfNonNullBool = new GraphQLNonNull(listOfNonNullBool);

  it('coerces to null unless non-null', () => {
    expectValueFrom('null', GraphQLBoolean).toEqual(null);
    expectValueFrom('null', nonNullBool).toEqual(undefined);
  });

  it('coerces lists of values', () => {
    expectValueFrom('true', listOfBool).toEqual([true]);
    expectValueFrom('123', listOfBool).toEqual(undefined);
    expectValueFrom('null', listOfBool).toEqual(null);
    expectValueFrom('[true, false]', listOfBool).toEqual([true, false]);
    expectValueFrom('[true, 123]', listOfBool).toEqual(undefined);
    expectValueFrom('[true, null]', listOfBool).toEqual([true, null]);
    expectValueFrom('{ true: true }', listOfBool).toEqual(undefined);
  });

  it('coerces non-null lists of values', () => {
    expectValueFrom('true', nonNullListOfBool).toEqual([true]);
    expectValueFrom('123', nonNullListOfBool).toEqual(undefined);
    expectValueFrom('null', nonNullListOfBool).toEqual(undefined);
    expectValueFrom('[true, false]', nonNullListOfBool).toEqual([true, false]);
    expectValueFrom('[true, 123]', nonNullListOfBool).toEqual(undefined);
    expectValueFrom('[true, null]', nonNullListOfBool).toEqual([true, null]);
  });

  it('coerces lists of non-null values', () => {
    expectValueFrom('true', listOfNonNullBool).toEqual([true]);
    expectValueFrom('123', listOfNonNullBool).toEqual(undefined);
    expectValueFrom('null', listOfNonNullBool).toEqual(null);
    expectValueFrom('[true, false]', listOfNonNullBool).toEqual([true, false]);
    expectValueFrom('[true, 123]', listOfNonNullBool).toEqual(undefined);
    expectValueFrom('[true, null]', listOfNonNullBool).toEqual(undefined);
  });

  it('coerces non-null lists of non-null values', () => {
    expectValueFrom('true', nonNullListOfNonNullBool).toEqual([true]);
    expectValueFrom('123', nonNullListOfNonNullBool).toEqual(undefined);
    expectValueFrom('null', nonNullListOfNonNullBool).toEqual(undefined);
    expectValueFrom('[true, false]', nonNullListOfNonNullBool).toEqual([true, false]);
    expectValueFrom('[true, 123]', nonNullListOfNonNullBool).toEqual(undefined);
    expectValueFrom('[true, null]', nonNullListOfNonNullBool).toEqual(undefined);
  });

  const testInputObj = new GraphQLInputObjectType({
    name: 'TestInput',
    fields: {
      int: { type: GraphQLInt, defaultValue: 42 },
      bool: { type: GraphQLBoolean },
      requiredBool: { type: nonNullBool },
    },
  });

  it('coerces input objects according to input coercion rules', () => {
    expectValueFrom('null', testInputObj).toEqual(null);
    expectValueFrom('123', testInputObj).toEqual(undefined);
    expectValueFrom('[]', testInputObj).toEqual(undefined);
    expectValueFrom('{ int: 123, requiredBool: false }', testInputObj).toEqual({
      int: 123,
      requiredBool: false,
    });
    expectValueFrom('{ bool: true, requiredBool: false }', testInputObj).toEqual({
      int: 42,
      bool: true,
      requiredBool: false,
    });
    expectValueFrom('{ int: true, requiredBool: true }', testInputObj).toEqual(undefined);
    expectValueFrom('{ requiredBool: null }', testInputObj).toEqual(undefined);
    expectValueFrom('{ bool: true }', testInputObj).toEqual(undefined);
  });

  it('accepts variable values assuming already coerced', () => {
    expectValueFrom('$var', GraphQLBoolean, {}).toEqual(undefined);
    expectValueFrom('$var', GraphQLBoolean, { var: true }).toEqual(true);
    expectValueFrom('$var', GraphQLBoolean, { var: null }).toEqual(null);
    expectValueFrom('$var', nonNullBool, { var: null }).toEqual(undefined);
  });

  it('asserts variables are provided as items in lists', () => {
    expectValueFrom('[ $foo ]', listOfBool, {}).toEqual([null]);
    expectValueFrom('[ $foo ]', listOfNonNullBool, {}).toEqual(undefined);
    expectValueFrom('[ $foo ]', listOfNonNullBool, {
      foo: true,
    }).toEqual([true]);
    // Note: variables are expected to have already been coerced, so we
    // do not expect the singleton wrapping behavior for variables.
    expectValueFrom('$foo', listOfNonNullBool, { foo: true }).toEqual(true);
    expectValueFrom('$foo', listOfNonNullBool, { foo: [true] }).toEqual([true]);
  });

  it('omits input object fields for unprovided variables', () => {
    expectValueFrom('{ int: $foo, bool: $foo, requiredBool: true }', testInputObj, {}).toEqual({
      int: 42,
      requiredBool: true,
    });

    expectValueFrom('{ requiredBool: $foo }', testInputObj, {}).toEqual(undefined);

    expectValueFrom('{ requiredBool: $foo }', testInputObj, {
      foo: true,
    }).toEqual({
      int: 42,
      requiredBool: true,
    });
  });
});
