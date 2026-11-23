import {
  GraphQLError,
  GraphQLFloat,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLString,
  Kind,
  parse,
  versionInfo,
  type ValueNode,
} from 'graphql';
import {
  buildExecutionContext,
  execute,
  executeSync,
  type ExecutionContext,
} from '../../execute.js';
import {
  clearExecutionPlanCache,
  compileExecutionPlan,
  getExecutionPlan,
  isExecutionPlan,
} from '../../plan.js';

const friendType = new GraphQLObjectType({
  name: 'Friend',
  fields: {
    name: { type: GraphQLString },
  },
});

const itemType = new GraphQLObjectType({
  name: 'Item',
  fields: {
    name: { type: GraphQLString },
    friend: { type: friendType },
  },
});

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: {
      items: {
        type: new GraphQLList(itemType),
        resolve: () => [
          { name: 'a', friend: { name: 'fa' } },
          { name: 'b', friend: { name: 'fb' } },
        ],
      },
      a: { type: GraphQLString, resolve: () => 'a' },
      b: { type: GraphQLString, resolve: () => 'b' },
      hello: {
        type: GraphQLString,
        args: { name: { type: GraphQLString } },
        resolve: (_src, args: { name?: string }) => `hello ${args.name ?? 'world'}`,
      },
      n: { type: GraphQLInt, resolve: () => 1 },
    },
  }),
});

function assertExeContext(
  value: ReadonlyArray<unknown> | ExecutionContext,
): asserts value is ExecutionContext {
  expect('schema' in value).toBe(true);
}

