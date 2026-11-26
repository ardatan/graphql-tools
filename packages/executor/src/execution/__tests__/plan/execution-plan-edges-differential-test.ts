/**
 * Classic vs planned differential parity (incl. R9/R31/R32).
 */
import {
  GraphQLBoolean,
  GraphQLError,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLString,
  GraphQLUnionType,
  parse,
} from 'graphql';
import {
  buildExecutionContext,
  clearExecutionPlanCache,
  execute,
  executeImpl,
  executeSync,
  type SingularExecutionResult,
} from '../../execute.js';
import {
  compileExecutionPlan,
  getExecutionPlan,
  getPlannedFieldPlan,
  isExecutionPlan,
  isExecutionPlanningEnabled,
  type InternalExecutionPlan,
} from '../../plan.js';

/** Classic interpreter only (skip plan attachment). */
function executeClassicSync(args: Parameters<typeof executeSync>[0]): SingularExecutionResult {
  const ctx = buildExecutionContext(args, null);
  if (!('schema' in ctx)) {
    return { errors: [...ctx] };
  }
  const result = executeImpl(ctx);
  if (result != null && typeof result === 'object' && 'then' in result) {
    throw new Error('expected synchronous classic result');
  }
  if (result != null && typeof result === 'object' && 'initialResult' in result) {
    throw new Error('expected singular classic result');
  }
  return result as SingularExecutionResult;
}

async function executeClassic(
  args: Parameters<typeof execute>[0],
): Promise<SingularExecutionResult> {
  const ctx = buildExecutionContext(args, null);
  if (!('schema' in ctx)) {
    return { errors: [...ctx] };
  }
  const result = await executeImpl(ctx);
  if (result != null && typeof result === 'object' && 'initialResult' in result) {
    throw new Error('expected singular classic result');
  }
  return result as SingularExecutionResult;
}

function assertSingular(result: unknown): SingularExecutionResult {
  if (result != null && typeof result === 'object' && 'initialResult' in (result as object)) {
    throw new Error('expected singular result');
  }
  return result as SingularExecutionResult;
}

describe('classic vs planned differential', () => {
  it('matches classic results, errors, and null bubbling on a focused schema', async () => {
    const User = new GraphQLObjectType({
      name: 'DiffUser',
      fields: {
        id: { type: new GraphQLNonNull(GraphQLString) },
        name: { type: GraphQLString },
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          user: {
            type: User,
            args: { boom: { type: GraphQLBoolean } },
            resolve: (_source, args: { boom?: boolean | null }) => {
              if (args.boom) {
                throw new Error('user boom');
              }
              return { id: '1', name: 'Ada' };
            },
          },
          nullableUser: {
            type: User,
            resolve: () => ({
              id: '2',
              get name() {
                throw new Error('name boom');
              },
            }),
          },
          // Non-null child null → parent null + path brokenUser.id
          brokenUser: {
            type: User,
            resolve: () => ({
              id: null,
              name: 'Ada',
            }),
          },
          // Async variant of the same NonNull bubble.
          brokenUserAsync: {
            type: User,
            resolve: async () => ({
              id: null,
              name: 'Ada',
            }),
          },
          // Non-null list item: one element has id: null.
          users: {
            type: new GraphQLList(new GraphQLNonNull(User)),
            resolve: () => [
              { id: '1', name: 'Ada' },
              { id: null, name: 'Bad' },
              { id: '3', name: 'Grace' },
            ],
          },
        },
      }),
    });

    const cases: Array<{
      document: string;
      variableValues?: Record<string, unknown>;
      async?: boolean;
    }> = [
      { document: '{ user { id name } }' },
      { document: '{ user(boom: true) { id name } }' },
      { document: '{ nullableUser { id name } }' },
      { document: '{ brokenUser { id name } }' },
      { document: '{ brokenUserAsync { id name } }', async: true },
      { document: '{ users { id name } }' },
      {
        document: 'query ($extra: Boolean!) { user { id } user @include(if: $extra) { name } }',
        variableValues: { extra: false },
      },
      {
        document: 'query ($extra: Boolean!) { user { id } user @include(if: $extra) { name } }',
        variableValues: { extra: true },
      },
    ];

    for (const { document: source, variableValues, async: isAsync } of cases) {
      const document = parse(source);
      const args = { schema, document, variableValues };
      if (isAsync) {
        const planned = await execute(args);
        const classicCtx = buildExecutionContext(args, null);
        expect('schema' in classicCtx).toBe(true);
        if (!('schema' in classicCtx)) {
          throw new Error('expected classic execution context');
        }
        const classic = await executeImpl(classicCtx);
        expect(planned).toEqual(classic);
        expect(planned).toMatchObject({
          data: { brokenUserAsync: null },
          errors: [{ path: ['brokenUserAsync', 'id'] }],
        });
      } else {
        const planned = executeSync(args);
        const classic = executeClassicSync(args);
        expect(planned).toEqual(classic);
      }
    }

    // Explicit NonNull bubbling shape (planned).
    const broken = executeSync({ schema, document: parse('{ brokenUser { id name } }') });
    expect(broken).toMatchObject({
      data: { brokenUser: null },
      errors: [{ path: ['brokenUser', 'id'] }],
    });
    const users = executeSync({ schema, document: parse('{ users { id name } }') });
    expect(users).toMatchObject({
      data: { users: null },
      errors: [{ path: ['users', 1, 'id'] }],
    });
  });
});

