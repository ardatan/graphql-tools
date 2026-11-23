/**
 * R34: dual-mode classic parity locks for CR f26 findings.
 * Classic = buildExecutionContext(..., null) + executeImpl (no plan).
 */
import {
  GraphQLError,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLString,
  parse,
} from 'graphql';
import {
  buildExecutionContext,
  CRITICAL_ERROR,
  execute,
  executeImpl,
  type SingularExecutionResult,
} from '../../execute.js';
import { compileExecutionPlan, isExecutionPlan } from '../../plan.js';

async function executeClassic(
  args: Parameters<typeof execute>[0],
): Promise<SingularExecutionResult> {
  const ctx = buildExecutionContext(args, null);
  if (!('schema' in ctx)) {
    return { errors: [...ctx] };
  }
  const result = await executeImpl(ctx);
  return result as SingularExecutionResult;
}

function singular(r: unknown): SingularExecutionResult {
  expect(r).toBeDefined();
  return r as SingularExecutionResult;
}

describe('R34 classic parity (CR f26 reds)', () => {
  it('M5 callable thenable from list method', async () => {
    const User = new GraphQLObjectType({
      name: 'User',
      fields: { id: { type: GraphQLString } },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: { users: { type: new GraphQLList(User) } },
      }),
    });
    const document = parse('{ users { id } }');
    const thenableFn = Object.assign(
      function () {
        return 'should not call';
      },
      {
        then(onFulfilled: (v: unknown) => unknown) {
          return Promise.resolve(onFulfilled([{ id: '1' }]));
        },
      },
    );
    const rootValue = {
      users() {
        return thenableFn;
      },
    };
    const planned = singular(await execute({ schema, document, rootValue }));
    const classic = singular(await executeClassic({ schema, document, rootValue }));
    expect(planned).toEqual(classic);
  });

  it('M4 Major isTypeOf after promised item fulfills', async () => {
    const User = new GraphQLObjectType({
      name: 'User',
      fields: { id: { type: GraphQLString } },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: { users: { type: new GraphQLList(User) } },
      }),
    });
    const document = parse('{ users { id } }');
    const plan = compileExecutionPlan({ schema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    let resolveItem!: (v: unknown) => void;
    const pending = new Promise(r => {
      resolveItem = r;
    });
    const plannedP = execute({ plan: plan as never, rootValue: { users: [pending] } });
    User.isTypeOf = () => false;
    resolveItem({ id: '1' });
    const planned = singular(await plannedP);
    delete (User as { isTypeOf?: unknown }).isTypeOf;

    User.isTypeOf = () => false;
    const classic = singular(
      await executeClassic({
        schema,
        document,
        rootValue: { users: [Promise.resolve({ id: '1' })] },
      }),
    );
    delete (User as { isTypeOf?: unknown }).isTypeOf;
    expect(classic.data).toEqual({ users: [null] });
    expect(planned).toEqual(classic);
  });

  it('M3 Major NonNull null thenable: parity + no UHR', async () => {
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          values: {
            type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLInt))),
          },
        },
      }),
    });
    const document = parse('{ values }');
    let plannedTail = 0;
    let classicTail = 0;
    const makeRoot = (onTail: () => void) => ({
      values: {
        get 0() {
          return Promise.resolve(null);
        },
        get 1() {
          onTail();
          return Promise.reject(new Error('tail-rej'));
        },
        get length() {
          return 2;
        },
        [Symbol.iterator]: Array.prototype[Symbol.iterator],
      },
    });
    const uhrs: unknown[] = [];
    const onUHR = (r: unknown) => {
      uhrs.push(r);
    };
    process.on('unhandledRejection', onUHR);
    try {
      const planned = singular(
        await execute({
          schema,
          document,
          rootValue: makeRoot(() => {
            plannedTail += 1;
          }),
        }),
      );
      await new Promise(r => setImmediate(r));
      const classic = singular(
        await executeClassic({
          schema,
          document,
          rootValue: makeRoot(() => {
            classicTail += 1;
          }),
        }),
      );
      await new Promise(r => setImmediate(r));
      expect(planned).toEqual(classic);
      expect(plannedTail).toBe(classicTail);
      expect(uhrs).toEqual([]);
    } finally {
      process.off('unhandledRejection', onUHR);
    }
  });

  it('M6 Minor null fulfilled serializer promise on [Custom!]', async () => {
    const Custom = new GraphQLScalarType({
      name: 'CustomNullSer',
      serialize() {
        return Promise.resolve(null);
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          values: { type: new GraphQLList(new GraphQLNonNull(Custom)) },
        },
      }),
    });
    const document = parse('{ values }');
    const rootValue = { values: [1] };
    const planned = singular(await execute({ schema, document, rootValue }));
    const classic = singular(await executeClassic({ schema, document, rootValue }));
    expect(planned).toEqual(classic);
  });

  it('M1 Major sync CRITICAL serialize on promised primitive item', async () => {
    const Custom = new GraphQLScalarType({
      name: 'CustomCrit',
      serialize() {
        throw new GraphQLError('boom', {
          extensions: { [CRITICAL_ERROR]: true },
        });
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          values: { type: new GraphQLList(Custom) },
          ok: { type: GraphQLString, resolve: () => 'yes' },
        },
      }),
    });
    const document = parse('{ values ok }');
    const rootValue = { values: [Promise.resolve(1)] };
    const planned = singular(await execute({ schema, document, rootValue }));
    const classic = singular(await executeClassic({ schema, document, rootValue }));
    expect(planned).toEqual(classic);
  });

  it('M8 Major nested @include nulls only nullable nested field', async () => {
    const Profile = new GraphQLObjectType({
      name: 'Profile',
      fields: { name: { type: GraphQLString } },
    });
    const User = new GraphQLObjectType({
      name: 'User',
      fields: {
        profile: { type: Profile },
        label: { type: GraphQLString },
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: { user: { type: User } },
      }),
    });
    const document = parse(
      'query ($show: Boolean = true) { user { profile { name @include(if: $show) } label } }',
    );
    const rootValue = {
      user: { profile: { name: 'n' }, label: 'L' },
    };
    const vars = { show: null };
    const planned = singular(await execute({ schema, document, rootValue, variableValues: vars }));
    const classic = singular(
      await executeClassic({ schema, document, rootValue, variableValues: vars }),
    );
    expect(planned).toEqual(classic);
    expect(planned.errors?.[0]?.path).toEqual(['user', 'profile']);
    expect(planned.data).toEqual({ user: { profile: null, label: 'L' } });
  });

  it('M8b Major NonNull nested @include path matches classic', async () => {
    const Profile = new GraphQLObjectType({
      name: 'Profile',
      fields: { name: { type: GraphQLString } },
    });
    const User = new GraphQLObjectType({
      name: 'User',
      fields: {
        profile: { type: new GraphQLNonNull(Profile) },
        label: { type: GraphQLString },
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: { user: { type: User } },
      }),
    });
    const document = parse(
      'query ($show: Boolean = true) { user { profile { name @include(if: $show) } label } }',
    );
    const rootValue = {
      user: { profile: { name: 'n' }, label: 'L' },
    };
    const vars = { show: null };
    // Classic first (true classic = buildExecutionContext(..., null) + executeImpl).
    const classic = singular(
      await executeClassic({ schema, document, rootValue, variableValues: vars }),
    );
    const planned = singular(await execute({ schema, document, rootValue, variableValues: vars }));
    expect(classic.errors?.[0]?.path).toEqual(['user', 'profile']);
    expect(planned.errors?.[0]?.path).toEqual(['user', 'profile']);
    expect(planned.data).toEqual(classic.data);
    expect(planned.data).toEqual({ user: null });
    expect(JSON.stringify(planned.errors)).toEqual(JSON.stringify(classic.errors));
  });
});
