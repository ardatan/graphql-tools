import { buildSchema, GraphQLScalarType, parse } from 'graphql';
import { execute, executeSync } from '../execute.js';

describe('completed list storage', () => {
  const schema = buildSchema('type Query { values: [Int] }');
  const document = parse('{ values }');

  it('does not inspect an input array length when its iterator does not', () => {
    const values = new Proxy([1, 2], {
      get(target, key, receiver) {
        if (key === 'length') throw new Error('Unexpected input length access');
        if (key === Symbol.iterator)
          return function* () {
            yield 1;
            yield 2;
          };
        return Reflect.get(target, key, receiver);
      },
    });
    expect(executeSync({ schema, document, rootValue: { values } })).toEqual({
      data: { values: [1, 2] },
    });
  });

  it('uses the yielded values instead of an array length hint', () => {
    const values = [1, 2, 3];
    values[Symbol.iterator] = function* () {
      yield 8;
      return undefined;
    };
    expect(executeSync({ schema, document, rootValue: { values } })).toEqual({
      data: { values: [8] },
    });
    values[Symbol.iterator] = function* () {
      yield 8;
      yield 9;
      yield 10;
      yield 11;
      return undefined;
    };
    expect(executeSync({ schema, document, rootValue: { values } })).toEqual({
      data: { values: [8, 9, 10, 11] },
    });
  });

  it('observes input growth during iteration without changing ownership', () => {
    const values = [1, 2];
    Object.defineProperty(values, 0, {
      get() {
        values.push(3);
        return 1;
      },
    });
    expect(executeSync({ schema, document, rootValue: { values } })).toEqual({
      data: { values: [1, 2, 3] },
    });
  });

  it('keeps frozen and sparse inputs independent of completed results', () => {
    const sparse = [1, 2, 3];
    delete sparse[1];
    const values = Object.freeze(sparse);
    const result = executeSync({ schema, document, rootValue: { values } });
    expect(result).toEqual({ data: { values: [1, null, 3] } });
    expect(values.length).toBe(3);
    expect(1 in values).toBe(false);
  });

  it('preserves nullable errors and indexes for promised items', async () => {
    const values = Object.freeze([Promise.resolve(1), Promise.reject(new Error('bad item')), 3]);
    expect(await execute({ schema, document, rootValue: { values } })).toMatchObject({
      data: { values: [1, null, 3] },
      errors: [{ message: 'bad item', path: ['values', 1] }],
    });
    expect(values[0]).toBeInstanceOf(Promise);
  });

  it('serializes custom leaf values exactly once', () => {
    const customSchema = buildSchema('scalar Value type Query { values: [Value] }');
    const type = customSchema.getType('Value');
    if (!(type instanceof GraphQLScalarType)) throw new Error('Expected scalar');
    const seen: unknown[] = [];
    type.serialize = value => {
      seen.push(value);
      return Number(value) * 2;
    };
    expect(
      executeSync({ schema: customSchema, document, rootValue: { values: [1, 2, 3] } }),
    ).toEqual({ data: { values: [2, 4, 6] } });
    expect(seen).toEqual([1, 2, 3]);
  });
});
