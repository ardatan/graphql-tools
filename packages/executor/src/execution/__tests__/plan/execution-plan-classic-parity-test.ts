/**
 * Classic vs planned dual-mode parity locks (R34–R39 CR rounds).
 * Behavior-identical consolidation of execution-plan-r34…r39 test files.
 */
import {
  GraphQLBoolean,
  GraphQLError,
  GraphQLID,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLString,
  GraphQLUnionType,
  Kind,
  parse,
  versionInfo,
} from 'graphql';
import { isAsyncIterable } from '@graphql-tools/utils';
import {
  buildExecutionContext,
  CRITICAL_ERROR,
  execute,
  executeImpl,
  isExecutionPlanningEnabled,
  setExecutionPlanningEnabled,
  subscribe,
  type SingularExecutionResult,
} from '../../execute.js';
import { compileExecutionPlan, isExecutionPlan } from '../../plan.js';

// --- from execution-plan-r34-parity-test.ts ---
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

/** Planned side of a classic/planned comparison — always force a compiled plan. */
async function executePlanned(args: {
  schema: Parameters<typeof compileExecutionPlan>[0]['schema'];
  document: Parameters<typeof compileExecutionPlan>[0]['document'];
  rootValue?: unknown;
  variableValues?: Record<string, unknown> | null;
}): Promise<SingularExecutionResult> {
  const plan = compileExecutionPlan({ schema: args.schema, document: args.document });
  expect(isExecutionPlan(plan)).toBe(true);
  return singular(
    await execute({
      plan: plan as never,
      rootValue: args.rootValue,
      variableValues: args.variableValues ?? undefined,
    }),
  );
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
    const planned = singular(await executePlanned({ schema, document, rootValue }));
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
        await executePlanned({
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
    const planned = singular(await executePlanned({ schema, document, rootValue }));
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
    const planned = singular(await executePlanned({ schema, document, rootValue }));
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
    const planned = singular(
      await executePlanned({ schema, document, rootValue, variableValues: vars }),
    );
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
    const planned = singular(
      await executePlanned({ schema, document, rootValue, variableValues: vars }),
    );
    expect(classic.errors?.[0]?.path).toEqual(['user', 'profile']);
    expect(planned.errors?.[0]?.path).toEqual(['user', 'profile']);
    expect(planned.data).toEqual(classic.data);
    expect(planned.data).toEqual({ user: null });
    expect(JSON.stringify(planned.errors)).toEqual(JSON.stringify(classic.errors));
  });
});

// --- from execution-plan-r35-triage3-test.ts ---
describe('R35 classic parity (CR triage3)', () => {
  it('4700986037 object-list method reuses first args read', async () => {
    let coerceCount = 0;
    const CountedInt = new GraphQLScalarType({
      name: 'CountedInt',
      serialize: v => v,
      parseValue: v => {
        coerceCount += 1;
        return v;
      },
      parseLiteral: ast => {
        coerceCount += 1;
        if (ast.kind !== Kind.INT) {
          throw new Error('bad');
        }
        return parseInt(ast.value, 10);
      },
    });
    const Item = new GraphQLObjectType({
      name: 'Item',
      fields: { id: { type: GraphQLString } },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          items: {
            type: new GraphQLList(Item),
            args: { n: { type: CountedInt } },
          },
        },
      }),
    });
    const document = parse('{ items(n: 1) { id } }');
    const rootValue = {
      items(args: { n: number }) {
        return [{ id: String(args.n) }];
      },
    };

    coerceCount = 0;
    const classic = singular(await executeClassic({ schema, document, rootValue }));
    const classicCoerce = coerceCount;

    const plan = compileExecutionPlan({ schema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    await execute({ schema, document, rootValue, plan: plan as any });
    coerceCount = 0;
    const planned = singular(await execute({ schema, document, rootValue, plan: plan as any }));

    expect(classic.data).toEqual({ items: [{ id: '1' }] });
    expect(planned.data).toEqual(classic.data);
    expect(classicCoerce).toBe(1);
    expect(coerceCount).toBe(1);
  });

  it('4700986045 live child resolver after compile (list item)', async () => {
    const Item = new GraphQLObjectType({
      name: 'Item',
      fields: { id: { type: GraphQLString } },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: { items: { type: new GraphQLList(Item) } },
      }),
    });
    const document = parse('{ items { id } }');
    const rootValue = { items: [{ id: 'raw' }] };
    const plan = compileExecutionPlan({ schema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    Item.getFields()['id'].resolve = () => 'x';

    const classic = singular(await executeClassic({ schema, document, rootValue }));
    const planned = singular(await execute({ schema, document, rootValue, plan: plan as any }));
    expect(classic.data).toEqual({ items: [{ id: 'x' }] });
    expect(planned.data).toEqual(classic.data);
  });

  it('4700986045 live child resolver after compile (nested object)', async () => {
    const User = new GraphQLObjectType({
      name: 'User',
      fields: { id: { type: GraphQLString } },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: { user: { type: User } },
      }),
    });
    const document = parse('{ user { id } }');
    const rootValue = { user: { id: 'raw' } };
    const plan = compileExecutionPlan({ schema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    User.getFields()['id'].resolve = () => 'live';

    const classic = singular(await executeClassic({ schema, document, rootValue }));
    const planned = singular(await execute({ schema, document, rootValue, plan: plan as any }));
    expect(classic.data).toEqual({ user: { id: 'live' } });
    expect(planned.data).toEqual(classic.data);
  });

  it('4700986050 NonNull child nulls nearest nullable profile in list item', async () => {
    const Profile = new GraphQLObjectType({
      name: 'Profile',
      fields: { id: { type: new GraphQLNonNull(GraphQLID) } },
    });
    const Item = new GraphQLObjectType({
      name: 'Item',
      fields: { profile: { type: Profile } },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: { items: { type: new GraphQLList(Item) } },
      }),
    });
    const document = parse('{ items { profile { id } } }');
    const rootValue = {
      items: [
        {
          get profile() {
            return {
              get id() {
                throw new Error('boom');
              },
            };
          },
        },
      ],
    };

    const classic = singular(await executeClassic({ schema, document, rootValue }));
    const planned = singular(await executePlanned({ schema, document, rootValue }));
    expect(classic.data).toEqual({ items: [{ profile: null }] });
    expect(classic.errors?.[0]?.path).toEqual(['items', 0, 'profile', 'id']);
    expect(planned.data).toEqual(classic.data);
    expect(planned.errors?.[0]?.path).toEqual(classic.errors?.[0]?.path);
  });

  it('4700986050 NonNull child nulls nearest nullable profile; preserves siblings', async () => {
    const Profile = new GraphQLObjectType({
      name: 'Profile',
      fields: { id: { type: new GraphQLNonNull(GraphQLID) } },
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
    const document = parse('{ user { profile { id } label } }');
    const rootValue = {
      user: {
        label: 'L',
        get profile() {
          return {
            get id() {
              throw new Error('boom');
            },
          };
        },
      },
    };

    const classic = singular(await executeClassic({ schema, document, rootValue }));
    const planned = singular(await executePlanned({ schema, document, rootValue }));
    expect(classic.data).toEqual({ user: { profile: null, label: 'L' } });
    expect(classic.errors?.[0]?.path).toEqual(['user', 'profile', 'id']);
    expect(planned.data).toEqual(classic.data);
    expect(planned.errors?.[0]?.path).toEqual(classic.errors?.[0]?.path);
  });
});

