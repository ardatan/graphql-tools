import {
  GraphQLFieldConfig,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLString,
  parse,
  versionInfo,
} from 'graphql';
import { execute, executeSync } from '../execute.js';

const isGraphQL17 = versionInfo.major >= 17;

describe('Execute: resolve function', () => {
  function testSchema(testField: GraphQLFieldConfig<any, any>) {
    return new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          test: testField,
        },
      }),
    });
  }

  it('default function accesses properties', () => {
    const result = executeSync({
      schema: testSchema({ type: GraphQLString }),
      document: parse('{ test }'),
      rootValue: { test: 'testValue' },
    });

    expect(result).toEqual({
      data: {
        test: 'testValue',
      },
    });
  });

  it('default function treats Error-valued properties as field errors', () => {
    const AnyScalar = new GraphQLScalarType({
      name: 'Any',
      serialize: value => value,
    });

    const result = executeSync({
      schema: testSchema({ type: AnyScalar }),
      document: parse('{ test }'),
      rootValue: { test: new Error('per-field') },
    });

    expect(result).toEqual({
      data: { test: null },
      errors: [expect.objectContaining({ message: 'per-field', path: ['test'] })],
    });
  });

  it('default function treats Error-valued NonNull properties as field errors', () => {
    const result = executeSync({
      schema: testSchema({ type: new GraphQLNonNull(GraphQLString) }),
      document: parse('{ test }'),
      rootValue: { test: new Error('per-field-non-null') },
    });

    expect(result).toEqual({
      data: null,
      errors: [expect.objectContaining({ message: 'per-field-non-null', path: ['test'] })],
    });
  });

  it('default function adds schema coordinate for Error-valued properties when enabled', () => {
    const schema = testSchema({ type: GraphQLString });
    const document = parse('{ test }');
    const rootValue = { test: new Error('per-field') };

    expect(
      executeSync({
        schema,
        document,
        rootValue,
        schemaCoordinateInErrors: true,
      }).errors![0].coordinate,
    ).toBe('Query.test');

    expect(
      executeSync({
        schema,
        document,
        rootValue,
        schemaCoordinateInErrors: false,
      }).errors![0].coordinate,
    ).toBe(undefined);
  });

  it('default function still reports missing required arguments', () => {
    const result = executeSync({
      schema: testSchema({
        type: GraphQLString,
        args: {
          name: { type: new GraphQLNonNull(GraphQLString) },
        },
      }),
      document: parse('{ test }'),
      rootValue: { test: 'should-not-appear' },
    });

    expect(result).toEqual({
      data: { test: null },
      errors: [
        expect.objectContaining({
          message: isGraphQL17
            ? 'Argument "Query.test(name:)" of required type "String!" was not provided.'
            : 'Argument "name" of required type "String!" was not provided.',
          path: ['test'],
        }),
      ],
    });
  });

  it('default function reports missing required args before getter side effects', () => {
    let getterCalls = 0;
    const rootValue = {};
    Object.defineProperty(rootValue, 'test', {
      enumerable: true,
      get() {
        getterCalls += 1;
        throw new Error('getter should not run');
      },
    });

    const result = executeSync({
      schema: testSchema({
        type: GraphQLString,
        args: {
          name: { type: new GraphQLNonNull(GraphQLString) },
        },
      }),
      document: parse('{ test }'),
      rootValue,
    });

    expect(getterCalls).toBe(0);
    expect(result).toEqual({
      data: { test: null },
      errors: [
        expect.objectContaining({
          message: isGraphQL17
            ? 'Argument "Query.test(name:)" of required type "String!" was not provided.'
            : 'Argument "name" of required type "String!" was not provided.',
          path: ['test'],
        }),
      ],
    });
  });

  it('default function still reports null variables for non-null arguments', () => {
    const result = executeSync({
      schema: testSchema({
        type: GraphQLString,
        args: {
          name: { type: new GraphQLNonNull(GraphQLString) },
        },
      }),
      document: parse('query ($n: String = "x") { test(name: $n) }'),
      rootValue: { test: 'should-not-appear' },
      variableValues: { n: null },
    });

    expect(result).toEqual({
      data: { test: null },
      errors: [
        expect.objectContaining({
          message: expect.stringMatching(/non-null|Expected variable|Variable "\$n"/i),
          path: ['test'],
        }),
      ],
    });
  });

  it('default function handles rejected async leaf serialize as a field error', async () => {
    const AsyncFailScalar = new GraphQLScalarType({
      name: 'AsyncFail',
      serialize: () => Promise.reject(new Error('async-serialize')),
    });

    const result = await execute({
      schema: testSchema({ type: AsyncFailScalar }),
      document: parse('{ test }'),
      rootValue: { test: 'value' },
    });

    expect(result).toEqual({
      data: { test: null },
      errors: [expect.objectContaining({ message: 'async-serialize', path: ['test'] })],
    });
  });

  it('default function does not double-serialize async leaf values', async () => {
    let serializeCalls = 0;
    const AsyncOnceScalar = new GraphQLScalarType({
      name: 'AsyncOnce',
      serialize: value => {
        serializeCalls += 1;
        return Promise.resolve(`s:${String(value)}`);
      },
    });

    const result = await execute({
      schema: testSchema({ type: AsyncOnceScalar }),
      document: parse('{ test }'),
      rootValue: { test: 'x' },
    });

    expect(serializeCalls).toBe(1);
    expect(result).toEqual({ data: { test: 's:x' } });
  });

  it('default function calls methods', () => {
    const rootValue = {
      _secret: 'secretValue',
      test() {
        return this._secret;
      },
    };

    const result = executeSync({
      schema: testSchema({ type: GraphQLString }),
      document: parse('{ test }'),
      rootValue,
    });
    expect(result).toEqual({
      data: {
        test: 'secretValue',
      },
    });
  });

  it('default function passes args and context', () => {
    class Adder {
      _num: number;

      constructor(num: number) {
        this._num = num;
      }

      test(args: { addend1: number }, context: { addend2: number }) {
        return this._num + args.addend1 + context.addend2;
      }
    }
    const rootValue = new Adder(700);

    const schema = testSchema({
      type: GraphQLInt,
      args: {
        addend1: { type: GraphQLInt },
      },
    });
    const contextValue = { addend2: 9 };
    const document = parse('{ test(addend1: 80) }');

    const result = executeSync({ schema, document, rootValue, contextValue });
    expect(result).toEqual({
      data: { test: 789 },
    });
  });

  it('uses provided resolve function', () => {
    const schema = testSchema({
      type: GraphQLString,
      args: {
        aStr: { type: GraphQLString },
        aInt: { type: GraphQLInt },
      },
      resolve: (source, args) => JSON.stringify([source, args]),
    });

    function executeQuery(query: string, rootValue?: unknown) {
      const document = parse(query);
      return executeSync({ schema, document, rootValue });
    }

    expect(executeQuery('{ test }')).toEqual({
      data: {
        test: '[null,{}]',
      },
    });

    expect(executeQuery('{ test }', 'Source!')).toEqual({
      data: {
        test: '["Source!",{}]',
      },
    });

    expect(executeQuery('{ test(aStr: "String!") }', 'Source!')).toEqual({
      data: {
        test: '["Source!",{"aStr":"String!"}]',
      },
    });

    expect(executeQuery('{ test(aInt: -123, aStr: "String!") }', 'Source!')).toEqual({
      data: {
        test: '["Source!",{"aStr":"String!","aInt":-123}]',
      },
    });
  });
});
