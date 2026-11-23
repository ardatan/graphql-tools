/**
 * R38: dual-mode classic parity for CR 4702060963 / 4702079292.
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