// --- from execution-plan-r36-cr-e240-test.ts ---
describe('R36 classic parity (CR e240)', () => {
  it('4701777520 async reject under nullable nested keeps siblings', async () => {
    const Profile = new GraphQLObjectType({
      name: 'Profile',
      fields: { id: { type: new GraphQLNonNull(GraphQLID) } },
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
    const document = parse('{ user { profile { id } label } }');
    const rootValue = {
      user: {
        label: 'L',
        profile: { id: Promise.reject(new Error('boom')) },
      },
    };
    const uhrs: unknown[] = [];
    const onUHR = (r: unknown) => {
      uhrs.push(r);
    };
    process.on('unhandledRejection', onUHR);
    try {
      const classic = singular(await executeClassic({ schema, document, rootValue }));
      const planned = singular(await executePlanned({ schema, document, rootValue }));
      expect(classic.data).toEqual({ user: { profile: null, label: 'L' } });
      expect(classic.errors?.[0]?.path).toEqual(['user', 'profile', 'id']);
      expect(planned.data).toEqual(classic.data);
      expect(planned.errors?.[0]?.path).toEqual(classic.errors?.[0]?.path);
      await new Promise<void>(resolve => {
        setImmediate(resolve);
      });
      expect(uhrs).toEqual([]);
    } finally {
      process.off('unhandledRejection', onUHR);
    }
  });

  it('4701777511 late-installed isTypeOf on nested object after compile', async () => {
    const Profile = new GraphQLObjectType({
      name: 'Profile',
      fields: { id: { type: GraphQLID } },
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
    const document = parse('{ user { profile { id } label } }');
    const rootValue = { user: { profile: { id: '1' }, label: 'L' } };
    const plan = compileExecutionPlan({ schema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    Profile.isTypeOf = () => false;

    const classic = singular(await executeClassic({ schema, document, rootValue }));
    const planned = singular(await execute({ schema, document, rootValue, plan: plan as any }));
    expect(classic.data).toEqual({ user: { profile: null, label: 'L' } });
    expect(classic.errors?.[0]?.path).toEqual(['user', 'profile']);
    expect(planned.data).toEqual(classic.data);
    expect(planned.errors?.[0]?.path).toEqual(classic.errors?.[0]?.path);
  });

  it('4701777525 per-item isTypeOf installed by first list item getter', async () => {
    const document = parse('{ items { id } }');

    const ItemC = new GraphQLObjectType({
      name: 'Item',
      fields: { id: { type: GraphQLString } },
    });
    const schemaC = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: { items: { type: new GraphQLList(ItemC) } },
      }),
    });
    let installedC = false;
    const rootC = {
      items: [
        {
          get id() {
            if (!installedC) {
              ItemC.isTypeOf = () => false;
              installedC = true;
            }
            return 'a';
          },
        },
        { id: 'b' },
      ],
    };
    const classic = singular(await executeClassic({ schema: schemaC, document, rootValue: rootC }));

    const ItemP = new GraphQLObjectType({
      name: 'Item',
      fields: { id: { type: GraphQLString } },
    });
    const schemaP = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: { items: { type: new GraphQLList(ItemP) } },
      }),
    });
    const planP = compileExecutionPlan({ schema: schemaP, document });
    expect(isExecutionPlan(planP)).toBe(true);
    expect(ItemP.isTypeOf).toBeUndefined();
    let installedP = false;
    const rootP = {
      items: [
        {
          get id() {
            if (!installedP) {
              ItemP.isTypeOf = () => false;
              installedP = true;
            }
            return 'a';
          },
        },
        { id: 'b' },
      ],
    };
    const planned = singular(
      await execute({
        schema: schemaP,
        document,
        rootValue: rootP,
        plan: planP as any,
      }),
    );

    expect(classic.data).toEqual({ items: [{ id: 'a' }, null] });
    expect(classic.errors?.[0]?.path).toEqual(['items', 1]);
    expect(planned.data).toEqual(classic.data);
    expect(planned.errors?.[0]?.path).toEqual(classic.errors?.[0]?.path);
  });
});

// --- from execution-plan-r37-cr-pushback-test.ts ---
describe('R37 classic parity (CR pushbacks 7511/7525/1868)', () => {
  it('4701777511 plain list nested: late isTypeOf on item nested object', async () => {
    const document = parse('{ items { profile { id } label } }');

    const ProfileC = new GraphQLObjectType({
      name: 'Profile',
      fields: { id: { type: GraphQLID } },
    });
    const ItemC = new GraphQLObjectType({
      name: 'Item',
      fields: {
        profile: { type: ProfileC },
        label: { type: GraphQLString },
      },
    });
    const schemaC = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: { items: { type: new GraphQLList(ItemC) } },
      }),
    });
    ProfileC.isTypeOf = () => false;
    const rootC = { items: [{ profile: { id: '1' }, label: 'L' }] };

    const ProfileP = new GraphQLObjectType({
      name: 'Profile',
      fields: { id: { type: GraphQLID } },
    });
    const ItemP = new GraphQLObjectType({
      name: 'Item',
      fields: {
        profile: { type: ProfileP },
        label: { type: GraphQLString },
      },
    });
    const schemaP = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: { items: { type: new GraphQLList(ItemP) } },
      }),
    });
    const planP = compileExecutionPlan({ schema: schemaP, document });
    expect(isExecutionPlan(planP)).toBe(true);
    ProfileP.isTypeOf = () => false;
    const rootP = { items: [{ profile: { id: '1' }, label: 'L' }] };

    const classic = singular(await executeClassic({ schema: schemaC, document, rootValue: rootC }));
    const planned = singular(
      await execute({ schema: schemaP, document, rootValue: rootP, plan: planP as any }),
    );
    expect(classic.data).toEqual({ items: [{ profile: null, label: 'L' }] });
    expect(classic.errors?.[0]?.path).toEqual(['items', 0, 'profile']);
    expect(planned.data).toEqual(classic.data);
    expect(planned.errors?.[0]?.path).toEqual(classic.errors?.[0]?.path);
  });

  it('4701777511 one-shot nested getter: retain first read on live isTypeOf decline', async () => {
    const document = parse('{ user { profile { id } label } }');

    const ProfileC = new GraphQLObjectType({
      name: 'Profile',
      fields: { id: { type: GraphQLID } },
    });
    const UserC = new GraphQLObjectType({
      name: 'User',
      fields: {
        profile: { type: ProfileC },
        label: { type: GraphQLString },
      },
    });
    const schemaC = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: { user: { type: UserC } },
      }),
    });
    ProfileC.isTypeOf = () => false;
    let readsC = 0;
    const rootC = {
      user: {
        label: 'L',
        get profile() {
          readsC++;
          if (readsC === 1) {
            return { id: '1' };
          }
          return null;
        },
      },
    };

    const ProfileP = new GraphQLObjectType({
      name: 'Profile',
      fields: { id: { type: GraphQLID } },
    });
    const UserP = new GraphQLObjectType({
      name: 'User',
      fields: {
        profile: { type: ProfileP },
        label: { type: GraphQLString },
      },
    });
    const schemaP = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: { user: { type: UserP } },
      }),
    });
    const planP = compileExecutionPlan({ schema: schemaP, document });
    expect(isExecutionPlan(planP)).toBe(true);
    ProfileP.isTypeOf = () => false;
    let readsP = 0;
    const rootP = {
      user: {
        label: 'L',
        get profile() {
          readsP++;
          if (readsP === 1) {
            return { id: '1' };
          }
          return null;
        },
      },
    };

    const classic = singular(await executeClassic({ schema: schemaC, document, rootValue: rootC }));
    const planned = singular(
      await execute({ schema: schemaP, document, rootValue: rootP, plan: planP as any }),
    );
    expect(classic.data).toEqual({ user: { profile: null, label: 'L' } });
    expect(classic.errors?.[0]?.path).toEqual(['user', 'profile']);
    expect(readsC).toBe(1);
    expect(planned.data).toEqual(classic.data);
    expect(planned.errors?.[0]?.path).toEqual(classic.errors?.[0]?.path);
    expect(readsP).toBe(1);
  });

  it('4701891868 stashed pending leaf: Promise id + mid-item isTypeOf keeps index 0', async () => {
    const document = parse('{ items { id } }');

    const ItemC = new GraphQLObjectType({
      name: 'Item',
      fields: { id: { type: GraphQLString } },
    });
    const schemaC = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: { items: { type: new GraphQLList(ItemC) } },
      }),
    });
    let installedC = false;
    const rootC = {
      items: [
        {
          get id() {
            if (!installedC) {
              ItemC.isTypeOf = () => false;
              installedC = true;
            }
            return Promise.resolve('a');
          },
        },
        { id: 'b' },
      ],
    };
    const classic = singular(await executeClassic({ schema: schemaC, document, rootValue: rootC }));

    const ItemP = new GraphQLObjectType({
      name: 'Item',
      fields: { id: { type: GraphQLString } },
    });
    const schemaP = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: { items: { type: new GraphQLList(ItemP) } },
      }),
    });
    const planP = compileExecutionPlan({ schema: schemaP, document });
    expect(isExecutionPlan(planP)).toBe(true);
    expect(ItemP.isTypeOf).toBeUndefined();
    let installedP = false;
    const rootP = {
      items: [
        {
          get id() {
            if (!installedP) {
              ItemP.isTypeOf = () => false;
              installedP = true;
            }
            return Promise.resolve('a');
          },
        },
        { id: 'b' },
      ],
    };
    const planned = singular(
      await execute({
        schema: schemaP,
        document,
        rootValue: rootP,
        plan: planP as any,
      }),
    );

    expect(classic.data).toEqual({ items: [{ id: 'a' }, null] });
    expect(classic.errors?.[0]?.path).toEqual(['items', 1]);
    expect(planned.data).toEqual(classic.data);
    expect(planned.errors?.[0]?.path).toEqual(classic.errors?.[0]?.path);
  });
});

