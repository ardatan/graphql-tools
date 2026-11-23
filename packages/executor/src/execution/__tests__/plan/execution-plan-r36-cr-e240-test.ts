/**
 * R36: dual-mode classic parity for CR 4701777520 / 4701777511 / 4701777525.
 * Classic = buildExecutionContext(..., null) + executeImpl (no plan).
 */
import {
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
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
      const planned = singular(await execute({ schema, document, rootValue }));
      expect(classic.data).toEqual({ user: { profile: null, label: 'L' } });
      expect(classic.errors?.[0]?.path).toEqual(['user', 'profile', 'id']);
      expect(planned.data).toEqual(classic.data);
      expect(planned.errors?.[0]?.path).toEqual(classic.errors?.[0]?.path);
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
