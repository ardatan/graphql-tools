import {
  GraphQLFloat,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  parse,
} from 'graphql';
import {
  buildExecutionContext,
  clearExecutionPlanCache,
  compileExecutionPlan,
  executeSync,
  getExecutionPlan,
  isExecutionPlan,
  type ExecutionContext,
} from '../execute.js';

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
    // Plans are WeakMap-cached by document; tests that share parse() results
    // across cases rely on identity — clear nothing global. Per-document clear
    // is exercised explicitly below.
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
      expect(plan.rootExecutions).toBeDefined();
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

  it('records completionKind and skipIsTypeOf for object fields', () => {
    const document = parse('{ items { name friend { name } } }');
    const plan = compileExecutionPlan({ schema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    if (!isExecutionPlan(plan)) {
      return;
    }
    const itemsPlan = plan.fieldPlanByNodes.get(plan.rootFields.get('items')!);
    expect(itemsPlan?.completionKind).toBe('list');
    const itemFields = plan.subfieldsByNodes.get(plan.rootFields.get('items')!)?.get(itemType);
    expect(itemFields).toBeDefined();
    const namePlan = plan.fieldPlanByNodes.get(itemFields!.get('name')!);
    expect(namePlan?.completionKind).toBe('leaf');
    const friendPlan = plan.fieldPlanByNodes.get(itemFields!.get('friend')!);
    expect(friendPlan?.completionKind).toBe('object');
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
    expect(fieldPlan?.listItemLeaf).toMatchObject({
      itemNonNull: false,
    });
    expect(fieldPlan?.listItemLeaf?.leafType.name).toBe('Int');
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
});
