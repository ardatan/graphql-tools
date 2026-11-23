/**
 * Locks the dual-mode planning switch used to re-run core correctness tests
 * with planning disabled (classic interpreter only).
 *
 * See npm scripts `test:executor:core` / `test:executor:core:classic` /
 * `test:executor:dual-mode` and planned-execution docs.
 */
import { GraphQLObjectType, GraphQLSchema, GraphQLString, parse } from 'graphql';
import {
  clearExecutionPlanCache,
  executeSync,
  isExecutionPlanningEnabled,
  setExecutionPlanningEnabled,
} from '../../execute.js';
import { getExecutionPlan } from '../../plan.js';

describe('execution planning dual-mode switch', () => {
  const schema = new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'Query',
      fields: {
        hello: { type: GraphQLString, resolve: () => 'world' },
      },
    }),
  });
  const document = parse('{ hello }');

  afterEach(() => {
    setExecutionPlanningEnabled(true);
    clearExecutionPlanCache(document);
  });

  it('defaults to planning enabled and caches a plan on execute', () => {
    clearExecutionPlanCache(document);
    expect(isExecutionPlanningEnabled()).toBe(true);
    expect(executeSync({ schema, document })).toEqual({ data: { hello: 'world' } });
    expect(getExecutionPlan(schema, document)).toBeDefined();
  });

  it('does not compile or cache a plan when planning is disabled', () => {
    clearExecutionPlanCache(document);
    setExecutionPlanningEnabled(false);
    expect(isExecutionPlanningEnabled()).toBe(false);
    expect(executeSync({ schema, document })).toEqual({ data: { hello: 'world' } });
    expect(getExecutionPlan(schema, document)).toBeUndefined();
  });
});
