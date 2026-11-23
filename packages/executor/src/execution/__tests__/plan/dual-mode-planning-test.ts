/**
 * Locks the dual-mode planning switch used to re-run core correctness tests
 * with planning disabled (classic interpreter only).
 *
 * `setExecutionPlanningEnabled` is process-global (not per-request); tests
 * restore `true` in `afterEach`. Prefer `GRAPHQL_TOOLS_EXECUTOR_PLANNING=0`
 * for process-wide classic runs.
 *
 * See npm scripts `test:executor:core` / `test:executor:core:classic` /
 * `test:executor:dual-mode` (also CI job `test-executor-dual-mode`) and
 * planned-execution docs.
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
  clearExecutionPlanCache,
  execute,
  executeSync,
  isExecutionPlanningEnabled,
  setExecutionPlanningEnabled,
} from '../../execute.js';
import { compileExecutionPlan, getExecutionPlan, isExecutionPlan } from '../../plan.js';

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

describe('classic independent expected results (planning off)', () => {
  afterEach(() => {
    setExecutionPlanningEnabled(true);
  });

  beforeEach(() => {
    setExecutionPlanningEnabled(false);
    expect(isExecutionPlanningEnabled()).toBe(false);
  });

  it('returns explicit scalar/object/list shapes without consulting the plan cache', () => {
    const Item = new GraphQLObjectType({
      name: 'ClassicItem',
      fields: { id: { type: new GraphQLNonNull(GraphQLString) } },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          hello: { type: GraphQLString, resolve: () => 'world' },
          users: {
            type: new GraphQLList(new GraphQLNonNull(Item)),
            resolve: () => [{ id: '1' }, { id: '2' }],
          },
          values: {
            type: new GraphQLList(GraphQLInt),
            resolve: () => [1, null, 3],
          },
        },
      }),
    });
    const document = parse('{ hello users { id } values }');
    clearExecutionPlanCache(document);
    expect(executeSync({ schema, document })).toEqual({
      data: {
        hello: 'world',
        users: [{ id: '1' }, { id: '2' }],
        values: [1, null, 3],
      },
    });
    expect(getExecutionPlan(schema, document)).toBeUndefined();
  });

  it('localizes NonNull list-item null at the item path (absolute expectation)', () => {
    const Item = new GraphQLObjectType({
      name: 'ClassicNNItem',
      fields: { id: { type: new GraphQLNonNull(GraphQLString) } },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          users: {
            type: new GraphQLList(new GraphQLNonNull(Item)),
            resolve: () => [{ id: '1' }, null],
          },
          ok: { type: GraphQLString, resolve: () => 'yes' },
        },
      }),
    });
    const document = parse('{ users { id } ok }');
    const result = executeSync({ schema, document });
    expect(result).toMatchObject({
      data: { users: null, ok: 'yes' },
      errors: [{ path: ['users', 1], message: expect.stringContaining('non-nullable') }],
    });
    expect(getExecutionPlan(schema, document)).toBeUndefined();
  });

  it('strips GraphQLError CRITICAL_ERROR extensions on leaf serialize (absolute)', () => {
    const ExtScalar = new GraphQLScalarType({
      name: 'ClassicExtScalar',
      serialize(value: unknown) {
        if (value === 1) {
          throw new GraphQLError('boom', { extensions: { CRITICAL_ERROR: true } });
        }
        if (value == null) {
          return null;
        }
        return String(value);
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          values: {
            type: new GraphQLList(ExtScalar),
            resolve: () => [1, null],
          },
          ok: { type: GraphQLString, resolve: () => 'yes' },
        },
      }),
    });
    const document = parse('{ values ok }');
    const result = executeSync({ schema, document });
    expect(result).toMatchObject({
      data: { values: [null, null], ok: 'yes' },
      errors: [{ message: 'boom', path: ['values', 0] }],
    });
    expect(result.errors?.[0]?.extensions?.['CRITICAL_ERROR']).toBeUndefined();
  });

  it('does not populate the plan cache; explicit compile remains a separate API', () => {
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: { hello: { type: GraphQLString, resolve: () => 'x' } },
      }),
    });
    const document = parse('{ hello }');
    clearExecutionPlanCache(document);
    expect(executeSync({ schema, document })).toEqual({ data: { hello: 'x' } });
    expect(getExecutionPlan(schema, document)).toBeUndefined();
    // Explicit compile is independent of the kill-switched execute path.
    expect(isExecutionPlan(compileExecutionPlan({ schema, document }))).toBe(true);
  });

  it('async list reject localizes path without planning', async () => {
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          values: {
            type: new GraphQLList(GraphQLString),
            resolve: () => [Promise.reject(new Error('classic-rej'))],
          },
          ok: { type: GraphQLString, resolve: () => 'yes' },
        },
      }),
    });
    const document = parse('{ values ok }');
    const result = await execute({ schema, document });
    expect(result).toMatchObject({
      data: { values: [null], ok: 'yes' },
      errors: [{ message: 'classic-rej', path: ['values', 0] }],
    });
    expect(getExecutionPlan(schema, document)).toBeUndefined();
  });
});
