import { inspect } from '../inspect.js';

describe('inspect', () => {
  it('undefined', () => {
    expect(inspect(undefined)).toEqual('undefined');
  });

  it('null', () => {
    expect(inspect(null)).toEqual('null');
  });

  it('boolean', () => {
    expect(inspect(true)).toEqual('true');
    expect(inspect(false)).toEqual('false');
  });

  it('string', () => {
    expect(inspect('')).toEqual('""');
    expect(inspect('abc')).toEqual('"abc"');
    expect(inspect('"')).toEqual('"\\""');
  });

  it('number', () => {
    expect(inspect(0.0)).toEqual('0');
    expect(inspect(3.14)).toEqual('3.14');
    expect(inspect(NaN)).toEqual('NaN');
    expect(inspect(Infinity)).toEqual('Infinity');
    expect(inspect(-Infinity)).toEqual('-Infinity');
  });

  it('function', () => {
    const unnamedFuncStr = inspect(
      // Never called and used as a placeholder
      /* c8 ignore next */
      () => {}
    );
    expect(unnamedFuncStr).toEqual('[function]');

    // Never called and used as a placeholder
    /* c8 ignore next 3 */
    function namedFunc() {}
    expect(inspect(namedFunc)).toEqual('[function namedFunc]');
  });

  it('array', () => {
    expect(inspect([])).toEqual('[]');
    expect(inspect([null])).toEqual('[null]');
    expect(inspect([1, NaN])).toEqual('[1, NaN]');
    expect(inspect([['a', 'b'], 'c'])).toEqual('[["a", "b"], "c"]');

    expect(inspect([[[]]])).toEqual('[[[]]]');
    expect(inspect([[['a']]])).toEqual('[[[Array]]]');

    expect(inspect([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])).toEqual('[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]');

    expect(inspect([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toEqual('[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, ... 1 more item]');

    expect(inspect([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])).toEqual('[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, ... 2 more items]');
  });

  it('object', () => {
    expect(inspect({})).toEqual('{}');
    expect(inspect({ a: 1 })).toEqual('{ a: 1 }');
    expect(inspect({ a: 1, b: 2 })).toEqual('{ a: 1, b: 2 }');
    expect(inspect({ array: [null, 0] })).toEqual('{ array: [null, 0] }');

    expect(inspect({ a: { b: {} } })).toEqual('{ a: { b: {} } }');
    expect(inspect({ a: { b: { c: 1 } } })).toEqual('{ a: { b: [Object] } }');

    const map = Object.create(null);
    map.a = true;
    map.b = null;
    expect(inspect(map)).toEqual('{ a: true, b: null }');
  });

  it('use toJSON if provided', () => {
    const object = {
      toJSON() {
        return '<json value>';
      },
    };

    expect(inspect(object)).toEqual('<json value>');
  });

  it('handles toJSON that return `this` should work', () => {
    const object = {
      toJSON() {
        return this;
      },
    };

    expect(inspect(object)).toEqual('{ toJSON: [function toJSON] }');
  });

  it('handles toJSON returning object values', () => {
    const object = {
      toJSON() {
        return { json: 'value' };
      },
    };

    expect(inspect(object)).toEqual('{ json: "value" }');
  });

  it('handles toJSON function that uses this', () => {
    const object = {
      str: 'Hello World!',
      toJSON() {
        return this.str;
      },
    };

    expect(inspect(object)).toEqual('Hello World!');
  });

  it('detect circular objects', () => {
    const obj: { [name: string]: unknown } = {};
    obj['self'] = obj;
    obj['deepSelf'] = { self: obj };

    expect(inspect(obj)).toEqual('{ self: [Circular], deepSelf: { self: [Circular] } }');

    const array: any = [];
    array[0] = array;
    array[1] = [array];

    expect(inspect(array)).toEqual('[[Circular], [[Circular]]]');

    const mixed: any = { array: [] };
    mixed.array[0] = mixed;

    expect(inspect(mixed)).toEqual('{ array: [[Circular]] }');

    const customA = {
      toJSON: () => customB,
    };

    const customB = {
      toJSON: () => customA,
    };

    expect(inspect(customA)).toEqual('[Circular]');
  });

  it('Use class names for the short form of an object', () => {
    class Foo {
      foo: string;

      constructor() {
        this.foo = 'bar';
      }
    }

    expect(inspect([[new Foo()]])).toEqual('[[[Foo]]]');

    class Foo2 {
      foo: string;

      [Symbol.toStringTag] = 'Bar';

      constructor() {
        this.foo = 'bar';
      }
    }
    expect(inspect([[new Foo2()]])).toEqual('[[[Bar]]]');

    const objectWithoutClassName = new (function (this: any) {
      this.foo = 1;
    } as any)();
    expect(inspect([[objectWithoutClassName]])).toEqual('[[[Object]]]');
  });
});
