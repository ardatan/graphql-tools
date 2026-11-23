/**
 * R9 §7.1 — differential classic vs planned parity + fast-path coverage.
 *
 * Fast-path checks use plan IR (`FieldPlan.kind`) and test-local call counters
 * (no production instrumentation). Property cases use a deterministic seeded PRNG.
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
  GraphQLUnionType,
  parse,
} from 'graphql';
import {
  buildExecutionContext,
  clearExecutionPlanCache,
  compileExecutionPlan,
  execute,
  executeImpl,
  executeSync,
  type SingularExecutionResult,
} from '../../execute.js';
import { getPlannedFieldPlan, isExecutionPlan, type InternalExecutionPlan } from '../../plan.js';

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

function assertSingular(result: unknown): SingularExecutionResult {
  if (result != null && typeof result === 'object' && 'initialResult' in (result as object)) {
    throw new Error('expected singular result');
  }
  return result as SingularExecutionResult;
}

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
      clearExecutionPlanCache();
      const cold = executeSync({
        schema,
        document,
        variableValues: { v: 'cold' },
      });
      const warm = executeSync({
        schema,
        document,
        variableValues: { v: 'warm' },
      });
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
        const args = { schema, document, rootValue: root, variableValues };

        try {
          const planned = executeSync(args);
          const classic = executeClassicSync(args);
          expect(planned).toEqual(classic);
        } catch (err) {
          failures.push(`case ${caseIndex}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      expect(failures).toEqual([]);
    });

    it('matches classic on seeded async list mixtures', async () => {
      const rand = mulberry32(SEED ^ 0xabc);
      const failures: string[] = [];
      for (let caseIndex = 0; caseIndex < 24; caseIndex++) {
        const mode = Math.floor(rand() * 4);
        const schema = new GraphQLSchema({
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
          const planned = assertSingular(await execute({ schema, document }));
          const classic = await executeClassic({ schema, document });
          expect(planned).toEqual(classic);
        } catch (err) {
          failures.push(
            `async case ${caseIndex}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
      expect(failures).toEqual([]);
    });
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
});
