/**
 * Compile budget, opaque plan handle, merged @include siblings.
 */
import {
  GraphQLID,
  GraphQLInterfaceType,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLString,
  parse,
  valueFromASTUntyped,
} from 'graphql';
import { clearExecutionPlanCache, executeSync } from '../../execute.js';
import {
  compileExecutionPlan,
  getExecutionPlan,
  getPlannedFieldPlan,
  getPlannedSubfields,
  isExecutionPlan,
  isExecutionPlanningEnabled,
  setExecutionPlanningEnabled,
} from '../../plan.js';

/** Classic interpreter only (skip plan attachment). */

describe('plan compile budget', () => {
  it('marks oversized abstract nesting ineligible but classic execute still runs', () => {
    const BudgetNode = new GraphQLInterfaceType({
      name: 'BudgetNode',
      fields: () => ({
        id: { type: GraphQLID },
        child: { type: BudgetNode },
      }),
    });

    const implTypes: GraphQLObjectType[] = [];
    for (let index = 0; index < 12; index++) {
      const implName = `BudgetNode${index}`;
      implTypes.push(
        new GraphQLObjectType({
          name: implName,
          interfaces: [BudgetNode],
          fields: () => ({
            id: {
              type: GraphQLID,
              resolve: (src: { id?: string }) => src.id ?? implName,
            },
            child: {
              type: BudgetNode,
              resolve: (src: { id?: string; child?: unknown }) =>
                src.child ?? {
                  __typename: `BudgetNode${(index + 1) % 12}`,
                  id: `child-${index}`,
                },
            },
          }),
        }),
      );
    }

    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          root: {
            type: BudgetNode,
            resolve: () => ({ __typename: 'BudgetNode0', id: 'root' }),
          },
        },
      }),
      types: implTypes,
    });

    const depth = 6;
    const childSelection = ' child { id'.repeat(depth - 1);
    const closing = ' }'.repeat(depth - 1);
    const document = parse(`{ root { id${childSelection}${closing} } }`);

    expect(compileExecutionPlan({ schema, document })).toBeUndefined();
    const result = executeSync({ schema, document });
    expect(result.errors).toBeUndefined();
    expect(result.data?.root).toMatchObject({ id: 'root' });
  });

  it('does not reuse subfields across merged groups that share a primary FieldNode', () => {
    // Two parents spread the same fragment field `node { x }` but `a` also
    // selects `node { y }`. Compile must not skip `b.node` via primary-node
    // reuse and leak `y` into `b`.
    const Node = new GraphQLObjectType({
      name: 'HolderNode',
      fields: {
        x: { type: GraphQLString },
        y: { type: GraphQLString },
      },
    });
    const Holder = new GraphQLObjectType({
      name: 'Holder',
      fields: {
        node: { type: Node },
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          a: {
            type: Holder,
            resolve: () => ({ node: { x: 'ax', y: 'ay' } }),
          },
          b: {
            type: Holder,
            resolve: () => ({ node: { x: 'bx', y: 'by' } }),
          },
        },
      }),
    });
    const document = parse(`
      {
        a { ...Fields node { y } }
        b { ...Fields }
      }
      fragment Fields on Holder {
        node { x }
      }
    `);
    const plan = compileExecutionPlan({ schema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    const result = executeSync({ schema, document });
    expect(result).toEqual({
      data: {
        a: { node: { x: 'ax', y: 'ay' } },
        b: { node: { x: 'bx' } },
      },
    });
  });

  it('does not resolve another merged group via primary FieldNode under variable collection', () => {
    // Variable-dependent collection can produce a new fieldNodes array identity
    // at runtime that still shares the fragment's primary FieldNode with a
    // sibling group that selected extra subfields. Lookup must not fall back
    // to that primary and leak `y` into `b`.
    const Node = new GraphQLObjectType({
      name: 'VarHolderNode',
      fields: {
        x: { type: GraphQLString },
        y: { type: GraphQLString },
      },
    });
    const Holder = new GraphQLObjectType({
      name: 'VarHolder',
      fields: {
        node: { type: Node },
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          a: {
            type: Holder,
            resolve: () => ({ node: { x: 'ax', y: 'ay' } }),
          },
          b: {
            type: Holder,
            resolve: () => ({ node: { x: 'bx', y: 'by' } }),
          },
        },
      }),
    });
    const document = parse(`
      query ($extra: Boolean!) {
        a { ...Fields node { y } }
        b { ...Fields node @include(if: $extra) { y } }
      }
      fragment Fields on VarHolder {
        node { x }
      }
    `);
    const plan = compileExecutionPlan({ schema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    if (!isExecutionPlan(plan)) {
      return;
    }
    expect(plan.collectionDependsOnVariables).toBe(true);

    const aNodes = plan.rootFields.get('a')!;
    const aSub = plan.subfieldsByNodes.get(aNodes)?.get(Holder);
    const aNodeGroup = aSub?.get('node');
    expect(aNodeGroup?.length).toBeGreaterThan(1);
    const primary = aNodeGroup![0]!;

    // Runtime-shaped array: same primary AST node, new identity, no extra `y`.
    const runtimeBNodes = [primary];
    expect(getPlannedFieldPlan(plan, runtimeBNodes, Holder)).toBeUndefined();
    expect(getPlannedSubfields(plan, runtimeBNodes, Node)).toBeUndefined();

    const result = executeSync({
      schema,
      document,
      variableValues: { extra: false },
    });
    expect(result).toEqual({
      data: {
        a: { node: { x: 'ax', y: 'ay' } },
        b: { node: { x: 'bx' } },
      },
    });
  });

  it('rejects invalid schema before cold plan compile (no custom scalar parseLiteral)', () => {
    let parseLiteralCalls = 0;
    const Echo = new GraphQLScalarType({
      name: 'Echo',
      serialize: value => value,
      parseValue: value => value,
      parseLiteral(ast) {
        parseLiteralCalls += 1;
        return valueFromASTUntyped(ast);
      },
    });
    const Node = new GraphQLInterfaceType({
      name: 'Node',
      fields: {
        id: { type: new GraphQLNonNull(GraphQLID) },
      },
    });
    // Implements Node but omits `id` → schema is invalid.
    const Bad = new GraphQLObjectType({
      name: 'Bad',
      interfaces: [Node],
      fields: {
        echo: {
          type: Echo,
          args: { msg: { type: Echo } },
          resolve: (_source, args: { msg: unknown }) => args.msg,
        },
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          bad: { type: Bad, resolve: () => ({}) },
        },
      }),
      types: [Node, Bad],
    });
    const document = parse(`{ bad { echo(msg: "hi") } }`);
    clearExecutionPlanCache();
    const prevPlanning = isExecutionPlanningEnabled();
    setExecutionPlanningEnabled(true);
    try {
      expect(() => executeSync({ schema, document })).toThrow();
      expect(parseLiteralCalls).toBe(0);
      expect(getExecutionPlan(schema, document)).toBeUndefined();
    } finally {
      setExecutionPlanningEnabled(prevPlanning);
    }
    // Explicit compile on an equivalent valid schema still populates the cache.
    const Valid = new GraphQLObjectType({
      name: 'Valid',
      interfaces: [Node],
      fields: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        echo: {
          type: Echo,
          args: { msg: { type: Echo } },
          resolve: (_source: unknown, args: { msg: unknown }) => args.msg,
        },
      },
    });
    const validSchema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          bad: { type: Valid, resolve: () => ({}) },
        },
      }),
      types: [Node, Valid],
    });
    const validPlan = compileExecutionPlan({ schema: validSchema, document });
    expect(isExecutionPlan(validPlan)).toBe(true);
    expect(getExecutionPlan(validSchema, document)).toBe(validPlan);
  });
});