describe('differential parity: classic vs planned (R9)', () => {
  afterEach(() => {
    clearExecutionPlanCache();
  });

  describe('fast-path coverage via plan IR', () => {
    it('compiles object-list + leaf-list kinds for thin/default-resolve fields', () => {
      const Item = new GraphQLObjectType({
        name: 'DiffItem',
        fields: { id: { type: new GraphQLNonNull(GraphQLString) } },
      });
      const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            users: { type: new GraphQLList(new GraphQLNonNull(Item)) },
            tags: { type: new GraphQLList(GraphQLString) },
          },
        }),
      });
      const document = parse('{ users { id } tags }');
      const plan = compileExecutionPlan({ schema, document });
      expect(isExecutionPlan(plan)).toBe(true);
      if (!isExecutionPlan(plan)) {
        return;
      }
      const internal = plan as InternalExecutionPlan;
      expect(internal.rootExecutions).toBeDefined();
      const kinds = new Set((internal.rootExecutions ?? []).map(ex => ex.fieldPlan.kind));
      expect(kinds.has('list')).toBe(true);
      expect(kinds.has('leafList')).toBe(true);
      // Exact array identity: look up via rootExecutions' fieldNodes.
      for (const ex of internal.rootExecutions ?? []) {
        expect(getPlannedFieldPlan(internal, ex.fieldNodes)).toBe(ex.fieldPlan);
      }
      const listPlans = (internal.rootExecutions ?? [])
        .map(ex => ex.fieldPlan)
        .filter(fp => fp.kind === 'list');
      expect(listPlans.every(fp => fp.resolveKind === 'defaultProperty')).toBe(true);
    });

    it('hits object-list thin path once per accessor (planned == classic counts)', () => {
      let reads = 0;
      const Item = new GraphQLObjectType({
        name: 'CountItem',
        fields: { id: { type: new GraphQLNonNull(GraphQLString) } },
      });
      const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            users: { type: new GraphQLList(new GraphQLNonNull(Item)) },
          },
        }),
      });
      const document = parse('{ users { id } }');
      const makeRoot = () => ({
        users() {
          const users = [{ id: '1' }, { id: '2' }];
          return new Proxy(users, {
            get(target, prop, receiver) {
              if (prop === '0' || prop === '1') {
                reads += 1;
              }
              return Reflect.get(target, prop, receiver);
            },
          });
        },
      });
      reads = 0;
      const planned = executeSync({ schema, document, rootValue: makeRoot() });
      const plannedReads = reads;
      reads = 0;
      const classic = executeClassicSync({ schema, document, rootValue: makeRoot() });
      expect(planned).toEqual(classic);
      expect(planned).toEqual({ data: { users: [{ id: '1' }, { id: '2' }] } });
      expect(plannedReads).toBe(reads);
      expect(plannedReads).toBe(2);
    });
  });

  describe('cold vs warm vs classic', () => {
    it('matches classic on cold compile and warm reuse with independent rootValues', () => {
      const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            echo: {
              type: GraphQLString,
              args: { v: { type: GraphQLString } },
              resolve: (_s, args: { v?: string | null }) => args.v ?? null,
            },
          },
        }),
      });
      const document = parse('query ($v: String) { echo(v: $v) }');
      clearExecutionPlanCache(document);
      const cold = executeSync({
        schema,
        document,
        variableValues: { v: 'cold' },
      });
      const coldPlan = getExecutionPlan(schema, document);
      expect(isExecutionPlan(coldPlan)).toBe(true);
      const warm = executeSync({
        schema,
        document,
        variableValues: { v: 'warm' },
      });
      expect(getExecutionPlan(schema, document)).toBe(coldPlan);
      const classicCold = executeClassicSync({
        schema,
        document,
        variableValues: { v: 'cold' },
      });
      const classicWarm = executeClassicSync({
        schema,
        document,
        variableValues: { v: 'warm' },
      });
      expect(cold).toEqual(classicCold);
      expect(warm).toEqual(classicWarm);
      expect(cold).toEqual({ data: { echo: 'cold' } });
      expect(warm).toEqual({ data: { echo: 'warm' } });
    });
  });

  describe('AbortSignal parity', () => {
    it('throws the same abort on planned and classic mid-walk', () => {
      const controllerP = new AbortController();
      const controllerC = new AbortController();
      const abortUser = new GraphQLObjectType({
        name: 'AbortUser',
        fields: {
          id: { type: GraphQLString },
          name: { type: GraphQLString },
        },
      });
      const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            user: { type: abortUser },
          },
        }),
      });
      const document = parse('{ user { id name } }');
      const makeRoot = (controller: AbortController) => ({
        user: {
          get id() {
            controller.abort();
            throw new Error('id after abort');
          },
          get name() {
            return 'Ada';
          },
        },
      });
      expect(() =>
        executeSync({
          schema,
          document,
          rootValue: makeRoot(controllerP),
          signal: controllerP.signal,
        }),
      ).toThrow(DOMException);
      expect(() =>
        executeClassicSync({
          schema,
          document,
          rootValue: makeRoot(controllerC),
          signal: controllerC.signal,
        }),
      ).toThrow(DOMException);
    });
  });

  describe('error metadata parity', () => {
    it('matches path/locations/coordinate for GraphQLError with existing path', async () => {
      const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            users: { type: new GraphQLList(GraphQLString) },
            ok: { type: GraphQLString, resolve: () => 'yes' },
          },
        }),
      });
      const document = parse('{ users ok }');
      const prelocated = new GraphQLError('pre', {
        path: ['users', 0],
      });
      const rootValue = { users: [Promise.reject(prelocated)] };
      const args = { schema, document, rootValue, schemaCoordinateInErrors: true };
      const planned = assertSingular(await execute(args));
      const classic = await executeClassic(args);
      expect(planned).toEqual(classic);
      expect(planned).toMatchObject({
        data: { users: [null], ok: 'yes' },
        errors: [{ message: 'pre', path: ['users', 0] }],
      });
    });
  });

  describe('seeded property differential', () => {
    const SEED = 0xc0ffee;
    const CASES = 48;

    /** Mulberry32 — deterministic seeded PRNG for property cases. */
    function mulberry32(seed: number): () => number {
      let t = seed >>> 0;
      return () => {
        t += 0x6d2b79f5;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
      };
    }

    it(`matches classic on ${CASES} seeded workloads (seed=0x${SEED.toString(16)})`, () => {
      const rand = mulberry32(SEED);
      const failures: string[] = [];

      for (let caseIndex = 0; caseIndex < CASES; caseIndex++) {
        const nFields = 1 + Math.floor(rand() * 4);
        const useList = rand() > 0.4;
        const useNonNullItem = rand() > 0.5;
        const injectNull = rand() > 0.7;
        const injectError = rand() > 0.85;
        const useAlias = rand() > 0.6;
        const useSkip = rand() > 0.75;

        const fields: Record<string, unknown> = {};
        const root: Record<string, unknown> = {};
        const selections: string[] = [];

        for (let i = 0; i < nFields; i++) {
          const name = `f${i}`;
          if (useList) {
            const itemType = useNonNullItem ? new GraphQLNonNull(GraphQLInt) : GraphQLInt;
            fields[name] = { type: new GraphQLList(itemType) };
            const values: Array<number | null> = [Math.floor(rand() * 10), Math.floor(rand() * 10)];
            if (injectNull) {
              values[1] = null;
            }
            if (injectError && i === 0) {
              root[name] = () => {
                throw new Error(`boom-${caseIndex}`);
              };
            } else {
              root[name] = values;
            }
          } else {
            fields[name] = { type: GraphQLString };
            root[name] =
              injectError && i === 0
                ? () => {
                    throw new Error(`boom-${caseIndex}`);
                  }
                : `v${i}-${caseIndex}`;
          }
          const alias = useAlias ? `a${i}: ` : '';
          const skip = useSkip && i === nFields - 1 ? ' @skip(if: $s)' : '';
          selections.push(`  ${alias}${name}${skip}`);
        }

        const schema = new GraphQLSchema({
          query: new GraphQLObjectType({
            name: 'Query',
            fields: fields as Record<
              string,
              { type: typeof GraphQLString | GraphQLList<typeof GraphQLInt> }
            >,
          }),
        });
        const source = useSkip
          ? `query ($s: Boolean!) {\n${selections.join('\n')}\n}`
          : `{\n${selections.join('\n')}\n}`;
        const document = parse(source);
        const variableValues = useSkip ? { s: rand() > 0.5 } : undefined;
        // Independent root/resolver state per mode — shared mutable roots can
        // hide planned vs classic ordering differences.
        const makeRoot = (): Record<string, unknown> => {
          const next: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(root)) {
            if (typeof value === 'function') {
              const fn = value as () => unknown;
              next[key] = () => fn();
            } else if (Array.isArray(value)) {
              next[key] = value.slice();
            } else {
              next[key] = value;
            }
          }
          return next;
        };

        try {
          const planned = executeSync({
            schema,
            document,
            rootValue: makeRoot(),
            variableValues,
          });
          const classic = executeClassicSync({
            schema,
            document,
            rootValue: makeRoot(),
            variableValues,
          });
          expect(planned).toEqual(classic);
        } catch (err) {
          failures.push(`case ${caseIndex}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      expect(failures).toEqual([]);
    });

    (process.env['LEAK_TEST'] ? it.skip : it)(
      'matches classic on seeded async list mixtures',
      async () => {
        const rand = mulberry32(SEED ^ 0xabc);
        const failures: string[] = [];
        for (let caseIndex = 0; caseIndex < 24; caseIndex++) {
          const mode = Math.floor(rand() * 4);
          const makeSchema = () =>
            new GraphQLSchema({
              query: new GraphQLObjectType({
                name: 'Query',
                fields: {
                  values: {
                    type: new GraphQLList(GraphQLString),
                    resolve: () => {
                      if (mode === 0) {
                        return ['a', 'b'];
                      }
                      if (mode === 1) {
                        return [Promise.resolve('a'), Promise.resolve('b')];
                      }
                      if (mode === 2) {
                        return ['a', Promise.reject(new Error(`rej-${caseIndex}`))];
                      }
                      return [Promise.resolve(new Error(`res-err-${caseIndex}`)), 'b'];
                    },
                  },
                  ok: { type: GraphQLString, resolve: () => 'yes' },
                },
              }),
            });
          const document = parse('{ values ok }');
          try {
            const planned = assertSingular(await execute({ schema: makeSchema(), document }));
            const classic = await executeClassic({ schema: makeSchema(), document });
            expect(planned).toEqual(classic);
          } catch (err) {
            failures.push(
              `async case ${caseIndex}: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }
        expect(failures).toEqual([]);
      },
    );
  });

  describe('union / fragment differential', () => {
    it('matches classic for union + fragment + alias', () => {
      const Dog = new GraphQLObjectType({
        name: 'Dog',
        fields: {
          name: { type: GraphQLString },
          bark: { type: GraphQLInt },
        },
      });
      const Cat = new GraphQLObjectType({
        name: 'Cat',
        fields: {
          name: { type: GraphQLString },
          meow: { type: GraphQLInt },
        },
      });
      const Pet = new GraphQLUnionType({
        name: 'Pet',
        types: [Dog, Cat],
        resolveType(value: { __typename?: string }) {
          return value.__typename === 'Cat' ? 'Cat' : 'Dog';
        },
      });
      const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            pet: { type: Pet },
          },
        }),
        types: [Dog, Cat],
      });
      const document = parse(`{
        pet {
          ... on Dog { dname: name bark }
          ... on Cat { cname: name meow }
        }
      }`);
      const rootValue = { pet: { __typename: 'Dog', name: 'Rex', bark: 3 } };
      const planned = executeSync({ schema, document, rootValue });
      const classic = executeClassicSync({ schema, document, rootValue });
      expect(planned).toEqual(classic);
      expect(planned).toEqual({
        data: { pet: { dname: 'Rex', bark: 3 } },
      });
    });
  });

  describe('custom scalar serialize counts', () => {
    it('does not double-serialize on planned vs classic', () => {
      let calls = 0;
      const Counting = new GraphQLScalarType({
        name: 'Counting',
        serialize(value: unknown) {
          calls += 1;
          return String(value);
        },
      });
      const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            values: {
              type: new GraphQLList(Counting),
              resolve: () => ['x', 'y', 'z'],
            },
          },
        }),
      });
      const document = parse('{ values }');
      calls = 0;
      const planned = executeSync({ schema, document });
      const plannedCalls = calls;
      calls = 0;
      const classic = executeClassicSync({ schema, document });
      expect(planned).toEqual(classic);
      expect(plannedCalls).toBe(calls);
      expect(plannedCalls).toBe(3);
    });
  });

  // R31 audit P0s: root CRITICAL_ERROR strip, thin list skip/include deferral,
  // async leaf-list nullish serialize without double-serialize.
  describe('R31 classic-parity P0s', () => {
    it('strips CRITICAL_ERROR on root default-property leaf serialize', () => {
      const Ser = new GraphQLScalarType({
        name: 'R31RootCritSer',
        serialize() {
          throw new GraphQLError('boom', {
            extensions: { CRITICAL_ERROR: true },
          });
        },
      });
      const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            a: { type: Ser },
            other: { type: GraphQLString },
          },
        }),
      });
      const document = parse('{ a other }');
      const rootValue = { a: 1, other: 'ok' };
      const planned = executeSync({ schema, document, rootValue });
      const classic = executeClassicSync({ schema, document, rootValue });
      expect(planned).toEqual(classic);
      expect(planned).toEqual({
        data: { a: null, other: 'ok' },
        errors: [expect.objectContaining({ message: 'boom', path: ['a'] })],
      });
      expect(planned.errors?.[0]?.extensions?.['CRITICAL_ERROR']).toBeUndefined();
    });

    it('empty thin object-list does not evaluate child @include before resolve', async () => {
      let reads = 0;
      const Item = new GraphQLObjectType({
        name: 'R31SkipItem',
        fields: {
          id: { type: GraphQLString },
          name: { type: GraphQLString },
        },
      });
      const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            items: { type: new GraphQLList(Item) },
            ok: { type: GraphQLString, resolve: () => 'yes' },
          },
        }),
      });
      const document = parse('query ($show: Boolean) { items { id name @include(if: $show) } ok }');
      const rootValue = {
        get items() {
          reads += 1;
          return [];
        },
      };
      const planned = assertSingular(
        await execute({ schema, document, rootValue, variableValues: { show: null } }),
      );
      const classic = await executeClassic({
        schema,
        document,
        rootValue,
        variableValues: { show: null },
      });
      expect(planned).toEqual(classic);
      expect(planned).toEqual({ data: { items: [], ok: 'yes' } });
      expect(reads).toBeGreaterThanOrEqual(1);
    });

    it('non-empty thin object-list @include(null) localizes at items.0', async () => {
      const Item = new GraphQLObjectType({
        name: 'R31SkipItem2',
        fields: {
          id: { type: GraphQLString },
          name: { type: GraphQLString },
        },
      });
      const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            items: { type: new GraphQLList(Item) },
            ok: { type: GraphQLString, resolve: () => 'yes' },
          },
        }),
      });
      const document = parse('query ($show: Boolean) { items { id name @include(if: $show) } ok }');
      const rootValue = { items: [{ id: '1', name: 'n' }] };
      const planned = assertSingular(
        await execute({ schema, document, rootValue, variableValues: { show: null } }),
      );
      const classic = await executeClassic({
        schema,
        document,
        rootValue,
        variableValues: { show: null },
      });
      expect(planned).toEqual(classic);
      expect(planned.data).toEqual({ items: [null], ok: 'yes' });
      expect(planned.errors?.[0]?.path).toEqual(['items', 0]);
    });

    it('async leaf-list nullish serialize does not double-serialize', async () => {
      let calls = 0;
      const Ser = new GraphQLScalarType({
        name: 'R31Twice',
        serialize(value: unknown) {
          calls += 1;
          if (calls === 1) {
            return null;
          }
          return `second:${calls}:${String(value)}`;
        },
      });
      const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            values: {
              type: new GraphQLList(Ser),
              resolve: () => [Promise.resolve(1)],
            },
            ok: { type: GraphQLString, resolve: () => 'yes' },
          },
        }),
      });
      const document = parse('{ values ok }');
      calls = 0;
      const planned = assertSingular(await execute({ schema, document }));
      const plannedCalls = calls;
      calls = 0;
      const classic = await executeClassic({ schema, document });
      expect(planned).toEqual(classic);
      expect(plannedCalls).toBe(1);
      expect(calls).toBe(1);
      expect(planned).toMatchObject({
        data: { values: [null], ok: 'yes' },
        errors: [expect.objectContaining({ path: ['values', 0] })],
      });
    });

    it('live isTypeOf after plan compile declines thin object-list', async () => {
      const Item = new GraphQLObjectType({
        name: 'R31LiveIsTypeOfItem',
        fields: { id: { type: GraphQLString } },
      });
      const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: { items: { type: new GraphQLList(Item) } },
        }),
      });
      const document = parse('{ items { id } }');
      const plan = compileExecutionPlan({ schema, document });
      if (!isExecutionPlan(plan)) {
        throw new Error('expected execution plan');
      }
      // Mutate after compile; warm get-or-compile reuses the cached plan shell.
      Item.isTypeOf = () => false;
      const rootValue = { items: [{ id: 'a' }] };
      const planned = assertSingular(await execute({ schema, document, rootValue }));
      const classic = await executeClassic({ schema, document, rootValue });
      expect(planned).toEqual(classic);
      expect(planned.data).toEqual({ items: [null] });
      expect(planned.errors?.[0]?.path).toEqual(['items', 0]);
    });

    it('null thin object-list item does not evaluate child @include', async () => {
      const Item = new GraphQLObjectType({
        name: 'R31NullItemSkip',
        fields: {
          id: { type: GraphQLString },
          name: { type: GraphQLString },
        },
      });
      const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            items: { type: new GraphQLList(Item) },
            ok: { type: GraphQLString, resolve: () => 'yes' },
          },
        }),
      });
      const document = parse('query ($show: Boolean) { items { id name @include(if: $show) } ok }');
      const rootValue = { items: [null] };
      const planned = assertSingular(
        await execute({ schema, document, rootValue, variableValues: { show: null } }),
      );
      const classic = await executeClassic({
        schema,
        document,
        rootValue,
        variableValues: { show: null },
      });
      expect(planned).toEqual(classic);
      expect(planned).toEqual({ data: { items: [null], ok: 'yes' } });
    });

    it('multi-item thin object-list @include(null) errors per item', async () => {
      const Item = new GraphQLObjectType({
        name: 'R31MultiItemSkip',
        fields: {
          id: { type: GraphQLString },
          name: { type: GraphQLString },
        },
      });
      const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            items: { type: new GraphQLList(Item) },
            ok: { type: GraphQLString, resolve: () => 'yes' },
          },
        }),
      });
      const document = parse('query ($show: Boolean) { items { id name @include(if: $show) } ok }');
      const rootValue = { items: [{ id: '1' }, { id: '2' }] };
      const planned = assertSingular(
        await execute({ schema, document, rootValue, variableValues: { show: null } }),
      );
      const classic = await executeClassic({
        schema,
        document,
        rootValue,
        variableValues: { show: null },
      });
      expect(planned).toEqual(classic);
      expect(planned.data).toEqual({ items: [null, null], ok: 'yes' });
      expect(planned.errors?.map(e => e.path)).toEqual([
        ['items', 0],
        ['items', 1],
      ]);
    });

    it('preserves CRITICAL_ERROR on root property Error value', () => {
      const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            a: { type: GraphQLString },
            other: { type: GraphQLString },
          },
        }),
      });
      const document = parse('{ a other }');
      const rootValue = {
        a: new GraphQLError('boom', { extensions: { CRITICAL_ERROR: true } }),
        other: 'ok',
      };
      const planned = executeSync({ schema, document, rootValue });
      const classic = executeClassicSync({ schema, document, rootValue });
      expect(planned).toEqual(classic);
      expect(planned.data).toBeNull();
      expect(planned.errors?.[0]?.extensions?.['CRITICAL_ERROR']).toBe(true);
    });
  });

  // R32: predicate filter throw must decline to ordinary list completion so
  // thenables / Error items settle before child @include runs.
  describe('R32 predicate completion', () => {
    const itemType = new GraphQLObjectType({
      name: 'R32PredItem',
      fields: {
        id: { type: GraphQLString },
        name: { type: GraphQLString },
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          items: { type: new GraphQLList(itemType) },
          ok: { type: GraphQLString, resolve: () => 'yes' },
        },
      }),
    });
    const document = parse('query ($show: Boolean) { items { id name @include(if: $show) } ok }');
    const vars = { show: null };

    it('document-mode planned regressions run with planning enabled', () => {
      // Keep document-mode execute (automatic plan lookup / cache reuse). Do not
      // force explicit plans into every call — that bypasses the warm path.
      expect(isExecutionPlanningEnabled()).toBe(true);
    });

    it('Promise.resolve(null) does not invent @include errors', async () => {
      const rootValue = { items: [Promise.resolve(null)] };
      const planned = assertSingular(
        await execute({ schema, document, rootValue, variableValues: vars }),
      );
      const classic = await executeClassic({
        schema,
        document,
        rootValue,
        variableValues: vars,
      });
      expect(planned).toEqual(classic);
      expect(planned).toEqual({ data: { items: [null], ok: 'yes' } });
    });

    it('Promise.reject keeps rejection (no unhandled / no include swap)', async () => {
      const rootValue = { items: [Promise.reject(new Error('rej'))] };
      const planned = assertSingular(
        await execute({ schema, document, rootValue, variableValues: vars }),
      );
      const classic = await executeClassic({
        schema,
        document,
        rootValue,
        variableValues: vars,
      });
      expect(planned).toEqual(classic);
      expect(planned).toMatchObject({
        data: { items: [null], ok: 'yes' },
        errors: [expect.objectContaining({ message: 'rej', path: ['items', 0] })],
      });
    });

    it('Error item keeps Error message before child directives', async () => {
      const rootValue = { items: [new Error('err')] };
      const planned = assertSingular(
        await execute({ schema, document, rootValue, variableValues: vars }),
      );
      const classic = await executeClassic({
        schema,
        document,
        rootValue,
        variableValues: vars,
      });
      expect(planned).toEqual(classic);
      expect(planned).toMatchObject({
        data: { items: [null], ok: 'yes' },
        errors: [expect.objectContaining({ message: 'err', path: ['items', 0] })],
      });
    });

    it('mixed null / thenable / thenable-null matches classic paths', async () => {
      const rootValue = {
        items: [null, Promise.resolve({ id: '2' }), Promise.resolve(null)],
      };
      const planned = assertSingular(
        await execute({ schema, document, rootValue, variableValues: vars }),
      );
      const classic = await executeClassic({
        schema,
        document,
        rootValue,
        variableValues: vars,
      });
      expect(planned).toEqual(classic);
      expect(planned.data).toEqual({ items: [null, null, null], ok: 'yes' });
      expect(planned.errors?.map(e => e.path)).toEqual([['items', 1]]);
    });

    it('live isTypeOf matches classic for explicit plan and cached warm path', async () => {
      const Item = new GraphQLObjectType({
        name: 'R32LiveIsTypeOfItem',
        fields: { id: { type: GraphQLString } },
      });
      const liveSchema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: { items: { type: new GraphQLList(Item) } },
        }),
      });
      const liveDocument = parse('{ items { id } }');
      const plan = compileExecutionPlan({ schema: liveSchema, document: liveDocument });
      if (!isExecutionPlan(plan)) {
        throw new Error('expected execution plan');
      }
      Item.isTypeOf = () => false;
      const rootValue = { items: [{ id: 'a' }] };
      const classic = await executeClassic({
        schema: liveSchema,
        document: liveDocument,
        rootValue,
      });
      const cached = assertSingular(
        await execute({ schema: liveSchema, document: liveDocument, rootValue }),
      );
      const explicit = assertSingular(await execute({ plan, rootValue }));
      expect(cached).toEqual(classic);
      expect(explicit).toEqual(classic);
      expect(classic.data).toEqual({ items: [null] });
      expect(classic.errors?.[0]?.path).toEqual(['items', 0]);
    });

    // R33: thin decline must complete the already-resolved list — never fall
    // through to executeField (that re-invokes one-shot getters / methods).
    it('one-shot list method on predicate decline: calls===1, rejection kept', async () => {
      let calls = 0;
      const rootValue = {
        items() {
          calls += 1;
          if (calls === 1) {
            return [Promise.reject(new Error('rej'))];
          }
          // Replay would hide the rejection.
          return [null];
        },
        ok: 'yes',
      };
      calls = 0;
      const planned = assertSingular(
        await execute({ schema, document, rootValue, variableValues: vars }),
      );
      expect(calls).toBe(1);
      calls = 0;
      const classic = await executeClassic({
        schema,
        document,
        rootValue,
        variableValues: vars,
      });
      expect(calls).toBe(1);
      expect(planned).toEqual(classic);
      expect(planned).toMatchObject({
        data: { items: [null], ok: 'yes' },
        errors: [expect.objectContaining({ message: 'rej', path: ['items', 0] })],
      });
    });

    it('one-shot list getter on live isTypeOf decline: calls===1', async () => {
      const Item = new GraphQLObjectType({
        name: 'R33OneShotIsTypeOfItem',
        fields: { id: { type: GraphQLString } },
      });
      const liveSchema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: { items: { type: new GraphQLList(Item) } },
        }),
      });
      const liveDocument = parse('{ items { id } }');
      const plan = compileExecutionPlan({ schema: liveSchema, document: liveDocument });
      if (!isExecutionPlan(plan)) {
        throw new Error('expected execution plan');
      }
      Item.isTypeOf = () => false;
      let calls = 0;
      const list = [{ id: 'a' }];
      const rootValue = {
        get items() {
          calls += 1;
          return list;
        },
      };
      calls = 0;
      const planned = assertSingular(await execute({ plan, rootValue }));
      expect(calls).toBe(1);
      calls = 0;
      const classic = await executeClassic({
        schema: liveSchema,
        document: liveDocument,
        rootValue,
      });
      expect(calls).toBe(1);
      expect(planned).toEqual(classic);
      expect(planned.data).toEqual({ items: [null] });
      expect(planned.errors?.[0]?.path).toEqual(['items', 0]);
    });
  });
});
