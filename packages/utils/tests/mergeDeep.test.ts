import { mergeDeep } from '@graphql-tools/utils';

describe('mergeDeep', () => {
  test('merges deeply', () => {
    const x = { a: { one: 1 } };
    const y = { a: { two: 2 } };
    expect(mergeDeep([x, y])).toEqual({ a: { one: 1, two: 2 } });
  });

  test('strips property symbols by default', () => {
    const x: any = {};
    const symbol = Symbol('symbol');
    x[symbol] = 'value';
    const y = { a: 2 };

    const merged = mergeDeep([x, y]);
    expect(merged).toStrictEqual({ a: 2 });
    expect(Object.getOwnPropertySymbols(merged)).toEqual([]);
  });

  test('preserves enumerable property symbols when respectSymbols.enumerable is set', () => {
    const x: any = {};
    const symbol = Symbol('symbol');
    x[symbol] = 'value';
    const y = { a: 2 };

    const merged = mergeDeep([x, y], { respectSymbols: { enumerable: true } });
    expect(merged.a).toEqual(2);
    expect(merged[symbol]).toEqual('value');
    expect(Object.getOwnPropertySymbols(merged)).toEqual([symbol]);
  });

  test('merges enumerable property symbols from later sources when respectSymbols.enumerable is set', () => {
    const sym = Symbol('shared');
    const x: any = { [sym]: { one: 1 } };
    const y: any = { [sym]: { two: 2 } };

    const merged = mergeDeep([x, y], { respectSymbols: { enumerable: true } });
    expect(merged[sym]).toEqual({ one: 1, two: 2 });
  });

  test('preserves both enumerable and non-enumerable symbols when both flags are set', () => {
    const enumerableSym = Symbol('enumerable');
    const nonEnumerableSym = Symbol('annotation');
    const first: any = { a: 1, [enumerableSym]: 'visible' };
    Object.defineProperty(first, nonEnumerableSym, { value: 'annotated', writable: true });
    const second = { b: 2 };

    const merged = mergeDeep([first, second], {
      respectSymbols: { enumerable: true, nonEnumerable: true },
    });
    expect(merged.a).toEqual(1);
    expect(merged.b).toEqual(2);
    expect(merged[enumerableSym]).toEqual('visible');
    expect(merged[nonEnumerableSym]).toEqual('annotated');
  });

  test('preserves non-enumerable symbols via respectSymbols.nonEnumerable', () => {
    const sym = Symbol('annotation');
    const first: any = { a: 1 };
    Object.defineProperty(first, sym, { value: 'annotated', writable: true });
    const second = { b: 2 };
    const merged = mergeDeep([first, second], { respectSymbols: { nonEnumerable: true } });
    expect(merged.a).toEqual(1);
    expect(merged.b).toEqual(2);
    expect(merged[sym]).toEqual('annotated');
  });

  test('does not copy enumerable symbols when only nonEnumerable is enabled', () => {
    const enumerableSym = Symbol('enumerable');
    const nonEnumerableSym = Symbol('annotation');
    const first: any = { a: 1, [enumerableSym]: 'visible' };
    Object.defineProperty(first, nonEnumerableSym, { value: 'annotated', writable: true });
    const second = { b: 2 };
    const merged = mergeDeep([first, second], { respectSymbols: { nonEnumerable: true } });
    expect(merged.a).toEqual(1);
    expect(merged.b).toEqual(2);
    expect(merged[enumerableSym]).toBeUndefined();
    expect(merged[nonEnumerableSym]).toEqual('annotated');
  });

  test('overrides a repeated non-enumerable symbol from a later source without throwing', () => {
    const sym = Symbol('annotation');
    const first: any = { a: 1 };
    const second: any = { b: 2 };
    Object.defineProperty(first, sym, { value: 'first', writable: true });
    Object.defineProperty(second, sym, { value: 'second', writable: true });

    const merged = mergeDeep([first, second], { respectSymbols: { nonEnumerable: true } });
    expect(merged.a).toEqual(1);
    expect(merged.b).toEqual(2);
    expect(merged[sym]).toEqual('second');
  });

  test('updates a non-configurable setter-backed non-enumerable symbol from a later source', () => {
    const sym = Symbol('annotation');
    let current = 'first';
    const first: any = { a: 1 };
    Object.defineProperty(first, sym, {
      enumerable: false,
      configurable: false,
      get() {
        return current;
      },
      set(value: string) {
        current = value;
      },
    });
    const second: any = { b: 2 };
    Object.defineProperty(second, sym, { value: 'second', writable: true });

    const merged = mergeDeep([first, second], { respectSymbols: { nonEnumerable: true } });
    expect(merged.a).toEqual(1);
    expect(merged.b).toEqual(2);
    expect(merged[sym]).toEqual('second');
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

    const merged = mergeDeep([new ClassA(), new ClassB()], { respectPrototype: true });
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

    const merged = mergeDeep([{ one: new ClassA() }, { one: new ClassB() }], {
      respectPrototype: true,
    });
    expect(merged.one.a()).toEqual('a');
    expect(merged.one.b()).toEqual('b');
    expect(merged.a).toBeUndefined();
  });

  it('merges arrays', () => {
    const x = { a: [1, 2, 5] };
    const y = { a: [3, 4] };
    expect(mergeDeep([x, y], { respectArrays: true })).toEqual({ a: [1, 2, 5, 3, 4] });
  });

  it('merges arrays with the same length', () => {
    const x = [{ a: 1 }, { b: 2 }];
    const y = [{ c: 3 }, { d: 4 }];
    expect(mergeDeep([x, y], { respectArrays: true, respectArrayLength: true })).toEqual([
      { a: 1, c: 3 },
      { b: 2, d: 4 },
    ]);
  });

  it('merges string arrays', () => {
    const a = { options: ['$A', '$B'] };
    const b = { options: ['$A', '$B'] };
    expect(mergeDeep([a, b], { respectArrays: true, respectArrayLength: true })).toEqual({
      options: ['$A', '$B'],
    });
  });

  it('skips undefined sources', () => {
    expect(mergeDeep([{ a: 'dsa' }, { a: 'dd', b: 1 }, undefined])).toEqual({ a: 'dd', b: 1 });
  });

  it('overrides property value with null from later source', () => {
    expect(mergeDeep([{ a: 'foo' }, { a: null }])).toEqual({ a: null });
  });

  it('overrides null property value with non-null from later source', () => {
    expect(mergeDeep([{ a: null }, { a: 'foo' }])).toEqual({ a: 'foo' });
  });

  it('overrides property value with an explicit undefined from later source', () => {
    const merged = mergeDeep([{ a: 'foo', b: 'bar' }, { a: undefined }]);
    expect('a' in merged).toBe(true);
    expect(merged.a).toBeUndefined();
    expect(merged.b).toEqual('bar');
  });

  it('leaves a property untouched when a later source omits it, distinct from an explicit undefined', () => {
    const merged = mergeDeep([{ a: 'foo', b: 'bar' }, { b: 'baz' }]);
    expect(merged.a).toEqual('foo');
    expect(merged.b).toEqual('baz');
  });

  it('respects empty objects', () => {
    expect(mergeDeep([{}])).toEqual({});
  });

  it('respects multiple empty objects', () => {
    expect(mergeDeep([{}, {}])).toEqual({});
  });

  it('preserves nested empty objects', () => {
    expect(mergeDeep([{ data: {} }, { data: {} }])).toEqual({ data: {} });
  });

  it('returns undefined when an empty sources array passed', () => {
    expect(mergeDeep([])).toEqual(undefined);
  });

  it('does not let an own __proto__ key from a source change the prototype of the output', () => {
    // json parsing makes __proto__ a real own enumerable key, unlike an object literal
    const payload = JSON.parse('{"nested":{"__proto__":{"polluted":"yes"}}}');
    const merged = mergeDeep([{ nested: { a: 1 } }, payload]);
    expect(merged.nested.a).toEqual(1);
    expect(merged.nested.polluted).toBeUndefined();
    expect(Object.getPrototypeOf(merged.nested)).toBe(Object.prototype);
  });

  it('does not walk into inherited constructor/prototype when merging', () => {
    const payload = JSON.parse('{"constructor":{"prototype":{"polluted":"yes"}}}');
    const merged = mergeDeep([{ a: 1 }, payload]);
    expect(merged.a).toEqual(1);
    expect(({} as any).polluted).toBeUndefined();
    expect(Object.prototype).not.toHaveProperty('polluted');
  });

  describe('deprecated positional boolean API', () => {
    it('still accepts respectPrototype as the second argument', () => {
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

    it('still accepts respectArrays / respectArrayLength positionally', () => {
      const x = { a: [1, 2, 5] };
      const y = { a: [3, 4] };
      expect(mergeDeep([x, y], false, true)).toEqual({ a: [1, 2, 5, 3, 4] });
    });

    it('still maps the 5th positional flag to non-enumerable symbols only', () => {
      const enumerableSym = Symbol('enumerable');
      const nonEnumerableSym = Symbol('annotation');
      const first: any = { a: 1, [enumerableSym]: 'visible' };
      Object.defineProperty(first, nonEnumerableSym, { value: 'annotated', writable: true });
      const second = { b: 2 };
      const merged = mergeDeep([first, second], false, false, false, true);
      expect(merged.a).toEqual(1);
      expect(merged.b).toEqual(2);
      expect(merged[enumerableSym]).toBeUndefined();
      expect(merged[nonEnumerableSym]).toEqual('annotated');
    });
  });
});