describe('opaque ExecutionPlan handle', () => {
  it('isExecutionPlan rejects duck-typed objects with plan-shaped fields', () => {
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: { ok: { type: GraphQLString, resolve: () => 'ok' } },
      }),
    });
    const document = parse('{ ok }');
    const plan = compileExecutionPlan({ schema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    // Public opacity: duck typing on schema/rootFields must not pass.
    expect(
      isExecutionPlan({
        schema,
        document,
        rootFields: new Map(),
      } as never),
    ).toBe(false);
  });
});

describe('merged sibling fields with @include (external review)', () => {
  it('does not leak name into user across include true/false orderings', () => {
    // Same primary FieldNode shape as `user { id }` vs `user @include { name }`.
    let idResolves = 0;
    let nameResolves = 0;
    const User = new GraphQLObjectType({
      name: 'IncludeUser',
      fields: {
        id: {
          type: GraphQLString,
          resolve: () => {
            idResolves += 1;
            return '1';
          },
        },
        name: {
          type: GraphQLString,
          resolve: () => {
            nameResolves += 1;
            return 'Ada';
          },
        },
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          user: { type: User, resolve: () => ({}) },
        },
      }),
    });
    const document = parse(`
      query ($includeExtra: Boolean!) {
        user {
          id
        }
        user @include(if: $includeExtra) {
          name
        }
      }
    `);
    const plan = compileExecutionPlan({ schema, document });
    expect(isExecutionPlan(plan)).toBe(true);

    const run = (includeExtra: boolean) => {
      idResolves = 0;
      nameResolves = 0;
      return executeSync({
        schema,
        document,
        variableValues: { includeExtra },
      });
    };

    // false → true (cache warm from skip, then include)
    expect(run(false)).toEqual({ data: { user: { id: '1' } } });
    expect(idResolves).toBe(1);
    expect(nameResolves).toBe(0);
    expect(run(true)).toEqual({ data: { user: { id: '1', name: 'Ada' } } });
    expect(idResolves).toBe(1);
    expect(nameResolves).toBe(1);

    // true → false (opposite order)
    expect(run(true)).toEqual({ data: { user: { id: '1', name: 'Ada' } } });
    expect(idResolves).toBe(1);
    expect(nameResolves).toBe(1);
    expect(run(false)).toEqual({ data: { user: { id: '1' } } });
    expect(idResolves).toBe(1);
    expect(nameResolves).toBe(0);

    // false → true → false
    expect(run(false)).toEqual({ data: { user: { id: '1' } } });
    expect(nameResolves).toBe(0);
    expect(run(true)).toEqual({ data: { user: { id: '1', name: 'Ada' } } });
    expect(nameResolves).toBe(1);
    expect(run(false)).toEqual({ data: { user: { id: '1' } } });
    expect(idResolves).toBe(1);
    expect(nameResolves).toBe(0);
  });
});