describe('execution plan', () => {
  afterEach(() => {
    // Plans are WeakMap-cached by document identity.
  });

  it('compiles a plan for stable documents and attaches it to ExecutionContext', () => {
    const document = parse('{ items { name friend { name } } a }');
    const plan = compileExecutionPlan({ schema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    if (!isExecutionPlan(plan)) {
      return;
    }
    expect([...plan.rootFields.keys()]).toEqual(['items', 'a']);
    expect(plan.fieldPlanByNodes.get(plan.rootFields.get('items')!)).toMatchObject({
      responseName: 'items',
      hasArgs: false,
    });

    const exeContext = buildExecutionContext({ schema, document });
    assertExeContext(exeContext);
    expect(exeContext.plan).toBe(plan);
  });

  it('reuses the same plan across compileExecutionPlan and getExecutionPlan', () => {
    const document = parse('{ a b }');
    const first = compileExecutionPlan({ schema, document });
    const second = compileExecutionPlan({ schema, document });
    const lookedUp = getExecutionPlan(schema, document);
    expect(first).toBe(second);
    expect(lookedUp).toBe(first);
  });

  it('execute with args.plan matches get-or-compile executeSync', () => {
    const document = parse('{ a b }');
    const plan = compileExecutionPlan({ schema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    if (!isExecutionPlan(plan)) {
      return;
    }
    const viaPlan = executeSync({ plan });
    const viaExecute = executeSync({ schema, document });
    expect(viaPlan).toEqual(viaExecute);
  });

  it('plan-only executeSync and buildExecutionContext trust plan schema/document', () => {
    const document = parse('{ items { name } a }');
    const plan = compileExecutionPlan({ schema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    if (!isExecutionPlan(plan)) {
      return;
    }
    expect(executeSync({ plan })).toEqual(
      executeSync({
        schema,
        document,
      }),
    );
    const exeContext = buildExecutionContext({ plan });
    assertExeContext(exeContext);
    expect(exeContext.plan).toBe(plan);
    expect(exeContext.schema).toBe(plan.schema);
    expect(exeContext.operation).toBe(plan.operation);
  });

  it('public execute get-or-compiles and attaches the plan', () => {
    const document = parse('{ a b }');
    const plan = compileExecutionPlan({ schema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    if (!isExecutionPlan(plan)) {
      return;
    }
    expect(executeSync({ schema, document })).toEqual(executeSync({ plan }));
    const exeContext = buildExecutionContext({ schema, document });
    assertExeContext(exeContext);
    expect(exeContext.plan).toBe(plan);
  });

  it('compiles the plan once when a document parser cache reuses DocumentNode identity', () => {
    // Mimics Yoga useParserAndValidationCache / Envelop parser-cache: same
    // query string → same DocumentNode → plan WeakMap hit on second execute.
    const source = '{ a b }';
    const documentCache = new Map<string, ReturnType<typeof parse>>();
    function parseCached(query: string) {
      let document = documentCache.get(query);
      if (document == null) {
        document = parse(query);
        documentCache.set(query, document);
      }
      return document;
    }

    const firstDoc = parseCached(source);
    const firstCtx = buildExecutionContext({ schema, document: firstDoc });
    assertExeContext(firstCtx);
    const plan = firstCtx.plan;
    expect(isExecutionPlan(plan)).toBe(true);

    expect(executeSync({ schema, document: firstDoc })).toEqual({ data: { a: 'a', b: 'b' } });

    const secondDoc = parseCached(source);
    expect(secondDoc).toBe(firstDoc);
    const secondCtx = buildExecutionContext({ schema, document: secondDoc });
    assertExeContext(secondCtx);
    expect(secondCtx.plan).toBe(plan);
    expect(compileExecutionPlan({ schema, document: secondDoc })).toBe(plan);
    expect(executeSync({ schema, document: secondDoc })).toEqual({ data: { a: 'a', b: 'b' } });

    // A fresh parse (no parser cache) is a different DocumentNode → new plan entry.
    const uncachedDoc = parse(source);
    expect(uncachedDoc).not.toBe(firstDoc);
    const uncachedPlan = compileExecutionPlan({ schema, document: uncachedDoc });
    expect(isExecutionPlan(uncachedPlan)).toBe(true);
    expect(uncachedPlan).not.toBe(plan);
  });

  it('compiles a variable-@skip plan and executes both branches', () => {
    const document = parse('query ($s: Boolean!) { a b @skip(if: $s) }');
    const plan = compileExecutionPlan({ schema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    if (!isExecutionPlan(plan)) {
      return;
    }
    expect(plan.collectionDependsOnVariables).toBe(true);
    expect(plan.skipIncludePredicates).toBe(true);
    expect(plan.rootExecutions).toBeDefined();
    expect(plan.rootExecutions!.some(e => e.responseName === 'b' && e.include != null)).toBe(true);
    expect(plan.rootFields.has('a')).toBe(true);
    expect(plan.rootFields.has('b')).toBe(true);
    expect(
      executeSync({
        schema,
        document,
        variableValues: { s: false },
      }),
    ).toEqual({ data: { a: 'a', b: 'b' } });
    expect(
      executeSync({
        schema,
        document,
        variableValues: { s: true },
      }),
    ).toEqual({ data: { a: 'a' } });
    const exeContext = buildExecutionContext({
      schema,
      document,
      variableValues: { s: false },
    });
    assertExeContext(exeContext);
    expect(exeContext.plan).toBe(plan);
  });

  it('compiles an incremental plan for @defer (runtime still incremental)', () => {
    const document = parse('{ a ... @defer { b } }');
    const plan = compileExecutionPlan({ schema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    if (!isExecutionPlan(plan)) {
      return;
    }
    expect(plan.hasIncremental).toBe(true);
    expect(plan.rootExecutions).toBeUndefined();
    expect(plan.fieldPlanByFieldNode.get(plan.rootFields.get('a')![0]!)).toBeDefined();
  });

  it('compiles static @stream facts on incremental plans', () => {
    const listSchema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          values: { type: new GraphQLList(GraphQLInt), resolve: () => [1, 2, 3] },
        },
      }),
    });
    const document = parse('{ values @stream(initialCount: 1, label: "v") }');
    const plan = compileExecutionPlan({ schema: listSchema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    if (!isExecutionPlan(plan)) {
      return;
    }
    expect(plan.hasIncremental).toBe(true);
    const valuesPlan = plan.fieldPlanByNodes.get(plan.rootFields.get('values')!);
    expect(valuesPlan?.stream).toEqual({
      kind: 'static',
      initialCount: 1,
      label: 'v',
    });
  });

  it('omits stream on non-incremental FieldPlans (warm-path shape)', () => {
    const document = parse('{ a }');
    const plan = compileExecutionPlan({ schema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    if (!isExecutionPlan(plan)) {
      return;
    }
    expect(plan.hasIncremental).toBe(false);
    const aPlan = plan.fieldPlanByNodes.get(plan.rootFields.get('a')!);
    expect(aPlan).toBeDefined();
    expect(Object.prototype.hasOwnProperty.call(aPlan, 'stream')).toBe(false);
  });

  it('invalidates cached plans for a document via clearExecutionPlanCache', () => {
    const document = parse('{ a }');
    const first = compileExecutionPlan({ schema, document });
    clearExecutionPlanCache(document);
    const second = compileExecutionPlan({ schema, document });
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(second).not.toBe(first);
  });

  it('keys plans by schema identity', () => {
    const document = parse('{ a }');
    const otherSchema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          a: { type: GraphQLString, resolve: () => 'other' },
        },
      }),
    });
    const planA = compileExecutionPlan({ schema, document });
    const planB = compileExecutionPlan({ schema: otherSchema, document });
    expect(planA).toBeDefined();
    expect(planB).toBeDefined();
    expect(planA).not.toBe(planB);
  });

  it('keys plans by operation name', () => {
    const document = parse(`
      query One { a }
      query Two { b }
    `);
    const one = compileExecutionPlan({ schema, document, operationName: 'One' });
    const two = compileExecutionPlan({ schema, document, operationName: 'Two' });
    expect(isExecutionPlan(one)).toBe(true);
    expect(isExecutionPlan(two)).toBe(true);
    expect(one).not.toBe(two);
    if (!isExecutionPlan(one) || !isExecutionPlan(two)) {
      return;
    }
    expect([...one.rootFields.keys()]).toEqual(['a']);
    expect([...two.rootFields.keys()]).toEqual(['b']);
  });

  it('precompiles static argument maps when args have no variables', () => {
    const document = parse('{ hello(name: "Ada") }');
    const plan = compileExecutionPlan({ schema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    if (!isExecutionPlan(plan)) {
      return;
    }
    const fieldPlan = plan.fieldPlanByNodes.get(plan.rootFields.get('hello')!);
    expect(fieldPlan?.staticArgs).toEqual({ name: 'Ada' });
    expect(fieldPlan?.argumentReader).toEqual({
      kind: 'static',
      args: { name: 'Ada' },
    });
  });

  it('compiles a coercer closure for bare-variable arguments', () => {
    const document = parse('query ($name: String) { hello(name: $name) }');
    const plan = compileExecutionPlan({ schema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    if (!isExecutionPlan(plan)) {
      return;
    }
    const fieldPlan = plan.fieldPlanByNodes.get(plan.rootFields.get('hello')!);
    expect(fieldPlan?.hasArgs).toBe(true);
    expect(fieldPlan?.staticArgs).toBeUndefined();
    expect(fieldPlan?.argumentReader?.kind).toBe('coercer');
    expect(
      executeSync({
        schema,
        document,
        variableValues: { name: 'GraphQL' },
      }),
    ).toEqual({ data: { hello: 'hello GraphQL' } });
  });

  it('compiles rootExecutions for stable documents', () => {
    const document = parse('{ a b }');
    const plan = compileExecutionPlan({ schema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    if (!isExecutionPlan(plan)) {
      return;
    }
    expect(plan.rootExecutions).toBeDefined();
    expect(plan.rootExecutions!.map(e => e.responseName).sort()).toEqual(['a', 'b']);
    expect(plan.rootExecutions!.every(e => e.fieldPlan != null)).toBe(true);
  });

  it('uses planned rootExecutions on the mutation serial path', () => {
    const calls: string[] = [];
    const mutationSchema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: { a: { type: GraphQLString, resolve: () => 'a' } },
      }),
      mutation: new GraphQLObjectType({
        name: 'Mutation',
        fields: {
          first: {
            type: GraphQLString,
            resolve: () => {
              calls.push('first');
              return '1';
            },
          },
          second: {
            type: GraphQLString,
            resolve: () => {
              calls.push('second');
              return '2';
            },
          },
        },
      }),
    });
    const document = parse('mutation { first second }');
    const plan = compileExecutionPlan({ schema: mutationSchema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    if (isExecutionPlan(plan)) {
      expect(plan.rootExecutions).toBeDefined();
      expect(plan.rootExecutions!.map(e => e.responseName)).toEqual(['first', 'second']);
    }
    expect(executeSync({ schema: mutationSchema, document })).toEqual({
      data: { first: '1', second: '2' },
    });
    expect(calls).toEqual(['first', 'second']);
  });

  it('filters mutation rootExecutions with fragment @skip predicates', () => {
    const mutationSchema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: { a: { type: GraphQLString, resolve: () => 'a' } },
      }),
      mutation: new GraphQLObjectType({
        name: 'Mutation',
        fields: {
          first: { type: GraphQLString, resolve: () => '1' },
          second: { type: GraphQLString, resolve: () => '2' },
        },
      }),
    });
    const document = parse(`
      mutation ($s: Boolean!) {
        first
        ... @skip(if: $s) { second }
      }
    `);
    const plan = compileExecutionPlan({ schema: mutationSchema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    if (isExecutionPlan(plan)) {
      expect(plan.skipIncludePredicates).toBe(true);
      // Conditional mutations leave rootExecutions unset so classic collect
      // preserves occurrence order for duplicate response names.
      expect(plan.rootExecutions).toBeUndefined();
    }
    expect(
      executeSync({
        schema: mutationSchema,
        document,
        variableValues: { s: true },
      }),
    ).toEqual({ data: { first: '1' } });
    expect(
      executeSync({
        schema: mutationSchema,
        document,
        variableValues: { s: false },
      }),
    ).toEqual({ data: { first: '1', second: '2' } });
  });

  it('compiles coerceVariables for empty and builtin-leaf variables', () => {
    const emptyPlan = compileExecutionPlan({ schema, document: parse('{ a }') });
    expect(isExecutionPlan(emptyPlan)).toBe(true);
    if (!isExecutionPlan(emptyPlan)) {
      return;
    }
    expect(emptyPlan.hasVariables).toBe(false);
    expect(emptyPlan.coerceVariables(undefined)).toEqual({
      variableValues: expect.objectContaining({ coerced: expect.any(Object) }),
    });

    const leafDoc = parse('query ($name: String) { hello(name: $name) }');
    const leafPlan = compileExecutionPlan({ schema, document: leafDoc });
    expect(isExecutionPlan(leafPlan)).toBe(true);
    if (!isExecutionPlan(leafPlan)) {
      return;
    }
    expect(leafPlan.hasVariables).toBe(true);
    const coerced = leafPlan.coerceVariables({ name: 'GraphQL' });
    expect('variableValues' in coerced).toBe(true);
    if ('variableValues' in coerced) {
      expect(coerced.variableValues.coerced).toMatchObject({ name: 'GraphQL' });
    }
    expect(
      executeSync({
        schema,
        document: leafDoc,
        variableValues: { name: 'GraphQL' },
      }),
    ).toEqual({ data: { hello: 'hello GraphQL' } });
  });

  it('compiles hoisted coerceVariables for nested input-object variables', () => {
    const nestedInput = new GraphQLInputObjectType({
      name: 'NestedInput',
      fields: {
        x: { type: new GraphQLNonNull(GraphQLFloat) },
        y: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLInt))) },
      },
    });
    const filterInput = new GraphQLInputObjectType({
      name: 'FilterInput',
      fields: {
        a: { type: new GraphQLNonNull(GraphQLInt) },
        b: { type: new GraphQLNonNull(GraphQLString) },
        nested: { type: new GraphQLNonNull(nestedInput) },
      },
    });
    const inputSchema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          search: {
            type: new GraphQLNonNull(GraphQLString),
            args: { filter: { type: new GraphQLNonNull(filterInput) } },
            resolve: (
              _src,
              args: { filter: { a: number; b: string; nested: { x: number; y: number[] } } },
            ) =>
              `${args.filter.a}:${args.filter.b}:${args.filter.nested.x}:${args.filter.nested.y.length}`,
          },
        },
      }),
    });
    const document = parse('query ($filter: FilterInput!) { search(filter: $filter) }');
    const plan = compileExecutionPlan({ schema: inputSchema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    if (!isExecutionPlan(plan)) {
      return;
    }
    expect(plan.hasVariables).toBe(true);

    const raw = {
      filter: { a: 7, b: 'x', nested: { x: 1.5, y: [1, 2, 3] } },
    };
    const coerced = plan.coerceVariables(raw);
    expect('variableValues' in coerced).toBe(true);
    if (!('variableValues' in coerced)) {
      return;
    }
    expect(coerced.variableValues.coerced).toEqual({
      filter: { a: 7, b: 'x', nested: { x: 1.5, y: [1, 2, 3] } },
    });
    expect(coerced.variableValues.sources['filter']).toMatchObject({
      signature: expect.objectContaining({ name: 'filter' }),
      value: raw.filter,
    });

    // Invalid nested value falls back to getVariableValues (errors, not throw).
    const bad = plan.coerceVariables({
      filter: { a: 7, b: 'x', nested: { x: 1.5, y: ['nope'] } },
    });
    expect('errors' in bad).toBe(true);

    expect(
      executeSync({
        schema: inputSchema,
        document,
        variableValues: raw,
      }),
    ).toEqual({ data: { search: '7:x:1.5:3' } });
  });

  it('applies AST variable defaults on the warm coerce path', () => {
    const document = parse('query ($name: String = "Ada") { hello(name: $name) }');
    const plan = compileExecutionPlan({ schema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    if (!isExecutionPlan(plan)) {
      return;
    }
    const omitted = plan.coerceVariables({});
    expect('variableValues' in omitted).toBe(true);
    if ('variableValues' in omitted) {
      expect(omitted.variableValues.coerced).toMatchObject({ name: 'Ada' });
      expect(omitted.variableValues.sources['name']?.signature).toMatchObject({
        name: 'name',
        default: { literal: expect.objectContaining({ kind: 'StringValue' }) },
      });
    }
    expect(executeSync({ schema, document })).toEqual({
      data: { hello: 'hello Ada' },
    });
    expect(
      executeSync({
        schema,
        document,
        variableValues: { name: 'Bob' },
      }),
    ).toEqual({ data: { hello: 'hello Bob' } });
  });

  it('misses to classic coerce when a custom scalar rejects a plan-held AST default', () => {
    let accept = true;
    const Expiring = new GraphQLScalarType({
      name: 'Expiring',
      serialize: value => value,
      parseValue(value) {
        return accept ? value : undefined;
      },
      parseLiteral(ast: ValueNode) {
        if (ast.kind !== Kind.STRING) {
          return undefined;
        }
        return accept ? ast.value : undefined;
      },
    });
    const expiringSchema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          echo: {
            type: GraphQLString,
            args: { ts: { type: new GraphQLNonNull(Expiring) } },
            resolve: (_src, args: { ts: string }) => String(args.ts),
          },
        },
      }),
    });
    const document = parse('query ($ts: Expiring! = "ok") { echo(ts: $ts) }');
    const plan = compileExecutionPlan({ schema: expiringSchema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    if (!isExecutionPlan(plan)) {
      return;
    }
    expect(executeSync({ plan })).toEqual({
      data: { echo: 'ok' },
    });

    accept = false;
    const rejected = plan.coerceVariables({});
    // GraphQL 17 reports coerce errors; GraphQL 16 may still return a map with
    // an undefined binding. Neither path may reuse the plan-held "ok" default.
    if ('errors' in rejected) {
      expect(rejected.errors.length).toBeGreaterThan(0);
    } else {
      expect(rejected.variableValues.coerced['ts']).not.toBe('ok');
    }
    const result = executeSync({ plan });
    expect(result).not.toEqual({ data: { echo: 'ok' } });
    expect(result.errors?.length).toBeGreaterThan(0);
  });

  it('coerces @oneOf input variables on the warm path (happy path)', () => {
    const oneOfInput = new GraphQLInputObjectType({
      name: 'OneOfInput',
      isOneOf: true,
      fields: {
        a: { type: GraphQLString },
        b: { type: GraphQLInt },
      },
    });
    const oneOfSchema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          test: {
            type: GraphQLString,
            args: { input: { type: new GraphQLNonNull(oneOfInput) } },
            resolve: (_src, args: { input: { a?: string; b?: number } }) =>
              args.input.a ?? String(args.input.b),
          },
        },
      }),
    });
    const document = parse('query ($input: OneOfInput!) { test(input: $input) }');
    const plan = compileExecutionPlan({ schema: oneOfSchema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    if (!isExecutionPlan(plan)) {
      return;
    }
    const ok = plan.coerceVariables({ input: { a: 'hi' } });
    expect('variableValues' in ok).toBe(true);
    if ('variableValues' in ok) {
      expect(ok.variableValues.coerced).toEqual({ input: { a: 'hi' } });
    }
    // Bad oneOf (two keys) falls back to getVariableValues errors.
    const bad = plan.coerceVariables({ input: { a: 'hi', b: 1 } });
    expect('errors' in bad).toBe(true);
    expect(
      executeSync({
        schema: oneOfSchema,
        document,
        variableValues: { input: { a: 'hi' } },
      }),
    ).toEqual({ data: { test: 'hi' } });
  });

  it('defers nested Sets through recursive input coercers', () => {
    const Filter: GraphQLInputObjectType = new GraphQLInputObjectType({
      name: 'Filter',
      fields: () => ({
        child: { type: Filter },
        ids: { type: new GraphQLList(GraphQLInt) },
      }),
    });
    const filterSchema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          search: {
            type: GraphQLString,
            args: { filter: { type: Filter } },
            resolve: (_src, args: { filter?: { child?: { ids?: number[] }; ids?: number[] } }) =>
              (args.filter?.child?.ids ?? args.filter?.ids)?.join(',') ?? '',
          },
        },
      }),
    });
    const document = parse('query ($filter: Filter) { search(filter: $filter) }');
    const plan = compileExecutionPlan({ schema: filterSchema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    if (!isExecutionPlan(plan)) {
      return;
    }
    // Nested Set must not be diagnosed as a single Int via a stale placeholder.
    const coerced = plan.coerceVariables({
      filter: { child: { ids: new Set([1, 2]) } },
    });
    expect('errors' in coerced).toBe(false);
    expect(
      executeSync({
        plan,
        variableValues: { filter: { child: { ids: new Set([1, 2]) } } },
      }),
    ).toEqual({ data: { search: '1,2' } });
  });

  it('keeps GraphQL 16 plain-object prototypes on warm coerce', () => {
    if (versionInfo.major >= 17) {
      return;
    }
    const Options = new GraphQLInputObjectType({
      name: 'Options',
      fields: {
        limit: { type: GraphQLInt },
      },
    });
    const optionsSchema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          q: {
            type: GraphQLString,
            args: {
              n: { type: GraphQLInt },
              options: { type: Options },
            },
            resolve: (_src, args: { n?: number; options?: { limit?: number } }, _ctx, info) => {
              expect(Object.prototype.hasOwnProperty.call(info.variableValues, 'n')).toBe(true);
              expect(Object.prototype.hasOwnProperty.call(args.options, 'limit')).toBe(true);
              return `${args.n}:${args.options?.limit}`;
            },
          },
        },
      }),
    });
    const document = parse('query ($n: Int, $options: Options) { q(n: $n, options: $options) }');
    const plan = compileExecutionPlan({ schema: optionsSchema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    if (!isExecutionPlan(plan)) {
      return;
    }
    const coerced = plan.coerceVariables({ n: 1, options: { limit: 2 } });
    expect('variableValues' in coerced).toBe(true);
    if ('variableValues' in coerced) {
      expect(Object.getPrototypeOf(coerced.variableValues.coerced)).toBe(Object.prototype);
      expect(Object.getPrototypeOf(coerced.variableValues.coerced['options'])).toBe(
        Object.prototype,
      );
    }
    expect(
      executeSync({
        plan,
        variableValues: { n: 1, options: { limit: 2 } },
      }),
    ).toEqual({ data: { q: '1:2' } });
  });

  it('returns request errors when a nested input getter throws', () => {
    const Options = new GraphQLInputObjectType({
      name: 'ThrowOptions',
      fields: {
        limit: { type: GraphQLInt },
      },
    });
    const throwSchema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          q: {
            type: GraphQLString,
            args: { options: { type: Options } },
            resolve: () => 'ok',
          },
        },
      }),
    });
    const document = parse('query ($options: ThrowOptions) { q(options: $options) }');
    const plan = compileExecutionPlan({ schema: throwSchema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    if (!isExecutionPlan(plan)) {
      return;
    }
    const raw = {
      get limit() {
        throw new GraphQLError('limit boom');
      },
    };
    const coerced = plan.coerceVariables({ options: raw });
    expect('errors' in coerced).toBe(true);
    if ('errors' in coerced) {
      expect(coerced.errors[0]?.message).toContain('limit boom');
    }
  });

  it('does not re-read a one-shot throwing variable getter (leaf path)', () => {
    const document = parse('query ($n: Int) { n }');
    const plan = compileExecutionPlan({ schema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    if (!isExecutionPlan(plan)) {
      return;
    }
    let reads = 0;
    const raw = {
      get n() {
        reads += 1;
        if (reads === 1) {
          throw new GraphQLError('n boom once');
        }
        return 1;
      },
    };
    const coerced = plan.coerceVariables(raw);
    expect('errors' in coerced).toBe(true);
    if ('errors' in coerced) {
      expect(coerced.errors[0]?.message).toContain('n boom once');
    }
    expect(reads).toBe(1);
  });

  it('does not re-read a one-shot throwing variable getter (hoisted path)', () => {
    const Options = new GraphQLInputObjectType({
      name: 'OnceOptions',
      fields: {
        limit: { type: GraphQLInt },
      },
    });
    const onceSchema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          q: {
            type: GraphQLString,
            args: { options: { type: Options } },
            resolve: () => 'ok',
          },
        },
      }),
    });
    const document = parse('query ($options: OnceOptions) { q(options: $options) }');
    const plan = compileExecutionPlan({ schema: onceSchema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    if (!isExecutionPlan(plan)) {
      return;
    }
    let reads = 0;
    const raw = {
      get options() {
        reads += 1;
        if (reads === 1) {
          throw new GraphQLError('options boom once');
        }
        return { limit: 2 };
      },
    };
    const coerced = plan.coerceVariables(raw);
    expect('errors' in coerced).toBe(true);
    if ('errors' in coerced) {
      expect(coerced.errors[0]?.message).toContain('options boom once');
    }
    expect(reads).toBe(1);
  });

  it('applies GraphQL 17 coerceInputLiteral for variable defaults', () => {
    if (versionInfo.major < 17) {
      return;
    }
    // GraphQL 16 typings omit coerceInput* hooks; cast for the GQL17-only path.
    const Upper = new GraphQLScalarType({
      name: 'UpperDefault',
      // Runtime values stay as-is; only AST literal coercion uppercases.
      parseValue: value => String(value),
      parseLiteral: ast => (ast.kind === Kind.STRING ? ast.value : null),
      serialize: value => String(value),
      coerceInputValue: (value: unknown) => String(value),
      coerceInputLiteral: (ast: ValueNode) =>
        ast.kind === Kind.STRING ? ast.value.toUpperCase() : null,
    } as any);
    const upperSchema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          echo: {
            type: GraphQLString,
            args: { v: { type: Upper } },
            resolve: (_src, args: { v?: string }) => args.v ?? null,
          },
        },
      }),
    });
    const document = parse('query ($v: UpperDefault = "abc") { echo(v: $v) }');
    const plan = compileExecutionPlan({ schema: upperSchema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    if (!isExecutionPlan(plan)) {
      return;
    }
    const coerced = plan.coerceVariables({});
    expect('variableValues' in coerced).toBe(true);
    if ('variableValues' in coerced) {
      expect(coerced.variableValues.coerced['v']).toBe('ABC');
    }
    expect(
      executeSync({
        plan,
        variableValues: {},
      }),
    ).toEqual({ data: { echo: 'ABC' } });
  });

  it('handles a one-shot throwing child getter without re-read', () => {
    let idReads = 0;
    const userType = new GraphQLObjectType({
      name: 'OnceUser',
      fields: {
        id: { type: GraphQLString },
        name: { type: GraphQLString },
      },
    });
    const onceUserSchema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          user: {
            type: userType,
            resolve: () => ({
              get id() {
                idReads += 1;
                if (idReads === 1) {
                  throw new Error('id boom once');
                }
                return 'should-not-win';
              },
              name: 'Ada',
            }),
          },
        },
      }),
    });
    const document = parse('{ user { id name } }');
    const result = executeSync({ schema: onceUserSchema, document });
    expect(result).toEqual({
      data: { user: { id: null, name: 'Ada' } },
      errors: [expect.objectContaining({ message: 'id boom once' })],
    });
    expect(idReads).toBe(1);
  });

  it('preserves completed list items when a later item falls back from thin walk', () => {
    let firstIdReads = 0;
    const userType = new GraphQLObjectType({
      name: 'ListPartialUser',
      fields: {
        id: { type: new GraphQLNonNull(GraphQLString) },
        // Args force thin decline after `id` completes (leaf methods are invoked).
        name: {
          type: GraphQLString,
          args: { lang: { type: GraphQLString } },
          resolve: (obj, { lang }) => {
            const base = typeof obj.name === 'function' ? obj.name() : obj.name;
            return lang ? `${base}:${lang}` : base;
          },
        },
      },
    });
    const listPartialSchema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          // Default property resolve so executeObjectListFieldThin runs.
          users: { type: new GraphQLList(userType) },
        },
      }),
    });
    const document = parse('{ users { id name(lang: "en") } }');
    const result = executeSync({
      schema: listPartialSchema,
      document,
      rootValue: {
        users: [
          {
            get id() {
              firstIdReads += 1;
              if (firstIdReads === 1) {
                throw new Error('first id once');
              }
              return 'should-not-win';
            },
            name: 'Ada',
          },
          {
            // Completes `id` then declines at arg-bearing `name`.
            id: 'u2',
            name() {
              return 'Grace';
            },
          },
        ],
      },
    });
    expect(result).toEqual({
      data: {
        users: [null, { id: 'u2', name: 'Grace:en' }],
      },
      errors: [expect.objectContaining({ message: 'first id once' })],
    });
    expect(firstIdReads).toBe(1);
  });

  it('preserves completed children when a list item thin walk declines mid-object', () => {
    // Thin walk reads `id` then declines at arg-bearing `name`. Completed `id`
    // must not be discarded — classic finish should only run remaining fields.
    let idReads = 0;
    let nameCalls = 0;
    const userType = new GraphQLObjectType({
      name: 'DeclinePreserveUser',
      fields: {
        id: { type: GraphQLString },
        name: {
          type: GraphQLString,
          args: { lang: { type: GraphQLString } },
          resolve: (obj, { lang }) => {
            nameCalls += 1;
            const base = typeof obj.name === 'function' ? obj.name() : obj.name;
            return lang ? `${base}:${lang}` : base;
          },
        },
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          users: { type: new GraphQLList(userType) },
        },
      }),
    });
    const result = executeSync({
      schema,
      document: parse('{ users { id name(lang: "en") } }'),
      rootValue: {
        users: [
          {
            get id() {
              idReads += 1;
              return 'u1';
            },
            name: 'Ada',
          },
        ],
      },
    });
    expect(result).toEqual({
      data: { users: [{ id: 'u1', name: 'Ada:en' }] },
    });
    expect(idReads).toBe(1);
    expect(nameCalls).toBe(1);
  });

  it('does not re-read a one-shot getter that returns a method (default list)', () => {
    // Default-resolved list hits executeObjectListFieldThin. Getter returns a
    // method once — thin walk must invoke that value, not re-read the getter.
    let nameReads = 0;
    const userType = new GraphQLObjectType({
      name: 'GetterMethodUser',
      fields: {
        id: { type: GraphQLString },
        name: { type: GraphQLString },
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          users: { type: new GraphQLList(userType) },
        },
      }),
    });
    const result = executeSync({
      schema,
      document: parse('{ users { id name } }'),
      rootValue: {
        users: [
          {
            id: 'u1',
            get name() {
              nameReads += 1;
              if (nameReads > 1) {
                throw new Error('read twice');
              }
              return () => 'Ada';
            },
          },
        ],
      },
    });
    expect(result).toEqual({
      data: { users: [{ id: 'u1', name: 'Ada' }] },
    });
    expect(nameReads).toBe(1);
  });

  it('nulls a nullable list item when an async NonNull child rejects', async () => {
    // Async rejection inside one item must not reject Promise.all and null the
    // whole `users: [User]` field — sibling items stay.
    const userType = new GraphQLObjectType({
      name: 'AsyncNullItemUser',
      fields: {
        id: { type: new GraphQLNonNull(GraphQLString) },
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          users: { type: new GraphQLList(userType) },
        },
      }),
    });
    const result = await execute({
      schema,
      document: parse('{ users { id } }'),
      rootValue: {
        users: [
          {
            id() {
              return Promise.reject(new Error('id rejected'));
            },
          },
          { id: 'u2' },
        ],
      },
    });
    expect(result).toEqual({
      data: {
        users: [null, { id: 'u2' }],
      },
      errors: [expect.objectContaining({ message: 'id rejected' })],
    });
  });

  it('nulls a NonNull-item list field without wiping sibling root fields', async () => {
    // users: [User!] — item NonNull child reject must null `users`, not `data`.
    const userType = new GraphQLObjectType({
      name: 'AsyncNullListFieldUser',
      fields: {
        id: { type: new GraphQLNonNull(GraphQLString) },
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          users: { type: new GraphQLList(new GraphQLNonNull(userType)) },
          other: { type: GraphQLString },
        },
      }),
    });
    const result = await execute({
      schema,
      document: parse('{ users { id } other }'),
      rootValue: {
        users: [
          {
            id() {
              return Promise.reject(new Error('nn item id'));
            },
          },
        ],
        other: 'ok',
      },
    });
    expect(result).toEqual({
      data: { users: null, other: 'ok' },
      errors: [expect.objectContaining({ message: 'nn item id' })],
    });
  });

  it('does not leave an unhandled rejection when pending serialize is abandoned', async () => {
    // Rejected serialize promise stored in pendingLeaves must not become an
    // unhandled rejection if a later NonNull getter bubbles before finish.
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => {
      unhandled.push(reason);
    };
    process.on('unhandledRejection', onUnhandled);
    try {
      const AsyncSer = new GraphQLScalarType({
        name: 'AsyncSerAbandon',
        serialize(value) {
          return Promise.reject(new Error(`ser ${String(value)}`));
        },
      });
      const objType = new GraphQLObjectType({
        name: 'SerAbandonObj',
        fields: {
          a: { type: AsyncSer },
          b: { type: new GraphQLNonNull(GraphQLString) },
        },
      });
      const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            obj: {
              type: objType,
              resolve: () => ({
                a: 'x',
                get b() {
                  throw new Error('b boom');
                },
              }),
            },
          },
        }),
      });
      const result = await execute({
        schema,
        document: parse('{ obj { a b } }'),
      });
      // Wait a real event-loop turn so deferred unhandled rejections surface
      // while the listener is still attached (microtasks alone are not enough).
      await new Promise<void>(resolve => {
        setImmediate(resolve);
      });
      expect(unhandled).toEqual([]);
      expect(result).toMatchObject({
        errors: expect.arrayContaining([expect.objectContaining({ message: 'b boom' })]),
      });
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }
  });

  it('reports empty AggregateError on a NonNull thin leaf and nulls the parent', async () => {
    const objType = new GraphQLObjectType({
      name: 'EmptyAggObj',
      fields: {
        score: { type: new GraphQLNonNull(GraphQLInt) },
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          obj: {
            type: objType,
            resolve: () => ({
              score() {
                return Promise.reject(new AggregateError([], 'failed'));
              },
            }),
          },
          other: { type: GraphQLString, resolve: () => 'ok' },
        },
      }),
    });
    const result = await execute({
      schema,
      document: parse('{ obj { score } other }'),
    });
    expect(result).toEqual({
      data: { obj: null, other: 'ok' },
      errors: [expect.objectContaining({ message: 'failed' })],
    });
  });

  it('errors when async serialize fulfills null after a promise leaf resolve', async () => {
    // Resolver returns a promise; serialize returns Promise.resolve(null).
    // Must match sync-path nullish-serialize error + NonNull parent nulling.
    const Custom = new GraphQLScalarType({
      name: 'AsyncNullSer',
      serialize() {
        return Promise.resolve(null);
      },
    });
    const objType = new GraphQLObjectType({
      name: 'AsyncNullSerObj',
      fields: {
        score: { type: new GraphQLNonNull(Custom) },
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          obj: {
            type: objType,
            resolve: () => ({
              score() {
                return Promise.resolve(1);
              },
            }),
          },
          other: { type: GraphQLString, resolve: () => 'ok' },
        },
      }),
    });
    const result = await execute({
      schema,
      document: parse('{ obj { score } other }'),
    });
    expect(result).toEqual({
      data: { obj: null, other: 'ok' },
      errors: [
        expect.objectContaining({
          message: expect.stringMatching(/serialize.*non-nullable value.*null/s),
        }),
      ],
    });
  });

  it('preserves nested partial thin results when a sibling needs classic', () => {
    let idReads = 0;
    const profileType = new GraphQLObjectType({
      name: 'NestedPartialProfile',
      fields: {
        id: { type: GraphQLString },
        name: { type: GraphQLString },
      },
    });
    const userType = new GraphQLObjectType({
      name: 'NestedPartialUser',
      fields: {
        profile: { type: profileType },
      },
    });
    const nestedPartialSchema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          user: {
            type: userType,
            resolve: () => ({
              profile: {
                get id() {
                  idReads += 1;
                  if (idReads === 1) {
                    throw new Error('profile id once');
                  }
                  return 'should-not-win';
                },
                name() {
                  return 'Ada';
                },
              },
            }),
          },
        },
      }),
    });
    const document = parse('{ user { profile { id name } } }');
    const result = executeSync({ schema: nestedPartialSchema, document });
    expect(result).toEqual({
      data: {
        user: { profile: { id: null, name: 'Ada' } },
      },
      errors: [expect.objectContaining({ message: 'profile id once' })],
    });
    expect(idReads).toBe(1);
  });

  it('finishes a nested object via classic when the nested thin walk fully declines', () => {
    // Nested Author thin-walk hits a method/args field and returns undefined
    // (no recorded getter errors). Parent must not treat that undefined as
    // "continue" and skip the author field entirely (schema-test regression).
    let picCalls = 0;
    const imageType = new GraphQLObjectType({
      name: 'NestedMissImage',
      fields: {
        url: { type: GraphQLString },
      },
    });
    const authorType = new GraphQLObjectType({
      name: 'NestedMissAuthor',
      fields: {
        id: { type: GraphQLString },
        pic: {
          type: imageType,
          args: { width: { type: GraphQLInt } },
          resolve: (obj, { width }) => {
            picCalls += 1;
            return obj.pic(width);
          },
        },
      },
    });
    const articleType = new GraphQLObjectType({
      name: 'NestedMissArticle',
      fields: {
        title: { type: GraphQLString },
        author: { type: authorType },
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          article: {
            type: articleType,
            resolve: () => ({
              title: 'Hello',
              author: {
                id: 'a1',
                pic: (width: number) => ({ url: `cdn://${width}` }),
              },
            }),
          },
        },
      }),
    });
    const result = executeSync({
      schema,
      // Select `pic` before `id` so the nested thin walk declines with
      // `undefined` (no completed children) rather than a partial.
      document: parse('{ article { title author { pic(width: 64) { url } id } } }'),
    });
    expect(result).toEqual({
      data: {
        article: {
          title: 'Hello',
          author: { pic: { url: 'cdn://64' }, id: 'a1' },
        },
      },
    });
    expect(picCalls).toBe(1);
  });

  it('preserves nested partial when remaining sibling is async', async () => {
    let idReads = 0;
    let nameCalls = 0;
    const profileType = new GraphQLObjectType({
      name: 'NestedAsyncPartialProfile',
      fields: {
        id: { type: GraphQLString },
        name: { type: GraphQLString },
      },
    });
    const userType = new GraphQLObjectType({
      name: 'NestedAsyncPartialUser',
      fields: {
        profile: { type: profileType },
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          user: {
            type: userType,
            resolve: () => ({
              profile: {
                get id() {
                  idReads += 1;
                  throw new Error('profile id always');
                },
                name() {
                  nameCalls += 1;
                  return Promise.resolve('Ada');
                },
              },
            }),
          },
        },
      }),
    });
    const result = await execute({
      schema,
      document: parse('{ user { profile { id name } } }'),
    });
    expect(result).toEqual({
      data: {
        user: { profile: { id: null, name: 'Ada' } },
      },
      errors: [expect.objectContaining({ message: 'profile id always' })],
    });
    expect(idReads).toBe(1);
    expect(nameCalls).toBe(1);
  });

  it('preserves completed list items when a later item finishes async', async () => {
    let firstIdReads = 0;
    let secondIdCalls = 0;
    const userType = new GraphQLObjectType({
      name: 'ListAsyncPartialUser',
      fields: {
        id: { type: new GraphQLNonNull(GraphQLString) },
        name: { type: GraphQLString },
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          users: { type: new GraphQLList(userType) },
        },
      }),
    });
    const result = await execute({
      schema,
      document: parse('{ users { id name } }'),
      rootValue: {
        users: [
          {
            get id() {
              firstIdReads += 1;
              if (firstIdReads === 1) {
                throw new Error('first id once');
              }
              return 'should-not-win';
            },
            name: 'Ada',
          },
          {
            id() {
              secondIdCalls += 1;
              return Promise.resolve('u2');
            },
            name: 'Grace',
          },
        ],
      },
    });
    expect(result).toEqual({
      data: {
        users: [null, { id: 'u2', name: 'Grace' }],
      },
      errors: [expect.objectContaining({ message: 'first id once' })],
    });
    expect(firstIdReads).toBe(1);
    expect(secondIdCalls).toBe(1);
  });

  it('propagates abort from thin object walk without reading later getters', () => {
    const controller = new AbortController();
    let nameReads = 0;
    const userType = new GraphQLObjectType({
      name: 'AbortThinUser',
      fields: {
        id: { type: GraphQLString },
        name: { type: GraphQLString },
      },
    });
    const abortThinSchema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          // Nullable sole root field — abort must not become a field error.
          user: {
            type: userType,
            resolve: () => ({
              get id() {
                controller.abort();
                throw new Error('id after abort');
              },
              get name() {
                nameReads += 1;
                return 'Ada';
              },
            }),
          },
        },
      }),
    });
    const document = parse('{ user { id name } }');
    expect(() =>
      executeSync({
        schema: abortThinSchema,
        document,
        signal: controller.signal,
      }),
    ).toThrow(DOMException);
    expect(nameReads).toBe(0);
  });

  it('propagates abort from thin object-list walk without reading later getters', () => {
    const controller = new AbortController();
    let nameReads = 0;
    const userType = new GraphQLObjectType({
      name: 'AbortThinListUser',
      fields: {
        id: { type: GraphQLString },
        name: { type: GraphQLString },
      },
    });
    // Default field resolver so executeObjectListFieldThin is eligible.
    const abortListSchema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          users: { type: new GraphQLList(userType) },
        },
      }),
    });
    expect(() =>
      executeSync({
        schema: abortListSchema,
        document: parse('{ users { id name } }'),
        rootValue: {
          users: [
            {
              get id() {
                controller.abort();
                throw new Error('id after abort');
              },
              get name() {
                nameReads += 1;
                return 'Ada';
              },
            },
          ],
        },
        signal: controller.signal,
      }),
    ).toThrow(DOMException);
    expect(nameReads).toBe(0);
  });

  it('rejects GraphQL 16 @oneOf unknown keys even when undefined', () => {
    if (versionInfo.major >= 17) {
      return;
    }
    const oneOfInput = new GraphQLInputObjectType({
      name: 'OneOfUndef',
      isOneOf: true,
      fields: {
        a: { type: GraphQLString },
        b: { type: GraphQLInt },
      },
    });
    const oneOfSchema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          test: {
            type: GraphQLString,
            args: { input: { type: new GraphQLNonNull(oneOfInput) } },
            resolve: () => 'ok',
          },
        },
      }),
    });
    const document = parse('query ($input: OneOfUndef!) { test(input: $input) }');
    const plan = compileExecutionPlan({ schema: oneOfSchema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    if (!isExecutionPlan(plan)) {
      return;
    }
    const bad = plan.coerceVariables({ input: { a: 'hi', extra: undefined } });
    expect('errors' in bad).toBe(true);
  });

  it('compiles resolveInfoStatic for planned fields', () => {
    const document = parse('{ hello }');
    const plan = compileExecutionPlan({ schema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    if (!isExecutionPlan(plan)) {
      return;
    }
    const fieldPlan = plan.fieldPlanByNodes.get(plan.rootFields.get('hello')!);
    expect(fieldPlan?.resolveInfoStatic).toMatchObject({
      fieldName: 'hello',
      returnType: fieldPlan?.returnType,
      parentType: plan.rootType,
    });
    expect(fieldPlan?.resolveInfoStatic.fieldNodes).toBe(plan.rootFields.get('hello'));
  });

  it('records kind and skipIsTypeOf for object fields', () => {
    const document = parse('{ items { name friend { name } } }');
    const plan = compileExecutionPlan({ schema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    if (!isExecutionPlan(plan)) {
      return;
    }
    const itemsPlan = plan.fieldPlanByNodes.get(plan.rootFields.get('items')!);
    expect(itemsPlan?.kind).toBe('list');
    if (itemsPlan?.kind === 'list') {
      expect(itemsPlan.objectType).toBe(itemType);
      expect(itemsPlan.itemNonNull).toBe(false);
    }
    const itemFields = plan.subfieldsByNodes.get(plan.rootFields.get('items')!)?.get(itemType);
    expect(itemFields).toBeDefined();
    const namePlan = plan.fieldPlanByNodes.get(itemFields!.get('name')!);
    expect(namePlan?.kind).toBe('leaf');
    const friendPlan = plan.fieldPlanByNodes.get(itemFields!.get('friend')!);
    expect(friendPlan?.kind).toBe('object');
    expect(friendPlan?.skipIsTypeOf).toBe(true);
  });

  it('records planned leaf-list facts for list-of-scalar fields', () => {
    const listSchema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          values: { type: new GraphQLList(GraphQLInt) },
        },
      }),
    });
    const document = parse('{ values }');
    const plan = compileExecutionPlan({ schema: listSchema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    if (!isExecutionPlan(plan)) {
      return;
    }
    const fieldPlan = plan.fieldPlanByNodes.get(plan.rootFields.get('values')!);
    expect(fieldPlan?.kind).toBe('leafList');
    if (fieldPlan?.kind === 'leafList') {
      expect(fieldPlan.itemNonNull).toBe(false);
      expect(fieldPlan.leafType.name).toBe('Int');
    }
  });

  it('executes correctly through the planned path for nested lists', () => {
    const document = parse(`
      {
        items {
          name
          friend {
            name
          }
        }
      }
    `);
    // Warm the plan cache then execute twice (second hits warm path).
    compileExecutionPlan({ schema, document });
    const first = executeSync({ schema, document });
    const second = executeSync({ schema, document });
    expect(first).toEqual({
      data: {
        items: [
          { name: 'a', friend: { name: 'fa' } },
          { name: 'b', friend: { name: 'fb' } },
        ],
      },
    });
    expect(second).toEqual(first);
  });

  it('still executes variable-arg fields correctly with a plan', () => {
    const document = parse('query ($name: String) { hello(name: $name) }');
    expect(
      executeSync({
        schema,
        document,
        variableValues: { name: 'GraphQL' },
      }),
    ).toEqual({ data: { hello: 'hello GraphQL' } });
  });

  it('does not drop a later conditional spread of the same fragment', () => {
    const document = parse(`
      query ($a: Boolean!, $b: Boolean!) {
        ...F @include(if: $a)
        ...F @include(if: $b)
      }
      fragment F on Query {
        a
      }
    `);
    expect(
      executeSync({
        schema,
        document,
        variableValues: { a: false, b: true },
      }),
    ).toEqual({ data: { a: 'a' } });
    expect(
      executeSync({
        schema,
        document,
        variableValues: { a: true, b: false },
      }),
    ).toEqual({ data: { a: 'a' } });
  });

  it('gates subfields from a conditionally merged parent field node', () => {
    const document = parse(`
      query ($s: Boolean!) {
        items {
          name
        }
        items @include(if: $s) {
          friend {
            name
          }
        }
      }
    `);
    expect(
      executeSync({
        schema,
        document,
        variableValues: { s: false },
      }),
    ).toEqual({
      data: {
        items: [{ name: 'a' }, { name: 'b' }],
      },
    });
    expect(
      executeSync({
        schema,
        document,
        variableValues: { s: true },
      }),
    ).toEqual({
      data: {
        items: [
          { name: 'a', friend: { name: 'fa' } },
          { name: 'b', friend: { name: 'fb' } },
        ],
      },
    });
  });

  it('exposes only active fieldNodes for merged conditional parents', () => {
    const captured: Array<ReadonlyArray<{ loc?: { start: number; end: number } | undefined }>> = [];
    const userType = new GraphQLObjectType({
      name: 'FieldNodesUser',
      fields: {
        id: { type: GraphQLString },
        secret: { type: GraphQLString },
      },
    });
    const fieldNodesSchema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          user: {
            type: userType,
            resolve: (_src, _args, _ctx, info) => {
              captured.push(info.fieldNodes);
              return { id: '1', secret: 'shh' };
            },
          },
        },
      }),
    });
    const document = parse(`
      query ($s: Boolean!) {
        user { id }
        user @skip(if: $s) { secret }
      }
    `);
    const op = document.definitions[0] as import('graphql').OperationDefinitionNode;
    const userIdNode = op.selectionSet.selections[0]!;
    const userSecretNode = op.selectionSet.selections[1]!;
    captured.length = 0;
    expect(
      executeSync({
        schema: fieldNodesSchema,
        document,
        variableValues: { s: true },
      }),
    ).toEqual({ data: { user: { id: '1' } } });
    expect(captured).toHaveLength(1);
    expect(captured[0]).toHaveLength(1);
    expect(captured[0][0]).toBe(userIdNode);

    captured.length = 0;
    expect(
      executeSync({
        schema: fieldNodesSchema,
        document,
        variableValues: { s: false },
      }),
    ).toEqual({ data: { user: { id: '1', secret: 'shh' } } });
    expect(captured).toHaveLength(1);
    expect(captured[0]).toHaveLength(2);
    expect(captured[0][0]).toBe(userIdNode);
    expect(captured[0][1]).toBe(userSecretNode);
  });

  it('exposes only active fieldNodes when a conditional fragment wraps a merge peer', () => {
    const captured: Array<ReadonlyArray<unknown>> = [];
    const userType = new GraphQLObjectType({
      name: 'FragUser',
      fields: {
        id: { type: GraphQLString },
        secret: { type: GraphQLString },
      },
    });
    const fragSchema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          user: {
            type: userType,
            resolve: (_src, _args, _ctx, info) => {
              captured.push(info.fieldNodes);
              return { id: '1', secret: 'shh' };
            },
          },
        },
      }),
    });
    const document = parse(`
      query ($s: Boolean!) {
        user { id }
        ... @skip(if: $s) {
          user { secret }
        }
      }
    `);
    const op = document.definitions[0] as import('graphql').OperationDefinitionNode;
    const userIdNode = op.selectionSet.selections[0]!;
    const skipFrag = op.selectionSet.selections[1] as import('graphql').InlineFragmentNode;
    const userSecretNode = skipFrag.selectionSet.selections[0]!;
    captured.length = 0;
    expect(
      executeSync({
        schema: fragSchema,
        document,
        variableValues: { s: true },
      }),
    ).toEqual({ data: { user: { id: '1' } } });
    expect(captured).toHaveLength(1);
    expect(captured[0]).toHaveLength(1);
    expect(captured[0][0]).toBe(userIdNode);

    captured.length = 0;
    expect(
      executeSync({
        schema: fragSchema,
        document,
        variableValues: { s: false },
      }),
    ).toEqual({ data: { user: { id: '1', secret: 'shh' } } });
    expect(captured).toHaveLength(1);
    expect(captured[0]).toHaveLength(2);
    expect(captured[0][0]).toBe(userIdNode);
    expect(captured[0][1]).toBe(userSecretNode);
  });

  it('returns a fresh static args object per read so mutations do not leak', () => {
    const document = parse('{ hello(name: "Ada") }');
    const plan = compileExecutionPlan({ schema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    if (!isExecutionPlan(plan)) {
      return;
    }
    const fieldPlan = plan.fieldPlanByNodes.get(plan.rootFields.get('hello')!);
    expect(fieldPlan).toBeDefined();
    const coerced = plan.coerceVariables({});
    expect('variableValues' in coerced).toBe(true);
    if (!('variableValues' in coerced)) {
      return;
    }
    const first = fieldPlan!.readArguments(coerced.variableValues);
    const second = fieldPlan!.readArguments(coerced.variableValues);
    expect(first).toEqual({ name: 'Ada' });
    expect(second).toEqual({ name: 'Ada' });
    expect(first).not.toBe(second);
    (first as { name: string }).name = 'mutated';
    expect(second).toEqual({ name: 'Ada' });
  });
});
