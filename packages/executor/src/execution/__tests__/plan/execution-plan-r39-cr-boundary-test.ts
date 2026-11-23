/**
 * R39: dual-mode classic parity for CR 4705778433 / 4705778456 / 4705778468.
 * Classic = buildExecutionContext(..., null) + executeImpl (no plan),
 * or subscribe with planning disabled for per-event pristine.
 */
import {
  GraphQLBoolean,
  GraphQLID,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  parse,
} from 'graphql';
import { isAsyncIterable } from '@graphql-tools/utils';
import {
  buildExecutionContext,
  execute,
  executeImpl,
  setExecutionPlanningEnabled,
  subscribe,
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
  return (await executeImpl(ctx)) as SingularExecutionResult;
}

function singular(r: unknown): SingularExecutionResult {
  expect(r).toBeDefined();
  return r as SingularExecutionResult;
}

describe('R39 classic parity (CR 8433/8456/8468)', () => {
  afterEach(() => {
    setExecutionPlanningEnabled(true);
  });

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

    setExecutionPlanningEnabled(false);
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
    setExecutionPlanningEnabled(true);
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
