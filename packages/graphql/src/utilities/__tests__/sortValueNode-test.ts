import { parseValue } from '../../language/parser.js';
import { print } from '../../language/printer.js';

import { sortValueNode } from '../sortValueNode.js';

describe('sortValueNode', () => {
  function expectSortedValue(source: string) {
    return expect(print(sortValueNode(parseValue(source))));
  }

  it('do not change non-object values', () => {
    expectSortedValue('1').toEqual('1');
    expectSortedValue('3.14').toEqual('3.14');
    expectSortedValue('null').toEqual('null');
    expectSortedValue('true').toEqual('true');
    expectSortedValue('false').toEqual('false');
    expectSortedValue('"cba"').toEqual('"cba"');
    expectSortedValue('"""cba"""').toEqual('"""cba"""');
    expectSortedValue('[1, 3.14, null, false, "cba"]').toEqual('[1, 3.14, null, false, "cba"]');
    expectSortedValue('[[1, 3.14, null, false, "cba"]]').toEqual('[[1, 3.14, null, false, "cba"]]');
  });

  it('sort input object fields', () => {
    expectSortedValue('{ b: 2, a: 1 }').toEqual('{ a: 1, b: 2 }');
    expectSortedValue('{ a: { c: 3, b: 2 } }').toEqual('{ a: { b: 2, c: 3 } }');
    expectSortedValue('[{ b: 2, a: 1 }, { d: 4, c: 3 }]').toEqual('[{ a: 1, b: 2 }, { c: 3, d: 4 }]');
    expectSortedValue('{ b: { g: 7, f: 6 }, c: 3 , a: { d: 4, e: 5 } }').toEqual(
      '{ a: { d: 4, e: 5 }, b: { f: 6, g: 7 }, c: 3 }'
    );
  });
});
