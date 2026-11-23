/**
 * Compile-time walker selection stamps on planned execution lists.
 */
import { GraphQLObjectType, GraphQLSchema, GraphQLString, parse } from 'graphql';
import { compileExecutionPlan, isExecutionPlan, type InternalExecutionPlan } from '../../plan.js';
import { getPlannedSubfieldExecutions } from '../../planField.js';

describe('planned execution walker stamps', () => {
  it('stamps plainDefault + Fast eligibility on nestedDefault subfields', () => {
    const Friend = new GraphQLObjectType({
      name: 'Friend',
      fields: { name: { type: GraphQLString } },
    });
    const Item = new GraphQLObjectType({
      name: 'Item',
      fields: {
        name: { type: GraphQLString },
        friend: { type: Friend },
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          items: { type: Item },
        },
      }),
    });
    const document = parse('{ items { name friend { name } } }');
    const plan = compileExecutionPlan({ schema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    const internal = plan as InternalExecutionPlan;
    // Root executions for Query.items
    const root = internal.rootExecutions;
    expect(root).toBeDefined();
    expect(root!.plainDefaultSchemaEligible).toBe(true);
    expect(root!.mayBubbleNonNull).toBe(false);
    expect(root!.syncObjectFastSchemaEligible).toBe(true);

    const itemsNodes = root![0].fieldNodes;
    const itemSubs = getPlannedSubfieldExecutions(internal, itemsNodes, Item);
    expect(itemSubs).toBeDefined();
    expect((itemSubs as any).plainDefaultSchemaEligible).toBe(true);
    expect((itemSubs as any).mayBubbleNonNull).toBe(false);
    expect((itemSubs as any).syncObjectFastSchemaEligible).toBe(true);

    const friendExec = itemSubs!.find(e => e.responseName === 'friend');
    expect(friendExec).toBeDefined();
    const friendSubs = getPlannedSubfieldExecutions(internal, friendExec!.fieldNodes, Friend);
    expect(friendSubs).toBeDefined();
    expect((friendSubs as any).plainDefaultSchemaEligible).toBe(true);
  });
});
