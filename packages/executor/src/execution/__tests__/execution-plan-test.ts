import {
  GraphQLInt,
  GraphQLList,
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

  it('does not compile a plan when @skip depends on variables', () => {
    const document = parse('query ($s: Boolean!) { a b @skip(if: $s) }');
    expect(compileExecutionPlan({ schema, document })).toBeUndefined();
    const exeContext = buildExecutionContext({
      schema,
      document,
      variableValues: { s: false },
    });
    assertExeContext(exeContext);
    expect(exeContext.plan).toBeUndefined();
  });

  it('does not compile a plan when the document uses @defer', () => {
    const document = parse('{ a ... @defer { b } }');
    expect(compileExecutionPlan({ schema, document })).toBeUndefined();
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

  it('leaves variable argument coercion to getArgumentValues', () => {
    const document = parse('query ($name: String) { hello(name: $name) }');
    const plan = compileExecutionPlan({ schema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    if (!isExecutionPlan(plan)) {
      return;
    }
    const fieldPlan = plan.fieldPlanByNodes.get(plan.rootFields.get('hello')!);
    expect(fieldPlan?.hasArgs).toBe(true);
    expect(fieldPlan?.staticArgs).toBeUndefined();
    expect(fieldPlan?.argumentReader).toBeUndefined();
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
