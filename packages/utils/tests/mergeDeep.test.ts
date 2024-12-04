import { mergeDeep } from '@graphql-tools/utils';

describe('mergeDeep', () => {
  test('merges deeply', () => {
    const x = { a: { one: 1 } };
    const y = { a: { two: 2 } };
    expect(mergeDeep([x, y])).toEqual({ a: { one: 1, two: 2 } });
  });

  test('strips property symbols', () => {
    const x = {};
    const symbol = Symbol('symbol');
    x[symbol] = 'value';
    const y = { a: 2 };

    const merged = mergeDeep([x, y]);
    expect(merged).toStrictEqual({ a: 2 });
    expect(Object.getOwnPropertySymbols(merged)).toEqual([]);
  });

  test('merges prototypes', () => {
    const ClassA = class {
      a() {
        return 'a';
      }
    };
    const ClassB = class {
      b() {
        return 'b';
      }
    };

    const merged = mergeDeep([new ClassA(), new ClassB()], true);
    expect(merged.a()).toEqual('a');
    expect(merged.b()).toEqual('b');
  });

  test('merges prototype deeply', () => {
    const ClassA = class {
      a() {
        return 'a';
      }
    };
    const ClassB = class {
      b() {
        return 'b';
      }
    };

    const merged = mergeDeep([{ one: new ClassA() }, { one: new ClassB() }], true);
    expect(merged.one.a()).toEqual('a');
    expect(merged.one.b()).toEqual('b');
    expect(merged.a).toBeUndefined();
  });

  it('merges arrays', () => {
    const x = { a: [1, 2, 5] };
    const y = { a: [3, 4] };
    expect(mergeDeep([x, y], false, true)).toEqual({ a: [1, 2, 5, 3, 4] });
  });
  it('merges arrays with the same length', () => {
    const x = [{ a: 1 }, { b: 2 }];
    const y = [{ c: 3 }, { d: 4 }];
    expect(mergeDeep([x, y], false, true, true)).toEqual([
      { a: 1, c: 3 },
      { b: 2, d: 4 },
    ]);
  });

  it('merges string arrays', () => {
    const a = { options: ['$A', '$B'] };
    const b = { options: ['$A', '$B'] };
    expect(mergeDeep([a, b], undefined, true, true)).toEqual({ options: ['$A', '$B'] });
  });
});
