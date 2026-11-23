/**
 * R37: dual-mode classic parity for CR pushbacks on 4701777511 / 4701777525 /
 * Major 4701891868 (stashed partial / live isTypeOf / one-shot getters).
 * Classic = buildExecutionContext(..., null) + executeImpl (no plan).
 */
import {
  GraphQLID,
  GraphQLList,
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