// --- from execution-plan-r38-cr-stash-test.ts ---
describe('R38 classic parity (CR stash / method isTypeOf)', () => {
  it('4702060963 thenable added mid-item keeps stash at index 0', async () => {
    const document = parse('{ items { id } }');

    const ItemC = new GraphQLObjectType({
      name: 'Item',
      fields: { id: { type: GraphQLString } },
    });
    const schemaC = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: { items: { type: new GraphQLList(ItemC) } },
      }),
    });
    let installedC = false;
    const item0C: { id: unknown; then?: unknown } = {
      get id() {
        if (!installedC) {
          ItemC.isTypeOf = () => false;
          installedC = true;
          (item0C as { then?: unknown }).then = (onFulfilled: unknown, onRejected: unknown) =>
            Promise.resolve({ id: 'a' }).then(onFulfilled as any, onRejected as any);
        }
        return Promise.resolve('a');
      },
    };
    const classic = singular(
      await executeClassic({
        schema: schemaC,
        document,
        rootValue: { items: [item0C, { id: 'b' }] },
      }),
    );

    const ItemP = new GraphQLObjectType({
      name: 'Item',
      fields: { id: { type: GraphQLString } },
    });
    const schemaP = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: { items: { type: new GraphQLList(ItemP) } },
      }),
    });
    const planP = compileExecutionPlan({ schema: schemaP, document });
    expect(isExecutionPlan(planP)).toBe(true);
    expect(ItemP.isTypeOf).toBeUndefined();
    let installedP = false;
    const item0P: { id: unknown; then?: unknown } = {
      get id() {
        if (!installedP) {
          ItemP.isTypeOf = () => false;
          installedP = true;
          (item0P as { then?: unknown }).then = (onFulfilled: unknown, onRejected: unknown) =>
            Promise.resolve({ id: 'a' }).then(onFulfilled as any, onRejected as any);
        }
        return Promise.resolve('a');
      },
    };
    const planned = singular(
      await execute({
        schema: schemaP,
        document,
        rootValue: { items: [item0P, { id: 'b' }] },
        plan: planP as any,
      }),
    );

    expect(classic.data).toEqual({ items: [{ id: 'a' }, null] });
    expect(classic.errors?.[0]?.path).toEqual(['items', 1]);
    expect(planned.data).toEqual(classic.data);
    expect(planned.errors?.[0]?.path).toEqual(classic.errors?.[0]?.path);
  });

  it('4702079292 method profile installs isTypeOf — keep item0', async () => {
    const document = parse('{ items { profile { id } label } }');

    const ProfileC = new GraphQLObjectType({
      name: 'Profile',
      fields: { id: { type: GraphQLID } },
    });
    const ItemC = new GraphQLObjectType({
      name: 'Item',
      fields: {
        profile: { type: ProfileC },
        label: { type: GraphQLString },
      },
    });
    const schemaC = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: { items: { type: new GraphQLList(ItemC) } },
      }),
    });
    let installedC = false;
    const classic = singular(
      await executeClassic({
        schema: schemaC,
        document,
        rootValue: {
          items: [
            {
              label: 'L0',
              get profile() {
                if (!installedC) {
                  ItemC.isTypeOf = () => false;
                  installedC = true;
                }
                return () => ({ id: 'a' });
              },
            },
            { profile: { id: 'b' }, label: 'L1' },
          ],
        },
      }),
    );

    const ProfileP = new GraphQLObjectType({
      name: 'Profile',
      fields: { id: { type: GraphQLID } },
    });
    const ItemP = new GraphQLObjectType({
      name: 'Item',
      fields: {
        profile: { type: ProfileP },
        label: { type: GraphQLString },
      },
    });
    const schemaP = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: { items: { type: new GraphQLList(ItemP) } },
      }),
    });
    const planP = compileExecutionPlan({ schema: schemaP, document });
    expect(isExecutionPlan(planP)).toBe(true);
    expect(ItemP.isTypeOf).toBeUndefined();
    let installedP = false;
    const planned = singular(
      await execute({
        schema: schemaP,
        document,
        rootValue: {
          items: [
            {
              label: 'L0',
              get profile() {
                if (!installedP) {
                  ItemP.isTypeOf = () => false;
                  installedP = true;
                }
                return () => ({ id: 'a' });
              },
            },
            { profile: { id: 'b' }, label: 'L1' },
          ],
        },
        plan: planP as any,
      }),
    );

    expect(classic.data).toEqual({
      items: [{ profile: { id: 'a' }, label: 'L0' }, null],
    });
    expect(classic.errors?.[0]?.path).toEqual(['items', 1]);
    expect(planned.data).toEqual(classic.data);
    expect(planned.errors?.[0]?.path).toEqual(classic.errors?.[0]?.path);
  });
});

