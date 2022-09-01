import type { Maybe } from '../../jsutils/Maybe.js';
import type { ObjMap } from '../../jsutils/ObjMap.js';

import { parseValue } from '../../language/parser.js';

import { valueFromASTUntyped } from '../valueFromASTUntyped.js';

describe('valueFromASTUntyped', () => {
  function expectValueFrom(valueText: string, variables?: Maybe<ObjMap<unknown>>) {
    const ast = parseValue(valueText);
    const value = valueFromASTUntyped(ast, variables);
    return expect(value);
  }

  it('parses simple values', () => {
    expectValueFrom('null').toEqual(null);
    expectValueFrom('true').toEqual(true);
    expectValueFrom('false').toEqual(false);
    expectValueFrom('123').toEqual(123);
    expectValueFrom('123.456').toEqual(123.456);
    expectValueFrom('"abc123"').toEqual('abc123');
  });

  it('parses lists of values', () => {
    expectValueFrom('[true, false]').toEqual([true, false]);
    expectValueFrom('[true, 123.45]').toEqual([true, 123.45]);
    expectValueFrom('[true, null]').toEqual([true, null]);
    expectValueFrom('[true, ["foo", 1.2]]').toEqual([true, ['foo', 1.2]]);
  });

  it('parses input objects', () => {
    expectValueFrom('{ int: 123, bool: false }').toEqual({
      int: 123,
      bool: false,
    });
    expectValueFrom('{ foo: [ { bar: "baz"} ] }').toEqual({
      foo: [{ bar: 'baz' }],
    });
  });

  it('parses enum values as plain strings', () => {
    expectValueFrom('TEST_ENUM_VALUE').toEqual('TEST_ENUM_VALUE');
    expectValueFrom('[TEST_ENUM_VALUE]').toEqual(['TEST_ENUM_VALUE']);
  });

  it('parses variables', () => {
    expectValueFrom('$testVariable', { testVariable: 'foo' }).toEqual('foo');
    expectValueFrom('[$testVariable]', { testVariable: 'foo' }).toEqual(['foo']);
    expectValueFrom('{a:[$testVariable]}', {
      testVariable: 'foo',
    }).toEqual({ a: ['foo'] });
    expectValueFrom('$testVariable', { testVariable: null }).toEqual(null);
    expectValueFrom('$testVariable', {}).toEqual(undefined);
    expectValueFrom('$testVariable', null).toEqual(undefined);
  });
});
