/**
 * R35: dual-mode classic parity for CR triage 4700986037 / 4700986045 / 4700986050.
 * Classic = buildExecutionContext(..., null) + executeImpl (no plan).
 */
import {
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLString,
  Kind,
  parse,
} from 'graphql';
import {
  buildExecutionContext,
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
  return (await executeImpl(ctx)) as SingularExecutionResult;
}

function singular(r: unknown): SingularExecutionResult {
  expect(r).toBeDefined();
  return r as SingularExecutionResult;
}

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
    const planned = singular(await execute({ schema, document, rootValue }));
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
    const planned = singular(await execute({ schema, document, rootValue }));
    expect(classic.data).toEqual({ user: { profile: null, label: 'L' } });
    expect(classic.errors?.[0]?.path).toEqual(['user', 'profile', 'id']);
    expect(planned.data).toEqual(classic.data);
    expect(planned.errors?.[0]?.path).toEqual(classic.errors?.[0]?.path);
  });
});