// --- from execution-plan-r39-cr-boundary-test.ts ---
describe('R39 classic parity (CR 8433/8456/8468)', () => {
  it('4705778433 per-event pristine sees live resolve mid-subscription', async () => {
    const document = parse('subscription { items { id } }');

    const ItemC = new GraphQLObjectType({
      name: 'Item',
      fields: { id: { type: GraphQLString } },
    });
    const schemaC = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: { _empty: { type: GraphQLString } },
      }),
      subscription: new GraphQLObjectType({
        name: 'Subscription',
        fields: {
          items: {
            type: ItemC,
            subscribe: async function* () {
              yield { items: { id: 'raw1' } };
              yield { items: { id: 'raw2' } };
            },
          },
        },
      }),
    });

    const prevPlanning = isExecutionPlanningEnabled();
    setExecutionPlanningEnabled(false);
    try {
      const classicSub = await subscribe({ schema: schemaC, document });
      expect(isAsyncIterable(classicSub)).toBe(true);
      const classicIter = (classicSub as AsyncIterable<unknown>)[Symbol.asyncIterator]();
      const classic1 = singular((await classicIter.next()).value);
      ItemC.getFields()['id'].resolve = () => 'patched';
      const classic2 = singular((await classicIter.next()).value);
      await classicIter.return?.();

      const ItemP = new GraphQLObjectType({
        name: 'Item',
        fields: { id: { type: GraphQLString } },
      });
      const schemaP = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: { _empty: { type: GraphQLString } },
        }),
        subscription: new GraphQLObjectType({
          name: 'Subscription',
          fields: {
            items: {
              type: ItemP,
              subscribe: async function* () {
                yield { items: { id: 'raw1' } };
                yield { items: { id: 'raw2' } };
              },
            },
          },
        }),
      });
      const plan = compileExecutionPlan({ schema: schemaP, document });
      expect(isExecutionPlan(plan)).toBe(true);
      // Explicit plan — no need to flip auto-planning on for subscribe.
      const plannedSub = await subscribe({
        schema: schemaP,
        document,
        plan: plan as any,
      });
      expect(isAsyncIterable(plannedSub)).toBe(true);
      const plannedIter = (plannedSub as AsyncIterable<unknown>)[Symbol.asyncIterator]();
      const planned1 = singular((await plannedIter.next()).value);
      ItemP.getFields()['id'].resolve = () => 'patched';
      const planned2 = singular((await plannedIter.next()).value);
      await plannedIter.return?.();

      expect(classic1.data).toEqual({ items: { id: 'raw1' } });
      expect(classic2.data).toEqual({ items: { id: 'patched' } });
      expect(planned1.data).toEqual(classic1.data);
      expect(planned2.data).toEqual(classic2.data);
    } finally {
      setExecutionPlanningEnabled(prevPlanning);
    }
  });

  it('CR Additional 4523: mid-execute resolve install wins over pristine snapshot', async () => {
    // Warm plan records defaultPropertyResolvesPristine; setup installs
    // Query.score.resolve while root property score is still 1. Classic calls
    // the installed resolver (2); planned must not keep reading the property.
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          setup: {
            type: GraphQLString,
            resolve(_s, _a, _c, info) {
              info.schema.getQueryType()!.getFields()['score'].resolve = () => 2;
              return 'done';
            },
          },
          score: { type: GraphQLInt },
        },
      }),
    });
    const document = parse('{ setup score }');
    const plan = compileExecutionPlan({ schema, document });
    expect(isExecutionPlan(plan)).toBe(true);

    schema.getQueryType()!.getFields()['score'].resolve = undefined;
    const classic = await executeClassic({
      schema,
      document,
      rootValue: { score: 1 },
    });

    schema.getQueryType()!.getFields()['score'].resolve = undefined;
    const planned = singular(
      await execute({
        plan: plan as never,
        rootValue: { score: 1 },
      }),
    );

    expect(classic.data).toEqual({ setup: 'done', score: 2 });
    expect(planned.data).toEqual(classic.data);
    expect(planned.errors).toEqual(classic.errors);
  });

  it('4710038647 abort before resolve: subscribe aborted + no query root', async () => {
    const schema = new GraphQLSchema({
      // No query root — subscribe-only schema (valid at the GraphQLSchema type).
      query: undefined,
      subscription: new GraphQLObjectType({
        name: 'Subscription',
        fields: {
          n: {
            type: GraphQLInt,
            subscribe: async function* () {
              yield { n: 1 };
            },
          },
        },
      }),
    });
    const document = parse('subscription { n }');
    const acP = new AbortController();
    const acC = new AbortController();
    acP.abort(new DOMException('aborted', 'AbortError'));
    acC.abort(new DOMException('aborted', 'AbortError'));

    let plannedThrown: unknown;
    let classicThrown: unknown;
    try {
      await subscribe({ schema, document, signal: acP.signal });
    } catch (e) {
      plannedThrown = e;
    }
    try {
      buildExecutionContext({ schema, document, signal: acC.signal }, null);
    } catch (e) {
      classicThrown = e;
    }
    expect((plannedThrown as Error)?.name).toBe('AbortError');
    expect((classicThrown as Error)?.name).toBe('AbortError');
  });

  it('4710038661 root-leaf throwing then getter keeps sibling ok', async () => {
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          ok: { type: GraphQLString },
          score: { type: GraphQLInt },
        },
      }),
    });
    const document = parse('{ ok score }');
    const rootValue = {
      ok: 'yes',
      score: {
        get then() {
          throw new Error('then boom');
        },
      },
    };
    const args = { schema, document, rootValue };
    const planned = singular(await execute(args));
    const classic = await executeClassic(args);
    expect(classic.data).toEqual({ ok: 'yes', score: null });
    expect(classic.errors?.[0]?.path).toEqual(['score']);
    expect(planned.data).toEqual(classic.data);
    expect(planned.errors?.[0]?.path).toEqual(classic.errors?.[0]?.path);
  });

  it('4710038673 Phase B reuses Phase A Error classification (proxy getPrototypeOf)', async () => {
    const User = new GraphQLObjectType({
      name: 'User',
      fields: { id: { type: GraphQLString } },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          users: { type: new GraphQLList(User) },
        },
      }),
    });
    const document = parse('{ users { id } }');

    function makeProxy() {
      let calls = 0;
      const item: any = { __typename: 'User', id: 'a' };
      return new Proxy(item, {
        getPrototypeOf(target) {
          calls++;
          if (calls === 1) {
            User.isTypeOf = (v: unknown) => (v as any)?.__typename === 'User';
            return Object.getPrototypeOf(target);
          }
          throw new Error('proto trap throw');
        },
      });
    }

    User.isTypeOf = undefined;
    const classic = await executeClassic({
      schema,
      document,
      rootValue: { users: [makeProxy()] },
    });
    User.isTypeOf = undefined;
    const planned = singular(
      await execute({
        schema,
        document,
        rootValue: { users: [makeProxy()] },
      }),
    );
    expect(classic.data).toEqual({ users: [{ id: 'a' }] });
    expect(planned.data).toEqual(classic.data);
    expect(planned.errors).toEqual(classic.errors);
  });

  it('4710038686 non-native thenable then starts sync during list traversal', async () => {
    const User = new GraphQLObjectType({
      name: 'User',
      fields: { id: { type: GraphQLString } },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          users: { type: new GraphQLList(User) },
        },
      }),
    });
    const document = parse('{ users { id } }');

    function makeRoot() {
      let label = 'a';
      const thenable = {
        then(onFulfilled?: (v: unknown) => unknown) {
          const resolved = {
            get id() {
              return label;
            },
          };
          return onFulfilled ? onFulfilled(resolved) : resolved;
        },
      };
      return {
        users: [
          thenable,
          {
            get id() {
              label = 'b';
              return 'x';
            },
          },
        ],
      };
    }

    const classic = await executeClassic({
      schema,
      document,
      rootValue: makeRoot(),
    });
    const planned = singular(
      await execute({
        schema,
        document,
        rootValue: makeRoot(),
      }),
    );
    expect(classic.data).toEqual({ users: [{ id: 'a' }, { id: 'x' }] });
    expect(planned.data).toEqual(classic.data);
  });

  it('4712216283 thenable return then-getter throw stays at item index', async () => {
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
    function makeItem() {
      return {
        then(onFulfilled?: (v: unknown) => unknown) {
          onFulfilled?.({ id: 'a' });
          return {
            get then() {
              throw new Error('return-then-boom');
            },
          };
        },
      };
    }
    const classic = singular(
      await executeClassic({
        schema,
        document,
        rootValue: { users: [makeItem(), { id: 'b' }] },
      }),
    );
    const planned = singular(
      await executePlanned({
        schema,
        document,
        rootValue: { users: [makeItem(), { id: 'b' }] },
      }),
    );
    expect(classic.data).toEqual({ users: [null, { id: 'b' }] });
    expect(planned).toEqual(classic);
    expect(planned.errors?.[0]?.path).toEqual(['users', 0]);
    expect(planned.errors?.[0]?.message).toBe('return-then-boom');
  });

  it('4712216275 classification throw Error-with-then is not awaited', async () => {
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
    function makeItem() {
      const boom = new Error('then-boom') as Error & {
        then?: (onFulfilled?: (v: unknown) => unknown) => unknown;
      };
      boom.then = onFulfilled => onFulfilled?.({ id: 'a' });
      const item: Record<string, unknown> = {};
      Object.defineProperty(item, 'then', {
        enumerable: false,
        configurable: true,
        get() {
          throw boom;
        },
      });
      return item;
    }
    const classic = singular(
      await executeClassic({
        schema,
        document,
        rootValue: { users: [makeItem(), { id: 'b' }] },
      }),
    );
    const planned = singular(
      await executePlanned({
        schema,
        document,
        rootValue: { users: [makeItem(), { id: 'b' }] },
      }),
    );
    expect(classic.data).toEqual({ users: [null, { id: 'b' }] });
    expect(planned).toEqual(classic);
    expect(planned.errors?.[0]?.message).toBe('then-boom');
    expect(planned.errors?.[0]?.path).toEqual(['users', 0]);
  });

  it('4712216283b thenable-resolved proxy: no second getPrototypeOf in completeListItemValue', async () => {
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
    function makeThenable() {
      let calls = 0;
      const resolved: any = { __typename: 'User', id: 'a' };
      const proxy = new Proxy(resolved, {
        getPrototypeOf(target) {
          calls++;
          if (calls === 1) {
            User.isTypeOf = (v: unknown) => (v as any)?.__typename === 'User';
            return Object.getPrototypeOf(target);
          }
          throw new Error('proto trap throw');
        },
      });
      return {
        then(onFulfilled?: (v: unknown) => unknown) {
          return onFulfilled ? onFulfilled(proxy) : proxy;
        },
      };
    }
    User.isTypeOf = undefined;
    const classic = singular(
      await executeClassic({
        schema,
        document,
        rootValue: { users: [makeThenable()] },
      }),
    );
    User.isTypeOf = undefined;
    const planned = singular(
      await executePlanned({
        schema,
        document,
        rootValue: { users: [makeThenable()] },
      }),
    );
    expect(classic.data).toEqual({ users: [{ id: 'a' }] });
    expect(planned.data).toEqual(classic.data);
    expect(planned.errors).toEqual(classic.errors);
  });

  it('4712216268 Error-with-then users property is awaited (thin object-list)', async () => {
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
    function makeRoot() {
      const err = new Error('should-await') as Error & {
        then?: (onFulfilled?: (v: unknown) => unknown) => unknown;
      };
      err.then = onFulfilled => onFulfilled?.([{ id: 'a' }]);
      return { users: err };
    }
    const classic = singular(await executeClassic({ schema, document, rootValue: makeRoot() }));
    const planned = singular(await executePlanned({ schema, document, rootValue: makeRoot() }));
    expect(classic.data).toEqual({ users: [{ id: 'a' }] });
    expect(planned).toEqual(classic);
    expect(planned.errors).toBeUndefined();
  });

  it('4705778456 Object.create(null) getter nulls nearest nullable profile', async () => {
    const Profile = new GraphQLObjectType({
      name: 'Profile',
      fields: {
        id: { type: GraphQLString },
        label: { type: GraphQLString },
      },
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
    const document = parse('{ user { profile { id label } label } }');
    const rootValue = {
      user: {
        label: 'keep-me',
        get profile() {
          return {
            get id() {
              throw Object.create(null);
            },
            label: 'inner',
          };
        },
      },
    };

    const classic = singular(await executeClassic({ schema, document, rootValue }));
    const plan = compileExecutionPlan({ schema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    const planned = singular(await execute({ schema, document, rootValue, plan: plan as any }));

    // Safe coerceError absorbs Object.create(null) at the leaf; nested
    // boundary still keeps any escaped child throw from bubbling to `user`.
    expect(classic.data).toEqual({
      user: { profile: { id: null, label: 'inner' }, label: 'keep-me' },
    });
    expect(classic.errors?.[0]?.path).toEqual(['user', 'profile', 'id']);
    expect(planned.data).toEqual(classic.data);
    expect(planned.errors?.[0]?.path).toEqual(classic.errors?.[0]?.path);
  });

  it('4706996094 coerceError message-getter throw stays at id; keeps siblings', async () => {
    const Profile = new GraphQLObjectType({
      name: 'Profile',
      fields: {
        id: { type: GraphQLID },
        label: { type: GraphQLString },
      },
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
    const document = parse('{ user { profile { id label } label } }');
    const rootValue = {
      user: {
        label: 'keep-me',
        get profile() {
          return {
            get id() {
              throw {
                get message() {
                  throw new Error('message getter failed');
                },
              };
            },
            label: 'inner',
          };
        },
      },
    };

    const classic = singular(await executeClassic({ schema, document, rootValue }));
    const plan = compileExecutionPlan({ schema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    const planned = singular(await execute({ schema, document, rootValue, plan: plan as any }));

    // coerceError must not rethrow from hostile getters; nullable id absorbs.
    expect(classic.data).toEqual({
      user: { profile: { id: null, label: 'inner' }, label: 'keep-me' },
    });
    expect(classic.errors?.[0]?.path).toEqual(['user', 'profile', 'id']);
    expect(classic.errors?.[0]?.message).toBe('message getter failed');
    expect(planned.data).toEqual(classic.data);
    expect(planned.errors?.[0]?.path).toEqual(classic.errors?.[0]?.path);
    expect(planned.errors?.[0]?.message).toBe(classic.errors?.[0]?.message);
  });

  it('4705778468 sync finishThin NonNull failure nulls profile; keeps label', async () => {
    const Profile = new GraphQLObjectType({
      name: 'Profile',
      fields: {
        prefix: { type: GraphQLString },
        fail: {
          type: new GraphQLNonNull(GraphQLID),
          args: { flag: { type: GraphQLBoolean } },
          resolve(_src, args: { flag?: boolean | null }) {
            if (args.flag) {
              throw new Error('fail-sync');
            }
            return 'ok';
          },
        },
      },
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
    const document = parse('{ user { profile { prefix fail(flag: true) } label } }');
    const rootValue = {
      user: {
        label: 'keep-me',
        profile: { prefix: 'p' },
      },
    };

    const classic = singular(await executeClassic({ schema, document, rootValue }));
    const plan = compileExecutionPlan({ schema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    const planned = singular(await execute({ schema, document, rootValue, plan: plan as any }));

    expect(classic.data).toEqual({ user: { profile: null, label: 'keep-me' } });
    expect(classic.errors?.[0]?.path).toEqual(['user', 'profile', 'fail']);
    expect(planned.data).toEqual(classic.data);
    expect(planned.errors?.[0]?.path).toEqual(classic.errors?.[0]?.path);
  });
});

// --- CR majors 4707945006 / 5017 / 5023 / 5030 / 5059 ---
describe('CR majors classic parity (4707945006–5059)', () => {
  it('4707945006 fragment @include on non-matching type still errors', async () => {
    const Dog = new GraphQLObjectType({
      name: 'Dog',
      fields: { name: { type: GraphQLString } },
    });
    const Cat = new GraphQLObjectType({
      name: 'Cat',
      fields: { name: { type: GraphQLString } },
    });
    const Pet = new GraphQLUnionType({
      name: 'Pet',
      types: [Dog, Cat],
      resolveType: () => 'Dog',
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: { pet: { type: Pet } },
      }),
    });
    const document = parse(
      'query ($show: Boolean = true) { pet { __typename ... on Cat @include(if: $show) { name } } }',
    );
    const rootValue = { pet: { name: 'fido' } };
    const vars = { show: null };

    const plan = compileExecutionPlan({ schema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    const classic = singular(
      await executeClassic({ schema, document, rootValue, variableValues: vars }),
    );
    const planned = singular(
      await execute({ plan: plan as never, rootValue, variableValues: vars }),
    );
    expect(planned).toEqual(classic);
    expect(planned.data).toEqual({ pet: null });
    expect(planned.errors?.[0]?.path).toEqual(['pet']);
    // GQL17: `@include(if:)` …; GQL16: Argument "if" of non-null type "Boolean!" …
    expect(planned.errors?.[0]?.message).toMatch(/@include\(if:\)|Argument "if"/);

    // show:false — Dog typename, no error
    const classicFalse = singular(
      await executeClassic({
        schema,
        document,
        rootValue,
        variableValues: { show: false },
      }),
    );
    const plannedFalse = singular(
      await execute({
        plan: plan as never,
        rootValue,
        variableValues: { show: false },
      }),
    );
    expect(plannedFalse).toEqual(classicFalse);
    expect(plannedFalse).toEqual({ data: { pet: { __typename: 'Dog' } } });

    // planning-disabled uses the same predicate compiler
    const prevPlanningDisabled = isExecutionPlanningEnabled();
    setExecutionPlanningEnabled(false);
    try {
      const disabled = singular(
        await execute({ schema, document, rootValue, variableValues: vars }),
      );
      expect(disabled).toEqual(classic);
    } finally {
      setExecutionPlanningEnabled(prevPlanningDisabled);
    }
  });

  it('4707945017 observe root promise after runner fails inline', async () => {
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          a: { type: new GraphQLNonNull(GraphQLInt) },
          b: { type: GraphQLInt },
        },
      }),
    });
    const document = parse('{ a b }');

    async function run(mode: 'planned' | 'classic') {
      let rejectB!: (r: unknown) => void;
      const bPromise = new Promise<number>((_resolve, reject) => {
        rejectB = reject;
      });
      let thenCalls = 0;
      const tracked = Object.assign(bPromise, {
        then(
          onFulfilled?: ((value: number) => unknown) | null,
          onRejected?: ((reason: unknown) => unknown) | null,
        ) {
          thenCalls += 1;
          return Promise.prototype.then.call(this, onFulfilled, onRejected);
        },
      });
      const rootValue = {
        a: {
          then(onFulfilled: (v: unknown) => unknown) {
            return new Promise((resolve, reject) => {
              try {
                resolve(onFulfilled(null));
              } catch (e) {
                reject(e);
              }
            });
          },
        },
        b: tracked,
      };
      const uhrs: string[] = [];
      const onUhr = (reason: unknown) => {
        uhrs.push(reason instanceof Error ? reason.message : String(reason));
      };
      process.on('unhandledRejection', onUhr);
      let result: SingularExecutionResult | undefined;
      try {
        result =
          mode === 'planned'
            ? singular(await executePlanned({ schema, document, rootValue }))
            : singular(await executeClassic({ schema, document, rootValue }));
      } catch {
        // ignore
      }
      const observed = thenCalls;
      rejectB(new Error(`late-b-${mode}`));
      await new Promise<void>(r => setImmediate(r));
      await new Promise<void>(r => setImmediate(r));
      tracked.then(undefined, () => undefined);
      await new Promise<void>(r => setImmediate(r));
      process.off('unhandledRejection', onUhr);
      return { result, observed, uhrs };
    }

    const planned = await run('planned');
    const classic = await run('classic');

    expect(planned.result?.data).toBeNull();
    expect(planned.result?.errors?.[0]?.path).toEqual(['a']);
    expect(classic.result?.data).toBeNull();
    expect(classic.result?.errors?.[0]?.path).toEqual(['a']);
    // Both modes must observe b (no UHR).
    expect(planned.observed).toBeGreaterThan(0);
    expect(classic.observed).toBeGreaterThan(0);
    expect(planned.uhrs).toEqual([]);
    expect(classic.uhrs).toEqual([]);
  });

  it('4707945023 AggregateError CRITICAL_ERROR from thin object-list', async () => {
    const User = new GraphQLObjectType({
      name: 'User',
      fields: { id: { type: GraphQLString } },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          users: { type: new GraphQLList(User) },
          ok: { type: GraphQLString, resolve: () => 'yes' },
        },
      }),
    });
    const document = parse('{ users { id } ok }');
    const critical = new GraphQLError('crit', {
      extensions: { [CRITICAL_ERROR]: true },
    });
    const rootValue = {
      users() {
        throw new AggregateError([critical], 'agg');
      },
    };

    const classic = singular(await executeClassic({ schema, document, rootValue }));
    const planned = singular(await executePlanned({ schema, document, rootValue }));
    expect(planned).toEqual(classic);
    expect(planned.data).toBeNull();
    expect(planned.errors?.[0]?.message).toBe('crit');
    expect(planned.errors?.[0]?.extensions?.[CRITICAL_ERROR]).toBe(true);
    expect(planned.errors?.[0]?.path).toEqual(['users']);
  });

  it('4707945030 thenable classification throw at list item index', async () => {
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
    const item0: Record<string, unknown> = {};
    Object.defineProperty(item0, 'then', {
      enumerable: false,
      configurable: true,
      get() {
        throw new Error('then-boom');
      },
    });
    const rootValue = { users: [item0, { id: 'b' }] };

    const classic = singular(await executeClassic({ schema, document, rootValue }));
    const planned = singular(await executePlanned({ schema, document, rootValue }));
    expect(planned).toEqual(classic);
    expect(planned.data).toEqual({ users: [null, { id: 'b' }] });
    expect(planned.errors?.[0]?.path).toEqual(['users', 0]);
    expect(planned.errors?.[0]?.message).toBe('then-boom');
  });

  it('4707945030b leaf-list thenable classification throw keeps sibling (nullable)', async () => {
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: { values: { type: new GraphQLList(GraphQLString) } },
      }),
    });
    const document = parse('{ values }');
    const item0: Record<string, unknown> = {};
    Object.defineProperty(item0, 'then', {
      enumerable: false,
      configurable: true,
      get() {
        throw new Error('then-boom');
      },
    });
    const rootValue = { values: [item0, 'b'] };
    const classic = singular(await executeClassic({ schema, document, rootValue }));
    const plan = compileExecutionPlan({ schema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    const planned = singular(await execute({ plan: plan as never, rootValue }));
    expect(planned).toEqual(classic);
    expect(planned.data).toEqual({ values: [null, 'b'] });
    expect(planned.errors?.[0]?.path).toEqual(['values', 0]);
  });

  it('4707945030c leaf-list thenable classification throw bubbles NonNull item', async () => {
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          values: { type: new GraphQLList(new GraphQLNonNull(GraphQLString)) },
          label: { type: GraphQLString },
        },
      }),
    });
    const document = parse('{ values label }');
    const item0: Record<string, unknown> = {};
    Object.defineProperty(item0, 'then', {
      enumerable: false,
      configurable: true,
      get() {
        throw new Error('then-boom');
      },
    });
    const rootValue = { values: [item0, 'b'], label: 'L' };
    const classic = singular(await executeClassic({ schema, document, rootValue }));
    const plan = compileExecutionPlan({ schema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    const planned = singular(await execute({ plan: plan as never, rootValue }));
    expect(planned).toEqual(classic);
    expect(planned.data).toEqual({ values: null, label: 'L' });
    expect(planned.errors?.[0]?.path).toEqual(['values', 0]);
  });

  (versionInfo.major >= 17 ? it : it.skip)(
    '4707945059 GQL17 nested value-form default via embedded vars',
    async () => {
      const Cfg = new GraphQLInputObjectType({
        name: 'Cfg',
        fields: {
          limit: {
            type: new GraphQLNonNull(GraphQLInt),
            // GraphQL 17 value-form default (typed loosely for dual GQL16/17 check).
            ...({ default: { value: 5 } } as object),
          },
        },
      });
      const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            f: {
              type: GraphQLString,
              args: {
                tags: { type: new GraphQLList(GraphQLString) },
                cfg: {
                  type: new GraphQLNonNull(Cfg),
                  ...({
                    default: { literal: { kind: Kind.OBJECT, fields: [] } },
                  } as object),
                },
              },
              resolve: (_s, args) => JSON.stringify(args),
            },
          },
        }),
      });
      const document = parse('query ($tag: String) { f(tags: [$tag]) }');
      const variableValues = { tag: 'x' };

      const classic = singular(await executeClassic({ schema, document, variableValues }));
      const planned = singular(await executePlanned({ schema, document, variableValues }));
      expect(planned).toEqual(classic);
      expect(planned.data).toEqual({
        f: JSON.stringify({ tags: ['x'], cfg: { limit: 5 } }),
      });
      expect(planned.errors).toBeUndefined();
    },
  );

  (versionInfo.major >= 17 ? it : it.skip)(
    '4707945059b compileMissingAstArgMessages does not parseLiteral schema defaults',
    async () => {
      let parseLiteralCalls = 0;
      const Counted = new GraphQLScalarType({
        name: 'Counted',
        serialize: v => v,
        parseValue: v => v,
        parseLiteral(node) {
          parseLiteralCalls += 1;
          return (node as { value: string }).value;
        },
      });
      const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            parent: {
              type: new GraphQLObjectType({
                name: 'Parent',
                fields: {
                  child: {
                    type: GraphQLString,
                    args: {
                      tag: {
                        type: new GraphQLNonNull(Counted),
                        ...({
                          default: { literal: { kind: Kind.STRING, value: 'x' } },
                        } as object),
                      },
                    },
                    resolve: () => 'ok',
                  },
                },
              }),
              resolve: () => null,
            },
          },
        }),
      });
      // Schema validation may parse defaults — reset after construction.
      parseLiteralCalls = 0;
      const document = parse('{ parent { child } }');
      const plan = compileExecutionPlan({ schema, document });
      expect(isExecutionPlan(plan)).toBe(true);
      // Compile must not coerce schema defaults (custom-scalar parseLiteral).
      expect(parseLiteralCalls).toBe(0);
      const classic = singular(await executeClassic({ schema, document }));
      expect(classic.data).toEqual({ parent: null });
      parseLiteralCalls = 0;
      const planned = singular(await execute({ plan: plan as never }));
      expect(planned.data).toEqual({ parent: null });
      // Skipped child under null parent must not coerce the unused default.
      expect(parseLiteralCalls).toBe(0);
    },
  );

  it('4708535559 matching fragment directive when children NEVER_INCLUDE', async () => {
    const Box = new GraphQLObjectType({
      name: 'Box',
      fields: {
        id: { type: GraphQLString },
        extra: { type: GraphQLString },
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: { box: { type: Box } },
      }),
    });
    const document = parse(
      'query ($show: Boolean = true) { box { id ... @include(if: $show) { extra @skip(if: true) } } }',
    );
    const rootValue = { box: { id: '1', extra: 'x' } };
    const plan = compileExecutionPlan({ schema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    const classic = singular(
      await executeClassic({ schema, document, rootValue, variableValues: { show: null } }),
    );
    const planned = singular(
      await execute({ plan: plan as never, rootValue, variableValues: { show: null } }),
    );
    expect(planned).toEqual(classic);
    expect(planned.data).toEqual({ box: null });
    expect(planned.errors?.[0]?.path).toEqual(['box']);

    const classicOk = singular(
      await executeClassic({ schema, document, rootValue, variableValues: { show: true } }),
    );
    const plannedOk = singular(
      await execute({ plan: plan as never, rootValue, variableValues: { show: true } }),
    );
    expect(plannedOk).toEqual(classicOk);
    expect(plannedOk).toEqual({ data: { box: { id: '1' } } });
  });

  it('4708535559b named fragment spread directive when children NEVER_INCLUDE', async () => {
    const Box = new GraphQLObjectType({
      name: 'Box',
      fields: {
        id: { type: GraphQLString },
        extra: { type: GraphQLString },
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: { box: { type: Box } },
      }),
    });
    const document = parse(
      'query ($show: Boolean = true) { box { id ...F @include(if: $show) } } fragment F on Box { extra @skip(if: true) }',
    );
    const rootValue = { box: { id: '1', extra: 'x' } };
    const plan = compileExecutionPlan({ schema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    const planned = singular(
      await execute({ plan: plan as never, rootValue, variableValues: { show: null } }),
    );
    // Absolute: classic collectFields reports the spread directive error.
    expect(planned.data).toEqual({ box: null });
    expect(planned.errors?.[0]?.path).toEqual(['box']);
    expect(planned.errors?.[0]?.message).toMatch(/@include\(if:\)|Argument "if"/);

    const plannedOk = singular(
      await execute({ plan: plan as never, rootValue, variableValues: { show: true } }),
    );
    expect(plannedOk).toEqual({ data: { box: { id: '1' } } });
  });

  it('4708535571b field @include before repeated spread — selection-order errors', async () => {
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          value: { type: GraphQLString, resolve: () => 'v' },
          other: { type: GraphQLString, resolve: () => 'o' },
        },
      }),
    });
    const document = parse(
      'query ($a: Boolean = true, $b: Boolean = true) { value @include(if: $a) ...F ...F @include(if: $b) } fragment F on Query { other }',
    );
    const plan = compileExecutionPlan({ schema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    const planned = singular(
      await execute({
        plan: plan as never,
        variableValues: { a: null, b: null },
      }),
    );
    // Classic collectFields reports the field `$a` error before the second
    // spread's `$b`. GQL17 messages name the variable; GQL16 does not — pin
    // order by source location of the first error.
    expect(planned.data).toBeNull();
    expect(planned.errors?.length).toBeGreaterThan(0);
    const msg = planned.errors?.[0]?.message ?? '';
    if (versionInfo.major >= 17) {
      expect(msg).toMatch(/\$a/);
      expect(msg).not.toMatch(/\$b/);
    } else {
      const src = document.loc!.source.body;
      const fieldAt = src.indexOf('@include(if: $a)');
      const spreadAt = src.lastIndexOf('@include(if: $b)');
      expect(fieldAt).toBeGreaterThanOrEqual(0);
      expect(spreadAt).toBeGreaterThan(fieldAt);
      const col = planned.errors?.[0]?.locations?.[0]?.column;
      expect(col).toBeDefined();
      // 1-indexed column must land on the earlier field include, not `$b`.
      expect(col!).toBeLessThan(spreadAt + 1);
      expect(col!).toBeGreaterThan(fieldAt);
    }
  });

  it('4708535571 repeated fragment spread directive before visited skip', async () => {
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: { value: { type: GraphQLString, resolve: () => 'ok' } },
      }),
    });
    const document = parse(
      'query ($show: Boolean = true) { ...F ...F @include(if: $show) } fragment F on Query { value }',
    );
    const plan = compileExecutionPlan({ schema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    const classic = singular(
      await executeClassic({ schema, document, variableValues: { show: null } }),
    );
    const planned = singular(
      await execute({ plan: plan as never, variableValues: { show: null } }),
    );
    expect(planned).toEqual(classic);
    expect(planned.data).toBeNull();
    expect(planned.errors?.length).toBeGreaterThan(0);

    const classicFalse = singular(
      await executeClassic({ schema, document, variableValues: { show: false } }),
    );
    const plannedFalse = singular(
      await execute({ plan: plan as never, variableValues: { show: false } }),
    );
    expect(plannedFalse).toEqual(classicFalse);
    expect(plannedFalse).toEqual({ data: { value: 'ok' } });
  });

  it('4708535586 Phase B later-item then installs isTypeOf — keep classification', async () => {
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

    function makeItem(id: string) {
      let thenReads = 0;
      const isTypeOfArgs: unknown[] = [];
      const item = {
        get then() {
          thenReads += 1;
          if (thenReads === 1) {
            User.isTypeOf = value => {
              isTypeOfArgs.push(value);
              return true;
            };
            return undefined;
          }
          throw new Error('second then read');
        },
        id,
      };
      return { item, getThenReads: () => thenReads, getIsTypeOfArgs: () => isTypeOfArgs };
    }

    // Later item: first slot pending promise forces Phase B classification.
    const laterP = makeItem('2');
    let resolveFirst!: (v: unknown) => void;
    const first = new Promise(r => {
      resolveFirst = r;
    });
    const plannedP = execute({
      plan: plan as never,
      rootValue: { users: [first, laterP.item] },
    });
    resolveFirst({ id: '1' });
    const planned = singular(await plannedP);
    delete (User as { isTypeOf?: unknown }).isTypeOf;

    const laterC = makeItem('2');
    const classic = singular(
      await executeClassic({
        schema,
        document,
        rootValue: { users: [Promise.resolve({ id: '1' }), laterC.item] },
      }),
    );
    delete (User as { isTypeOf?: unknown }).isTypeOf;

    expect(planned).toEqual(classic);
    expect(planned.errors).toBeUndefined();
    expect(planned.data).toEqual({ users: [{ id: '1' }, { id: '2' }] });
    expect(laterP.getThenReads()).toBe(1);
    expect(laterC.getThenReads()).toBe(1);
    // Predicate must run on the later item itself (not only the resolved first).
    expect(laterP.getIsTypeOfArgs()).toContain(laterP.item);
    expect(laterC.getIsTypeOfArgs()).toContain(laterC.item);
  });

  it('4708535586b Phase A retained item then installs isTypeOf — keep classification', async () => {
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

    function makeRetained(id: string) {
      let thenReads = 0;
      const isTypeOfArgs: unknown[] = [];
      const item = {
        get then() {
          thenReads += 1;
          if (thenReads === 1) {
            User.isTypeOf = value => {
              isTypeOfArgs.push(value);
              return true;
            };
            return undefined;
          }
          throw new Error('second then read');
        },
        id,
      };
      return { item, getThenReads: () => thenReads, getIsTypeOfArgs: () => isTypeOfArgs };
    }

    // Sync list: first item classified in Phase A, handed off for live isTypeOf.
    const retainedP = makeRetained('1');
    const planned = singular(
      await execute({ plan: plan as never, rootValue: { users: [retainedP.item] } }),
    );
    delete (User as { isTypeOf?: unknown }).isTypeOf;

    const retainedC = makeRetained('1');
    const classic = singular(
      await executeClassic({
        schema,
        document,
        rootValue: { users: [retainedC.item] },
      }),
    );
    delete (User as { isTypeOf?: unknown }).isTypeOf;

    expect(planned).toEqual(classic);
    expect(planned.errors).toBeUndefined();
    expect(planned.data).toEqual({ users: [{ id: '1' }] });
    expect(retainedP.getThenReads()).toBe(1);
    expect(retainedC.getThenReads()).toBe(1);
    expect(retainedP.getIsTypeOfArgs()).toContain(retainedP.item);
    expect(retainedC.getIsTypeOfArgs()).toContain(retainedC.item);
  });

  it('4708535575 fulfilled AggregateError CRITICAL_ERROR from thin object-list', async () => {
    const User = new GraphQLObjectType({
      name: 'User',
      fields: { id: { type: GraphQLString } },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          users: { type: new GraphQLList(User) },
          ok: { type: GraphQLString, resolve: () => 'yes' },
        },
      }),
    });
    const document = parse('{ users { id } ok }');
    const critical = new GraphQLError('crit', {
      extensions: { [CRITICAL_ERROR]: true },
    });
    const rootValue = {
      // Async so the AggregateError is a fulfilled value (not a sync throw
      // caught before the thin object-list fulfillment callback).
      async users() {
        return new AggregateError([critical], 'agg');
      },
    };
    const plan = compileExecutionPlan({ schema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    const classic = singular(await executeClassic({ schema, document, rootValue }));
    const planned = singular(await execute({ plan: plan as never, rootValue }));
    expect(planned).toEqual(classic);
    expect(planned.data).toBeNull();
    expect(planned.errors?.[0]?.message).toBe('crit');
    expect(planned.errors?.[0]?.extensions?.[CRITICAL_ERROR]).toBe(true);
  });

  it('4709307266 Phase A Error handoff reaches handleFieldError in Phase B', async () => {
    const User = new GraphQLObjectType({
      name: 'User',
      fields: {
        id: {
          type: GraphQLString,
          resolve: (parent: { id?: string }) => parent.id ?? null,
        },
      },
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
    const rootValue = { users: [new Error('missing'), { id: 'b' }] };
    const classic = singular(await executeClassic({ schema, document, rootValue }));
    const planned = singular(await execute({ plan: plan as never, rootValue }));
    expect(planned).toEqual(classic);
    expect(planned.data).toEqual({ users: [null, { id: 'b' }] });
    expect(planned.errors?.[0]?.path).toEqual(['users', 0]);
    expect(planned.errors?.[0]?.message).toBe('missing');
  });

  it('4709307250 Phase B thenable Error is awaited (not treated as Error)', async () => {
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
    // Pending first item forces Phase B for the second slot.
    const pending = new Promise<{ id: string }>(resolve => {
      setTimeout(() => resolve({ id: 'a' }), 0);
    });
    const thenableError = new Error('should-not-surface') as Error & {
      then: (
        onFulfilled?: (v: unknown) => unknown,
        onRejected?: (e: unknown) => unknown,
      ) => PromiseLike<unknown>;
    };
    thenableError.then = (onFulfilled, onRejected) =>
      Promise.resolve({ id: 'b' }).then(onFulfilled as never, onRejected as never);
    const rootValue = { users: [pending, thenableError] };
    const classic = singular(await executeClassic({ schema, document, rootValue }));
    const planned = singular(await execute({ plan: plan as never, rootValue }));
    expect(planned).toEqual(classic);
    expect(planned.errors).toBeUndefined();
    expect(planned.data).toEqual({ users: [{ id: 'a' }, { id: 'b' }] });
  });

  it('4709307239 Phase A thenable handoff before getPrototypeOf probe', async () => {
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
    const backing = Promise.resolve({ id: '1' });
    const item = new Proxy(
      {},
      {
        get(_t, prop) {
          if (prop === 'then') {
            return (onFulfilled: (v: unknown) => unknown, onRejected: (e: unknown) => unknown) =>
              backing.then(onFulfilled, onRejected);
          }
          return undefined;
        },
        getPrototypeOf() {
          throw new Error('proto-boom');
        },
      },
    );
    const rootValue = { users: [item] };
    const classic = singular(await executeClassic({ schema, document, rootValue }));
    const planned = singular(await execute({ plan: plan as never, rootValue }));
    expect(planned).toEqual(classic);
    expect(planned.errors).toBeUndefined();
    expect(planned.data).toEqual({ users: [{ id: '1' }] });
  });

  it('4712362733 thin object-list property: then read once after negative classify', async () => {
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

    function makeRoot() {
      let thenReads = 0;
      const users = [{ id: 'a' }];
      Object.defineProperty(users, 'then', {
        configurable: true,
        enumerable: false,
        get() {
          thenReads += 1;
          if (thenReads === 1) {
            return undefined;
          }
          throw new Error('second then read');
        },
      });
      return { rootValue: { users }, getThenReads: () => thenReads };
    }

    const c = makeRoot();
    const classic = singular(await executeClassic({ schema, document, rootValue: c.rootValue }));
    const p = makeRoot();
    const planned = singular(await executePlanned({ schema, document, rootValue: p.rootValue }));
    expect(planned).toEqual(classic);
    expect(planned.errors).toBeUndefined();
    expect(planned.data).toEqual({ users: [{ id: 'a' }] });
    expect(p.getThenReads()).toBe(1);
    expect(c.getThenReads()).toBe(1);
  });

  it('4712362739 thin object-list property thenable: sync + sibling order', async () => {
    const User = new GraphQLObjectType({
      name: 'User',
      fields: {
        id: {
          type: GraphQLString,
          resolve(parent: { id: string; stamp?: string }) {
            return parent.stamp ?? parent.id;
          },
        },
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          users: { type: new GraphQLList(User) },
          sibling: {
            type: GraphQLString,
            resolve(root: { stampBox: { v: string } }) {
              root.stampBox.v = 'late';
              return 'sib';
            },
          },
        },
      }),
    });
    const document = parse('{ users { id } sibling }');

    function makeRoot() {
      const stampBox = { v: 'early' };
      const thenable = {
        then(onFulfilled?: (v: unknown) => unknown) {
          return onFulfilled?.([
            {
              id: 'a',
              get stamp() {
                return stampBox.v;
              },
            },
          ]);
        },
      };
      return { users: thenable, sibling: 'x', stampBox };
    }

    const classic = singular(await executeClassic({ schema, document, rootValue: makeRoot() }));
    const planned = singular(await executePlanned({ schema, document, rootValue: makeRoot() }));
    expect(planned).toEqual(classic);
    expect(planned.data).toEqual({ users: [{ id: 'early' }], sibling: 'sib' });
  });

  it('4712362748 finishResolved: knownIsPromise false skips user then getter', async () => {
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

    function makeItem() {
      let isTypeOfInstalled = false;
      return {
        then(onFulfilled?: (v: unknown) => unknown) {
          const user: Record<string, unknown> = { id: 'a' };
          Object.defineProperty(user, 'then', {
            configurable: true,
            enumerable: false,
            get() {
              throw new Error('user-then-boom');
            },
          });
          if (!isTypeOfInstalled) {
            User.isTypeOf = () => true;
            isTypeOfInstalled = true;
          }
          return onFulfilled?.(user);
        },
      };
    }

    const classic = singular(
      await executeClassic({
        schema,
        document,
        rootValue: { users: [makeItem()] },
      }),
    );
    delete (User as { isTypeOf?: unknown }).isTypeOf;

    const planned = singular(
      await executePlanned({
        schema,
        document,
        rootValue: { users: [makeItem()] },
      }),
    );
    delete (User as { isTypeOf?: unknown }).isTypeOf;

    expect(planned).toEqual(classic);
    expect(planned.errors).toBeUndefined();
    expect(planned.data).toEqual({ users: [{ id: 'a' }] });
  });

  it('4712362757 Phase B: chain then() throw before later slot accessor (User!)', async () => {
    const User = new GraphQLObjectType({
      name: 'User',
      fields: { id: { type: GraphQLString } },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          users: { type: new GraphQLList(new GraphQLNonNull(User)) },
        },
      }),
    });
    const document = parse('{ users { id } }');

    function makeList() {
      let slot1Reads = 0;
      const slot0 = {
        then(onFulfilled?: (v: unknown) => unknown) {
          onFulfilled?.({ id: 'a' });
          return {
            then() {
              throw new Error('chain-then-throw');
            },
          };
        },
      };
      const list: unknown[] = [slot0, undefined];
      Object.defineProperty(list, '1', {
        configurable: true,
        enumerable: true,
        get() {
          slot1Reads += 1;
          throw new Error('slot1-boom');
        },
      });
      return { list, getSlot1Reads: () => slot1Reads };
    }

    const c = makeList();
    const classic = singular(
      await executeClassic({
        schema,
        document,
        rootValue: { users: c.list },
      }),
    );
    const p = makeList();
    const planned = singular(
      await executePlanned({
        schema,
        document,
        rootValue: { users: p.list },
      }),
    );
    expect(planned).toEqual(classic);
    expect(classic.data).toEqual({ users: null });
    expect(classic.errors?.[0]?.message).toBe('chain-then-throw');
    expect(classic.errors?.[0]?.path).toEqual(['users', 0]);
    // Assert planned path directly — GraphQLError toEqual is message-only,
    // so a wrong planned path could hide behind planned === classic.
    expect(planned.errors?.[0]?.path).toEqual(['users', 0]);
    expect(c.getSlot1Reads()).toBe(0);
    expect(p.getSlot1Reads()).toBe(0);
  });

  it('4712721903 thin object-list method: array proxy getPrototypeOf once', async () => {
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

    function makeRoot() {
      let protoReads = 0;
      const arr = [{ id: 'a' }];
      const list = new Proxy(arr, {
        getPrototypeOf() {
          protoReads += 1;
          if (protoReads === 1) {
            return Array.prototype;
          }
          throw new Error('second getPrototypeOf');
        },
        get(target, prop, receiver) {
          if (prop === 'then') {
            return undefined;
          }
          return Reflect.get(target, prop, receiver);
        },
      });
      return {
        rootValue: {
          users() {
            return list;
          },
        },
        getProtoReads: () => protoReads,
      };
    }

    const c = makeRoot();
    const classic = singular(await executeClassic({ schema, document, rootValue: c.rootValue }));
    const p = makeRoot();
    const planned = singular(await executePlanned({ schema, document, rootValue: p.rootValue }));
    expect(planned).toEqual(classic);
    expect(planned.errors).toBeUndefined();
    expect(planned.data).toEqual({ users: [{ id: 'a' }] });
    expect(p.getProtoReads()).toBe(1);
    expect(c.getProtoReads()).toBe(1);
  });

  it('4712587204 thin object-list property: array proxy getPrototypeOf once', async () => {
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

    function makeRoot() {
      let protoReads = 0;
      const arr = [{ id: 'a' }];
      const users = new Proxy(arr, {
        getPrototypeOf() {
          protoReads += 1;
          if (protoReads === 1) {
            return Array.prototype;
          }
          throw new Error('second getPrototypeOf');
        },
        get(target, prop, receiver) {
          if (prop === 'then') {
            return undefined;
          }
          return Reflect.get(target, prop, receiver);
        },
      });
      return { rootValue: { users }, getProtoReads: () => protoReads };
    }

    const c = makeRoot();
    const classic = singular(await executeClassic({ schema, document, rootValue: c.rootValue }));
    const p = makeRoot();
    const planned = singular(await executePlanned({ schema, document, rootValue: p.rootValue }));
    expect(planned).toEqual(classic);
    expect(planned.errors).toBeUndefined();
    expect(planned.data).toEqual({ users: [{ id: 'a' }] });
    expect(p.getProtoReads()).toBe(1);
    expect(c.getProtoReads()).toBe(1);
  });

  it('4712587211 Phase B: sync chain then return must not trackAsync-cast', async () => {
    const User = new GraphQLObjectType({
      name: 'User',
      fields: { id: { type: GraphQLString } },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          users: { type: new GraphQLList(new GraphQLNonNull(User)) },
        },
      }),
    });
    const document = parse('{ users { id } }');

    function makeItem() {
      return {
        then(onFulfilled?: (v: unknown) => unknown) {
          onFulfilled?.({ id: 'a' });
          return {
            then(onFulfilled2?: (v: unknown) => unknown) {
              return onFulfilled2?.(undefined);
            },
          };
        },
      };
    }

    const planned = singular(
      await executePlanned({
        schema,
        document,
        rootValue: { users: [makeItem()] },
      }),
    );
    // Custom thenable whose `.then` returns undefined sync must not TypeError
    // inside trackAsync (cast-as-Promise). finishResolved already wrote the item.
    expect(planned.errors).toBeUndefined();
    expect(planned.data).toEqual({ users: [{ id: 'a' }] });
  });

  it('4709647621 Phase A stash: pending leaf must not reclassify as Error', async () => {
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

    function makeItem0(): Record<string, unknown> {
      const item0: Record<string, unknown> = {};
      Object.defineProperty(item0, 'id', {
        enumerable: true,
        configurable: true,
        get() {
          // Mid-field: become an Error without being an item-level Error handoff.
          Object.setPrototypeOf(item0, Error.prototype);
          return Promise.resolve('a');
        },
      });
      return item0;
    }

    // Fresh lists — the getter mutates the item prototype (cannot share).
    const classic = singular(
      await executeClassic({
        schema,
        document,
        rootValue: { users: [makeItem0(), { id: 'b' }] },
      }),
    );
    const planned = singular(
      await execute({
        plan: plan as never,
        rootValue: { users: [makeItem0(), { id: 'b' }] },
      }),
    );
    expect(planned).toEqual(classic);
    expect(planned.errors).toBeUndefined();
    expect(planned.data).toEqual({ users: [{ id: 'a' }, { id: 'b' }] });
  });
});
