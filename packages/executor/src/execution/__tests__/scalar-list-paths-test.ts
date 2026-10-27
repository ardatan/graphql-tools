import { buildSchema, GraphQLScalarType, parse } from 'graphql';
import { execute } from '../execute.js';

describe('scalar list completion paths', () => {
  function setup(nullable = true) {
    const schema = buildSchema(`scalar Value type Query { values: [Value${nullable ? '' : '!'}] }`);
    const type = schema.getType('Value');
    if (!(type instanceof GraphQLScalarType)) throw new Error('Expected scalar');
    return { schema, type, document: parse('{ alias: values }') };
  }

  it('serializes every synchronous value once and locates a nullable failure', async () => {
    const { schema, type, document } = setup();
    const seen: unknown[] = [];
    type.serialize = value => {
      seen.push(value);
      if (value === 2) throw new Error('bad scalar');
      return Number(value) * 2;
    };
    expect(await execute({ schema, document, rootValue: { values: [1, 2, 3] } })).toMatchObject({
      data: { alias: [2, null, 6] },
      errors: [{ message: 'bad scalar', path: ['alias', 1] }],
    });
    expect(seen).toEqual([1, 2, 3]);
  });

  it('preserves asynchronous serialization and stable error indexes', async () => {
    const { schema, type, document } = setup();
    type.serialize = value =>
      value === 1 ? Promise.resolve(2) : Promise.reject(new Error(`bad ${value}`));
    expect(await execute({ schema, document, rootValue: { values: [1, 2, 3] } })).toMatchObject({
      data: { alias: [2, null, null] },
      errors: [
        { message: 'bad 2', path: ['alias', 1] },
        { message: 'bad 3', path: ['alias', 2] },
      ],
    });
  });

  it('bubbles synchronous non-null failures and closes the iterator', async () => {
    const { schema, type, document } = setup(false);
    let closed = false;
    const seen: unknown[] = [];
    type.serialize = value => {
      seen.push(value);
      if (value === 2) throw new Error('bad scalar');
      return value;
    };
    function* values() {
      try {
        yield 1;
        yield 2;
        yield 3;
      } finally {
        closed = true;
      }
    }
    expect(await execute({ schema, document, rootValue: { values: values() } })).toMatchObject({
      data: { alias: null },
      errors: [{ message: 'bad scalar', path: ['alias', 1] }],
    });
    expect(seen).toEqual([1, 2]);
    expect(closed).toBe(true);
  });

  it('bubbles asynchronous non-null serialization failures at their original index', async () => {
    const { schema, type, document } = setup(false);
    type.serialize = value =>
      value === 2 ? Promise.reject(new Error('bad scalar')) : Promise.resolve(value);
    expect(await execute({ schema, document, rootValue: { values: [1, 2, 3] } })).toMatchObject({
      data: { alias: null },
      errors: [{ message: 'bad scalar', path: ['alias', 1] }],
    });
  });

  it('retains the existing null and promised input behavior', async () => {
    const { schema, type, document } = setup();
    const seen: unknown[] = [];
    type.serialize = value => {
      seen.push(value);
      return Number(value) * 2;
    };
    const values = Object.freeze([null, Promise.resolve(2), undefined, 3]);
    expect(await execute({ schema, document, rootValue: { values } })).toEqual({
      data: { alias: [null, 4, null, 6] },
    });
    expect(seen).toEqual([3, 2]);
  });

  it('reads a thenable input getter only for classification and invocation', async () => {
    const { schema, document } = setup();
    let reads = 0;
    const promise = Promise.resolve(2);
    const then = promise.then.bind(promise);
    const item = {
      get then() {
        reads++;
        return then;
      },
    };
    expect(await execute({ schema, document, rootValue: { values: [item] } })).toEqual({
      data: { alias: [2] },
    });
    expect(reads).toBe(2);
  });
});
