/**
 * Dangerous warm-path edges for the cacheable execution plan (checkpoint tip).
 * These lock in fixes for union FieldNode leakage, list-item kind,
 * leaf coerceVariables nullability / GQL17 sources, and related pitfalls.
 */
import {
  GraphQLBoolean,
  GraphQLError,
  GraphQLID,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLInterfaceType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLString,
  GraphQLUnionType,
  parse,
  valueFromASTUntyped,
  versionInfo,
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
  getPlannedSubfieldExecutions,
  getPlannedSubfields,
  isExecutionPlan,
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

describe('execution plan warm-path edges', () => {
  afterEach(() => {
    clearExecutionPlanCache();
  });

  describe('union / interface FieldNode keys', () => {
    const Dog = new GraphQLObjectType({
      name: 'Dog',
      fields: {
        name: { type: GraphQLString },
        // Dog-only; must not leak onto Cat via shared AST FieldNode.
        barkVolume: { type: GraphQLInt },
      },
    });
    const Cat = new GraphQLObjectType({
      name: 'Cat',
      fields: {
        name: { type: GraphQLString },
        // Same response name as Dog.barkVolume but different meaning/type usage.
        meowVolume: { type: GraphQLInt },
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
          pets: {
            type: new GraphQLList(Pet),
            resolve: () => [
              { __typename: 'Dog', name: 'Odie', barkVolume: 11 },
              { __typename: 'Cat', name: 'Garfield', meowVolume: 3 },
            ],
          },
        },
      }),
      types: [Dog, Cat],
    });

    it('does not leak Dog-only field plans onto Cat for shared inline-fragment FieldNodes', () => {
      // `name` FieldNode is shared across both inline fragments' collect path
      // identities in some collects; barkVolume must stay Dog-only.
      const document = parse(`
        {
          pets {
            ... on Dog { name barkVolume }
            ... on Cat { name meowVolume }
          }
        }
      `);
      const plan = compileExecutionPlan({ schema, document });
      expect(isExecutionPlan(plan)).toBe(true);

      const result = executeSync({ schema, document });
      expect(result).toEqual({
        data: {
          pets: [
            { name: 'Odie', barkVolume: 11 },
            { name: 'Garfield', meowVolume: 3 },
          ],
        },
      });

      // Warm path second execute (cached plan).
      expect(executeSync({ schema, document })).toEqual(result);
    });

    it('getPlannedFieldPlan requires parentType match on exact fieldNodes identity', () => {
      const document = parse(`
        {
          pets {
            ... on Dog { name }
            ... on Cat { name }
          }
        }
      `);
      const plan = compileExecutionPlan({ schema, document });
      expect(isExecutionPlan(plan)).toBe(true);
      if (!isExecutionPlan(plan)) {
        return;
      }
      const petsNodes = plan.rootFields.get('pets')!;
      const dogFields = plan.subfieldsByNodes.get(petsNodes)?.get(Dog);
      const catFields = plan.subfieldsByNodes.get(petsNodes)?.get(Cat);
      expect(dogFields).toBeDefined();
      expect(catFields).toBeDefined();
      const dogNameNodes = dogFields!.get('name')!;
      const dogPlan = getPlannedFieldPlan(plan, dogNameNodes, Dog);
      expect(dogPlan?.parentType).toBe(Dog);
      // Wrong parentType must not return Dog's plan (even on exact array hit).
      expect(getPlannedFieldPlan(plan, dogNameNodes, Cat)).toBeUndefined();
      // A new array that only shares the primary AST node must not hit either.
      expect(getPlannedFieldPlan(plan, [dogNameNodes[0]!], Dog)).toBeUndefined();
    });

    it('executes interface fields per concrete type without cross-type nulling', () => {
      const Named = new GraphQLInterfaceType({
        name: 'Named',
        fields: { name: { type: GraphQLString } },
        resolveType(value: { __typename?: string }) {
          return value.__typename === 'Cat' ? 'Cat' : 'Dog';
        },
      });
      const IDog = new GraphQLObjectType({
        name: 'Dog',
        interfaces: [Named],
        fields: {
          name: { type: GraphQLString },
          woof: { type: GraphQLString, resolve: () => 'woof' },
        },
      });
      const ICat = new GraphQLObjectType({
        name: 'Cat',
        interfaces: [Named],
        fields: {
          name: { type: GraphQLString },
          meow: { type: GraphQLString, resolve: () => 'meow' },
        },
      });
      const ifaceSchema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            named: {
              type: new GraphQLList(Named),
              resolve: () => [
                { __typename: 'Dog', name: 'Odie' },
                { __typename: 'Cat', name: 'Garfield' },
              ],
            },
          },
        }),
        types: [IDog, ICat],
      });
      const document = parse(`
        {
          named {
            name
            ... on Dog { woof }
            ... on Cat { meow }
          }
        }
      `);
      compileExecutionPlan({ schema: ifaceSchema, document });
      expect(executeSync({ schema: ifaceSchema, document })).toEqual({
        data: {
          named: [
            { name: 'Odie', woof: 'woof' },
            { name: 'Garfield', meow: 'meow' },
          ],
        },
      });
    });
  });

  describe('variable @skip / @include', () => {
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          a: { type: GraphQLString, resolve: () => 'a' },
          b: { type: GraphQLString, resolve: () => 'b' },
          c: { type: GraphQLString, resolve: () => 'c' },
        },
      }),
    });

    it('handles combined @skip and @include on sibling fields', () => {
      const document = parse(`
        query ($skipB: Boolean!, $includeC: Boolean!) {
          a
          b @skip(if: $skipB)
          c @include(if: $includeC)
        }
      `);
      const plan = compileExecutionPlan({ schema, document });
      expect(isExecutionPlan(plan)).toBe(true);
      expect(
        executeSync({
          schema,
          document,
          variableValues: { skipB: false, includeC: true },
        }),
      ).toEqual({ data: { a: 'a', b: 'b', c: 'c' } });
      expect(
        executeSync({
          schema,
          document,
          variableValues: { skipB: true, includeC: false },
        }),
      ).toEqual({ data: { a: 'a' } });
      expect(
        executeSync({
          schema,
          document,
          variableValues: { skipB: false, includeC: false },
        }),
      ).toEqual({ data: { a: 'a', b: 'b' } });
    });

    it('handles @skip on an inline fragment that shares a field with the root', () => {
      const document = parse(`
        query ($s: Boolean!) {
          a
          ... @skip(if: $s) { b }
        }
      `);
      const plan = compileExecutionPlan({ schema, document });
      expect(isExecutionPlan(plan)).toBe(true);
      if (isExecutionPlan(plan)) {
        expect(plan.skipIncludePredicates).toBe(true);
        expect(plan.rootExecutions).toBeDefined();
        expect(plan.rootExecutions!.some(e => e.responseName === 'b' && e.include != null)).toBe(
          true,
        );
      }
      expect(executeSync({ schema, document, variableValues: { s: false } })).toEqual({
        data: { a: 'a', b: 'b' },
      });
      expect(executeSync({ schema, document, variableValues: { s: true } })).toEqual({
        data: { a: 'a' },
      });
    });

    it('handles @skip on a fragment spread', () => {
      const document = parse(`
        query ($s: Boolean!) {
          a
          ...Frag @skip(if: $s)
        }
        fragment Frag on Query { b c }
      `);
      const plan = compileExecutionPlan({ schema, document });
      expect(isExecutionPlan(plan)).toBe(true);
      if (isExecutionPlan(plan)) {
        expect(plan.skipIncludePredicates).toBe(true);
        expect(plan.rootExecutions).toBeDefined();
      }
      expect(executeSync({ schema, document, variableValues: { s: false } })).toEqual({
        data: { a: 'a', b: 'b', c: 'c' },
      });
      expect(executeSync({ schema, document, variableValues: { s: true } })).toEqual({
        data: { a: 'a' },
      });
    });

    it('ORs fragment and root paths when the same field is contributed twice', () => {
      const document = parse(`
        query ($s: Boolean!) {
          b
          ... @skip(if: $s) { b }
        }
      `);
      const plan = compileExecutionPlan({ schema, document });
      expect(isExecutionPlan(plan)).toBe(true);
      // Root `b` is always included → fragment skip must not drop it.
      expect(executeSync({ schema, document, variableValues: { s: true } })).toEqual({
        data: { b: 'b' },
      });
      expect(executeSync({ schema, document, variableValues: { s: false } })).toEqual({
        data: { b: 'b' },
      });
    });
  });

  describe('list-item kind', () => {
    it('completes list-of-object items as objects (not with parent list kind)', () => {
      const friendType = new GraphQLObjectType({
        name: 'Friend',
        fields: { name: { type: GraphQLString } },
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
              type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(itemType))),
              resolve: () => [
                { name: 'a', friend: { name: 'fa' } },
                { name: 'b', friend: null },
              ],
            },
          },
        }),
      });
      const document = parse('{ items { name friend { name } } }');
      const plan = compileExecutionPlan({ schema, document });
      expect(isExecutionPlan(plan)).toBe(true);
      if (isExecutionPlan(plan)) {
        const itemsPlan = plan.fieldPlanByNodes.get(plan.rootFields.get('items')!);
        expect(itemsPlan?.kind).toBe('list');
        if (itemsPlan?.kind === 'list') {
          expect(itemsPlan.objectType?.name).toBe('Item');
        }
      }
      // Warm execute: nested object fields must not inherit list kind.
      expect(executeSync({ schema, document })).toEqual({
        data: {
          items: [
            { name: 'a', friend: { name: 'fa' } },
            { name: 'b', friend: null },
          ],
        },
      });
    });

    it('completes async list-of-leaf items without treating them as lists', async () => {
      const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            values: {
              type: new GraphQLList(GraphQLInt),
              resolve: () => [Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)],
            },
          },
        }),
      });
      const document = parse('{ values }');
      compileExecutionPlan({ schema, document });
      const result = await execute({ schema, document });
      expect(result).toEqual({ data: { values: [1, 2, 3] } });
    });

    it('nulls non-null list items and bubbles according to list nullability', () => {
      const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            values: {
              type: new GraphQLList(new GraphQLNonNull(GraphQLInt)),
              resolve: () => [1, null, 3],
            },
          },
        }),
      });
      const document = parse('{ values }');
      compileExecutionPlan({ schema, document });
      const result = executeSync({ schema, document });
      expect(result.data).toEqual({ values: null });
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it('keeps list-of-list leaf completion correct on the warm path', () => {
      const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            matrix: {
              type: new GraphQLList(new GraphQLList(GraphQLInt)),
              resolve: () => [
                [1, 2],
                [3, 4],
              ],
            },
          },
        }),
      });
      const document = parse('{ matrix }');
      compileExecutionPlan({ schema, document });
      expect(executeSync({ schema, document })).toEqual({
        data: {
          matrix: [
            [1, 2],
            [3, 4],
          ],
        },
      });
    });
  });

  describe('coerceVariables leaf nullability and sources', () => {
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          hello: {
            type: GraphQLString,
            args: {
              name: { type: GraphQLString },
              id: { type: GraphQLID },
              n: { type: GraphQLInt },
              flag: { type: GraphQLBoolean },
            },
            resolve: (_src, args: Record<string, unknown>) => JSON.stringify(args),
          },
          required: {
            type: GraphQLString,
            args: { name: { type: new GraphQLNonNull(GraphQLString) } },
            resolve: (_src, args: { name: string }) => args.name,
          },
        },
      }),
    });

    it('errors when a NonNull leaf variable is missing', () => {
      const document = parse('query ($name: String!) { required(name: $name) }');
      const plan = compileExecutionPlan({ schema, document });
      expect(isExecutionPlan(plan)).toBe(true);
      if (!isExecutionPlan(plan)) {
        return;
      }
      const coerced = plan.coerceVariables({});
      expect('errors' in coerced).toBe(true);
    });

    it('errors when null is passed for a NonNull leaf variable', () => {
      const document = parse('query ($name: String!) { required(name: $name) }');
      const plan = compileExecutionPlan({ schema, document });
      expect(isExecutionPlan(plan)).toBe(true);
      if (!isExecutionPlan(plan)) {
        return;
      }
      const coerced = plan.coerceVariables({ name: null });
      expect('errors' in coerced).toBe(true);
    });

    it('allows omitting an optional leaf variable', () => {
      const document = parse('query ($name: String) { hello(name: $name) }');
      const plan = compileExecutionPlan({ schema, document });
      expect(isExecutionPlan(plan)).toBe(true);
      if (!isExecutionPlan(plan)) {
        return;
      }
      const coerced = plan.coerceVariables({});
      expect('variableValues' in coerced).toBe(true);
      if ('variableValues' in coerced) {
        expect(coerced.variableValues.coerced).not.toHaveProperty('name');
      }
      expect(executeSync({ schema, document, variableValues: {} })).toEqual({
        data: { hello: '{}' },
      });
    });

    it('allows null for an optional leaf variable', () => {
      const document = parse('query ($name: String) { hello(name: $name) }');
      const plan = compileExecutionPlan({ schema, document });
      expect(isExecutionPlan(plan)).toBe(true);
      if (!isExecutionPlan(plan)) {
        return;
      }
      const coerced = plan.coerceVariables({ name: null });
      expect('variableValues' in coerced).toBe(true);
      if ('variableValues' in coerced) {
        expect(coerced.variableValues.coerced['name']).toBeNull();
      }
      expect(executeSync({ schema, document, variableValues: { name: null } })).toEqual({
        data: { hello: '{"name":null}' },
      });
    });

    it('coerces Int / Boolean / ID leaf variables on the warm path', () => {
      const document = parse(
        'query ($n: Int, $flag: Boolean, $id: ID) { hello(n: $n, flag: $flag, id: $id) }',
      );
      compileExecutionPlan({ schema, document });
      const result = executeSync({
        schema,
        document,
        variableValues: { n: 7, flag: true, id: 'x' },
      });
      expect(result.data).toEqual({
        hello: expect.any(String),
      });
      expect(JSON.parse((result.data as { hello: string }).hello)).toEqual({
        n: 7,
        flag: true,
        id: 'x',
      });
    });

    it('populates VariableValues.sources on the builtin-leaf fast path', () => {
      const document = parse('query ($name: String) { hello(name: $name) }');
      const plan = compileExecutionPlan({ schema, document });
      expect(isExecutionPlan(plan)).toBe(true);
      if (!isExecutionPlan(plan)) {
        return;
      }
      const coerced = plan.coerceVariables({ name: 'Ada' });
      expect('variableValues' in coerced).toBe(true);
      if ('variableValues' in coerced) {
        expect(coerced.variableValues.sources['name']).toMatchObject({
          signature: expect.objectContaining({ name: 'name', default: undefined }),
          value: 'Ada',
        });
      }
    });
  });

  describe('other warm-path pitfalls', () => {
    it('does not use default-property leaf path when a custom fieldResolver is set', () => {
      const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            // Property on rootValue; custom fieldResolver must win.
            n: { type: GraphQLInt },
          },
        }),
      });
      const document = parse('{ n }');
      compileExecutionPlan({ schema, document });
      expect(
        executeSync({
          schema,
          document,
          rootValue: { n: 1 },
          fieldResolver: () => 99,
        }),
      ).toEqual({ data: { n: 99 } });
    });

    it('passes resolver args to zero-arity rest-parameter root methods (planned == classic)', () => {
      // `Function.length === 0` for rest params — must still receive args/context/info.
      const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            arity: { type: GraphQLInt },
          },
        }),
      });
      const document = parse('{ arity }');
      const rootValue = {
        arity(...params: unknown[]) {
          return params.length;
        },
      };
      const planned = executeSync({ schema, document, rootValue });
      const classic = executeClassicSync({ schema, document, rootValue });
      expect(planned).toEqual(classic);
      expect(planned).toEqual({ data: { arity: 3 } });
    });

    it('exposes resolveInfo via arguments[2] on zero-arity root methods (planned == classic)', () => {
      const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            fieldName: { type: GraphQLString },
          },
        }),
      });
      const document = parse('{ fieldName }');
      const rootValue = {
        fieldName() {
          // eslint-disable-next-line prefer-rest-params
          const info = arguments[2] as { fieldName?: string } | undefined;
          return info?.fieldName ?? 'missing';
        },
      };
      const planned = executeSync({ schema, document, rootValue });
      const classic = executeClassicSync({ schema, document, rootValue });
      expect(planned).toEqual(classic);
      expect(planned).toEqual({ data: { fieldName: 'fieldName' } });
    });

    it('passes resolver args to zero-arity rest-parameter object-list methods (planned == classic)', () => {
      const Item = new GraphQLObjectType({
        name: 'ArityItem',
        fields: {
          arity: { type: GraphQLInt },
        },
      });
      const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            items: { type: new GraphQLList(Item) },
          },
        }),
      });
      const document = parse('{ items { arity } }');
      const rootValue = {
        items: [
          {
            arity(...params: unknown[]) {
              return params.length;
            },
          },
        ],
      };
      const planned = executeSync({ schema, document, rootValue });
      const classic = executeClassicSync({ schema, document, rootValue });
      expect(planned).toEqual(classic);
      expect(planned).toEqual({ data: { items: [{ arity: 3 }] } });
    });

    it('still runs isTypeOf when present (skipIsTypeOf false)', () => {
      let checked = false;
      const Thing = new GraphQLObjectType({
        name: 'Thing',
        isTypeOf(value) {
          checked = true;
          return (value as { ok?: boolean }).ok === true;
        },
        fields: {
          name: { type: GraphQLString },
        },
      });
      const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            thing: {
              type: Thing,
              resolve: () => ({ ok: true, name: 't' }),
            },
          },
        }),
      });
      const document = parse('{ thing { name } }');
      const plan = compileExecutionPlan({ schema, document });
      expect(isExecutionPlan(plan)).toBe(true);
      if (isExecutionPlan(plan)) {
        const fieldPlan = plan.fieldPlanByNodes.get(plan.rootFields.get('thing')!);
        expect(fieldPlan?.skipIsTypeOf).toBe(false);
      }
      expect(executeSync({ schema, document })).toEqual({
        data: { thing: { name: 't' } },
      });
      expect(checked).toBe(true);
    });

    it('fails isTypeOf check on the planned object path', () => {
      const Thing = new GraphQLObjectType({
        name: 'Thing',
        isTypeOf: () => false,
        fields: {
          name: { type: GraphQLString },
        },
      });
      const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            thing: {
              type: Thing,
              resolve: () => ({ name: 't' }),
            },
          },
        }),
      });
      const document = parse('{ thing { name } }');
      compileExecutionPlan({ schema, document });
      const result = executeSync({ schema, document });
      expect(result.data).toEqual({ thing: null });
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it('reuses one plan across two executes with different rootValues', () => {
      const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            n: { type: GraphQLInt },
          },
        }),
      });
      const document = parse('{ n }');
      const plan = compileExecutionPlan({ schema, document });
      expect(executeSync({ schema, document, rootValue: { n: 1 } })).toEqual({ data: { n: 1 } });
      expect(executeSync({ schema, document, rootValue: { n: 2 } })).toEqual({ data: { n: 2 } });
      expect(compileExecutionPlan({ schema, document })).toBe(plan);
    });
  });
});

(versionInfo.major >= 17 ? describe : describe.skip)(
  'execution plan GQL17 leaf sources for nested JSON literals',
  () => {
    /**
     * Builtin-leaf fast path used to leave `sources` empty. Nested
     * `replaceVariables` in JSON literals needs real sources — enums already
     * fall back to getVariableValues; String/Int must too (or populate sources).
     */
    it('preserves a String variable nested in a JSON literal argument', async () => {
      const JSONScalar = new GraphQLScalarType({
        name: 'JSON',
        coerceInputValue: (v: unknown) => v,
        coerceInputLiteral: (node: { kind: string }) => valueFromASTUntyped(node as never),
      } as never);
      const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            foo: {
              type: GraphQLString,
              args: { data: { type: JSONScalar } },
              resolve: (_: unknown, args: { data?: unknown }) => JSON.stringify(args.data),
            },
          },
        }),
      });
      const document = parse('query ($s: String!) { foo(data: { name: $s }) }');
      const plan = compileExecutionPlan({ schema, document });
      expect(isExecutionPlan(plan)).toBe(true);

      const result = await execute({
        schema,
        document,
        variableValues: { s: 'Ada' },
      });
      expect(result).toEqual({
        data: { foo: '{"name":"Ada"}' },
      });
    });

    it('preserves an Int variable nested in a JSON literal argument', async () => {
      const JSONScalar = new GraphQLScalarType({
        name: 'JSON',
        coerceInputValue: (v: unknown) => v,
        coerceInputLiteral: (node: { kind: string }) => valueFromASTUntyped(node as never),
      } as never);
      const schema = new GraphQLSchema({
        types: [GraphQLInt],
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            foo: {
              type: GraphQLString,
              args: { data: { type: JSONScalar } },
              resolve: (_: unknown, args: { data?: unknown }) => JSON.stringify(args.data),
            },
          },
        }),
      });
      const document = parse('query ($n: Int!) { foo(data: { n: $n }) }');
      compileExecutionPlan({ schema, document });
      const result = await execute({
        schema,
        document,
        variableValues: { n: 42 },
      });
      expect(result).toEqual({
        data: { foo: '{"n":42}' },
      });
    });
  },
);

describe('root runner + field-local leaf list settle', () => {
  it('keeps async classic object list when a sibling leaf list is async', async () => {
    const rowType = new GraphQLObjectType({
      name: 'Row',
      fields: {
        label: { type: GraphQLString },
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          rows: {
            type: new GraphQLList(rowType),
            resolve: () => [Promise.resolve({ label: 'r1' }), { label: 'r2' }],
          },
          scores: {
            type: new GraphQLList(GraphQLInt),
            resolve: () => [Promise.resolve(1), Promise.resolve(2)],
          },
        },
      }),
    });
    const document = parse('{ rows { label } scores }');
    compileExecutionPlan({ schema, document });
    await expect(execute({ schema, document })).resolves.toEqual({
      data: { rows: [{ label: 'r1' }, { label: 'r2' }], scores: [1, 2] },
    });
  });

  it('keeps async root leaf values when a sibling leaf list is also async', async () => {
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          count: {
            type: GraphQLInt,
            resolve: () => Promise.resolve(7),
          },
          scores: {
            type: new GraphQLList(GraphQLInt),
            resolve: () => [Promise.resolve(1), Promise.resolve(2)],
          },
        },
      }),
    });
    const document = parse('{ count scores }');
    compileExecutionPlan({ schema, document });
    await expect(execute({ schema, document })).resolves.toEqual({
      data: { count: 7, scores: [1, 2] },
    });
  });

  // R11/R12 P2: nested `container { list stop }` so rootAsync=false and the
  // thin leaf/object-list stores use observeFieldLocalPromise. Abort on `stop`
  // so executeFields skips the normal promise join (signal.reason path); a
  // deferred list rejection after exit must not become an unhandledRejection.
  (process.env['LEAK_TEST'] ? it.skip : it)(
    'observes nested async leaf-list when abort skips the promise join (no UHR)',
    async () => {
      const document = parse('{ container { scores stop } }');

      const makeSchema = (controller: AbortController, reason: Error) => {
        const Container = new GraphQLObjectType({
          name: 'LeafObserveContainer',
          fields: {
            scores: {
              type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLInt))),
            },
            stop: {
              type: new GraphQLNonNull(GraphQLString),
              resolve: () => {
                controller.abort(reason);
                throw reason;
              },
            },
          },
        });
        return new GraphQLSchema({
          query: new GraphQLObjectType({
            name: 'Query',
            fields: {
              container: { type: Container },
            },
          }),
        });
      };
      const makeRoot = (pending: PromiseLike<number>) => ({
        container: {
          scores: [pending],
        },
      });

      // Unique abort reason — `.rejects.toBe(reason)` fails if execute fulfills
      // (both undefined) or if stop never runs.
      const abortReasonP = Object.assign(new Error('leaf observe abort'), {
        name: 'LeafObserveAbort',
      });
      const controllerP = new AbortController();
      const schemaP = makeSchema(controllerP, abortReasonP);
      const plan = compileExecutionPlan({ schema: schemaP, document });
      expect(isExecutionPlan(plan)).toBe(true);
      if (!isExecutionPlan(plan)) {
        return;
      }
      const internal = plan as InternalExecutionPlan;
      const containerEx = (internal.rootExecutions ?? []).find(
        ex => ex.responseName === 'container',
      );
      expect(containerEx).toBeDefined();
      const containerType = schemaP.getType('LeafObserveContainer');
      const nested = getPlannedSubfieldExecutions(
        internal,
        containerEx!.fieldNodes,
        containerType as GraphQLObjectType,
      );
      expect(nested?.some(ex => ex.fieldPlan.kind === 'leafList')).toBe(true);

      let rejectScore!: (reason: Error) => void;
      const pendingScore = new Promise<number>((_resolve, reject) => {
        rejectScore = reject;
      });

      let unhandled = 0;
      const onUnhandled = (): void => {
        unhandled += 1;
      };
      process.on('unhandledRejection', onUnhandled);
      try {
        // Abort may throw sync from executeFields (signal.reason path) or reject.
        await expect(
          Promise.resolve().then(() =>
            execute({
              plan,
              rootValue: makeRoot(pendingScore),
              signal: controllerP.signal,
            }),
          ),
        ).rejects.toBe(abortReasonP);

        const abortReasonC = Object.assign(new Error('leaf observe abort classic'), {
          name: 'LeafObserveAbortC',
        });
        const controllerC = new AbortController();
        let rejectClassic!: (reason: Error) => void;
        const pendingClassic = new Promise<number>((_resolve, reject) => {
          rejectClassic = reject;
        });
        await expect(
          Promise.resolve().then(() =>
            executeClassic({
              schema: makeSchema(controllerC, abortReasonC),
              document,
              rootValue: makeRoot(pendingClassic),
              signal: controllerC.signal,
            }),
          ),
        ).rejects.toBe(abortReasonC);

        rejectScore(Object.assign(new Error('score late'), { name: 'ScoreLate' }));
        rejectClassic(Object.assign(new Error('score late classic'), { name: 'ScoreLateC' }));
        await new Promise<void>(resolve => {
          setImmediate(resolve);
        });
        expect(unhandled).toBe(0);
      } finally {
        process.off('unhandledRejection', onUnhandled);
      }
    },
  );

  (process.env['LEAK_TEST'] ? it.skip : it)(
    'observes nested async object-list when abort skips the promise join (no UHR)',
    async () => {
      const User = new GraphQLObjectType({
        name: 'ObserveUser',
        fields: {
          id: { type: new GraphQLNonNull(GraphQLString) },
        },
      });
      const document = parse('{ container { users { id } stop } }');

      const makeSchema = (controller: AbortController, reason: Error) => {
        const Container = new GraphQLObjectType({
          name: 'ObjectObserveContainer',
          fields: {
            // Default property resolve → thin object-list path (nested, not root).
            users: {
              type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(User))),
            },
            stop: {
              type: new GraphQLNonNull(GraphQLString),
              resolve: () => {
                controller.abort(reason);
                throw reason;
              },
            },
          },
        });
        return new GraphQLSchema({
          query: new GraphQLObjectType({
            name: 'Query',
            fields: {
              container: { type: Container },
            },
          }),
        });
      };
      const makeRoot = (pending: PromiseLike<unknown>) => ({
        container: {
          users: [pending],
        },
      });

      const abortReasonP = Object.assign(new Error('object-list observe abort'), {
        name: 'ObjectObserveAbort',
      });
      const controllerP = new AbortController();
      const schemaP = makeSchema(controllerP, abortReasonP);
      const plan = compileExecutionPlan({ schema: schemaP, document });
      expect(isExecutionPlan(plan)).toBe(true);
      if (!isExecutionPlan(plan)) {
        return;
      }
      const internal = plan as InternalExecutionPlan;
      const containerEx = (internal.rootExecutions ?? []).find(
        ex => ex.responseName === 'container',
      );
      expect(containerEx).toBeDefined();
      const containerType = schemaP.getType('ObjectObserveContainer');
      const nested = getPlannedSubfieldExecutions(
        internal,
        containerEx!.fieldNodes,
        containerType as GraphQLObjectType,
      );
      expect(nested?.some(ex => ex.fieldPlan.kind === 'list')).toBe(true);

      let rejectUser!: (reason: Error) => void;
      const pendingUser = new Promise<unknown>((_resolve, reject) => {
        rejectUser = reject;
      });

      let unhandled = 0;
      const onUnhandled = (): void => {
        unhandled += 1;
      };
      process.on('unhandledRejection', onUnhandled);
      try {
        await expect(
          Promise.resolve().then(() =>
            execute({
              plan,
              rootValue: makeRoot(pendingUser),
              signal: controllerP.signal,
            }),
          ),
        ).rejects.toBe(abortReasonP);

        const abortReasonC = Object.assign(new Error('object-list observe abort classic'), {
          name: 'ObjectObserveAbortC',
        });
        const controllerC = new AbortController();
        let rejectClassic!: (reason: Error) => void;
        const pendingClassic = new Promise<unknown>((_resolve, reject) => {
          rejectClassic = reject;
        });
        await expect(
          Promise.resolve().then(() =>
            executeClassic({
              schema: makeSchema(controllerC, abortReasonC),
              document,
              rootValue: makeRoot(pendingClassic),
              signal: controllerC.signal,
            }),
          ),
        ).rejects.toBe(abortReasonC);

        rejectUser(Object.assign(new Error('user late'), { name: 'UserLate' }));
        rejectClassic(Object.assign(new Error('user late classic'), { name: 'UserLateC' }));
        await new Promise<void>(resolve => {
          setImmediate(resolve);
        });
        expect(unhandled).toBe(0);
      } finally {
        process.off('unhandledRejection', onUnhandled);
      }
    },
  );

  // Retain NonNull sync-fail parity (join path); abort tests above cover observe.
  it('nested NonNull sibling sync fail still nulls container (parity)', async () => {
    const document = parse('{ container { scores stop } }');
    const makeSchema = (getScores: () => unknown[], onStop: () => void) => {
      const Container = new GraphQLObjectType({
        name: 'ParityLeafContainer',
        fields: {
          scores: {
            type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLInt))),
            resolve: () => getScores(),
          },
          stop: {
            type: new GraphQLNonNull(GraphQLString),
            resolve: () => {
              onStop();
              throw new Error('stop sync');
            },
          },
        },
      });
      return new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: { container: { type: Container } },
        }),
      });
    };
    const rootValue = { container: {} };

    let resolvePlanned!: (value: number) => void;
    const pendingPlanned = new Promise<number>(resolve => {
      resolvePlanned = resolve;
    });
    let stopPlanned = false;
    const schemaP = makeSchema(
      () => [pendingPlanned],
      () => {
        stopPlanned = true;
      },
    );
    const plan = compileExecutionPlan({ schema: schemaP, document });
    expect(isExecutionPlan(plan)).toBe(true);
    if (!isExecutionPlan(plan)) {
      return;
    }
    // Promise.resolve normalizes MaybePromise so .then is always available.
    const plannedPromise = Promise.resolve(execute({ plan, rootValue }));
    // Attach settlement probe before first yield (no-void; avoid UHR if sync reject).
    let plannedSettled = false;
    plannedPromise.then(
      () => {
        plannedSettled = true;
      },
      () => {
        plannedSettled = true;
      },
    );
    // stop runs sync after scores starts; execution must stay pending until item settles.
    await new Promise<void>(resolve => {
      setImmediate(resolve);
    });
    expect(stopPlanned).toBe(true);
    expect(plannedSettled).toBe(false);
    resolvePlanned(1);
    const planned = await plannedPromise;

    let resolveClassic!: (value: number) => void;
    const pendingClassic = new Promise<number>(resolve => {
      resolveClassic = resolve;
    });
    let stopClassic = false;
    const schemaC = makeSchema(
      () => [pendingClassic],
      () => {
        stopClassic = true;
      },
    );
    const classicPromise = executeClassic({ schema: schemaC, document, rootValue });
    let classicSettled = false;
    classicPromise.then(
      () => {
        classicSettled = true;
      },
      () => {
        classicSettled = true;
      },
    );
    await new Promise<void>(resolve => {
      setImmediate(resolve);
    });
    expect(stopClassic).toBe(true);
    expect(classicSettled).toBe(false);
    resolveClassic(1);
    const classic = await classicPromise;

    expect(planned).toEqual(classic);
    expect(planned).toMatchObject({
      data: { container: null },
      errors: [{ message: 'stop sync', path: ['container', 'stop'] }],
    });
  });
});

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
    expect(() => executeSync({ schema, document })).toThrow();
    expect(parseLiteralCalls).toBe(0);
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

describe('thin-walk fallback invocation counts', () => {
  it('partial thin-walk then classic: one-shot id getter is not re-read', () => {
    // `id` uses default property resolve (thin completes it); `name(lang:)` has
    // args so thin declines mid-walk. One-shot getter throws on re-read so a
    // re-invoke-on-fallback bug fails. Path assertion: planned result matches
    // classic, and id was read exactly once on the planned path.
    let idReads = 0;
    let nameReads = 0;
    let nameSawIdAlready = false;
    const User = new GraphQLObjectType({
      name: 'ThinCountUser',
      fields: {
        id: { type: GraphQLString },
        name: {
          type: GraphQLString,
          args: { lang: { type: GraphQLString } },
          resolve: (obj: { name: string }, args: { lang?: string | null }) => {
            // Thin walk completes `id` before declining on this arg-bearing
            // sibling; classic-from-start would also read id first, so we only
            // treat this as supporting evidence alongside the one-shot getter.
            nameSawIdAlready = idReads >= 1;
            nameReads += 1;
            return args.lang ? `${obj.name}:${args.lang}` : obj.name;
          },
        },
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          user: {
            type: User,
            resolve: () => ({
              get id() {
                idReads += 1;
                if (idReads > 1) {
                  throw new Error('id re-read after thin completion');
                }
                return '1';
              },
              name: 'Ada',
            }),
          },
        },
      }),
    });
    const document = parse('{ user { id name(lang: "en") } }');
    const result = executeSync({ schema, document });
    expect(result).toEqual({
      data: { user: { id: '1', name: 'Ada:en' } },
    });
    expect(idReads).toBe(1);
    expect(nameReads).toBe(1);
    expect(nameSawIdAlready).toBe(true);

    // Classic path also reads once; results must match (no double-invoke).
    idReads = 0;
    nameReads = 0;
    nameSawIdAlready = false;
    const classic = executeClassicSync({ schema, document });
    expect(classic).toEqual(result);
    expect(idReads).toBe(1);
    expect(nameReads).toBe(1);
    expect(nameSawIdAlready).toBe(true);
  });

  it('does not re-read a completed getter when a sibling forces classic', () => {
    let idReads = 0;
    let nameReads = 0;
    let nameSawIdAlready = false;
    const User = new GraphQLObjectType({
      name: 'ThinGetterUser',
      fields: {
        id: { type: GraphQLString },
        name: {
          type: GraphQLString,
          args: { lang: { type: GraphQLString } },
          resolve: (obj: { name: string }, args: { lang?: string | null }) => {
            nameSawIdAlready = idReads >= 1;
            nameReads += 1;
            return args.lang ? `${obj.name}:${args.lang}` : obj.name;
          },
        },
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        // Default property resolve so the thin object walk runs on `user`.
        fields: {
          user: { type: User },
        },
      }),
    });
    const document = parse('{ user { id name(lang: "en") } }');
    const result = executeSync({
      schema,
      document,
      rootValue: {
        user: {
          get id() {
            idReads += 1;
            if (idReads > 1) {
              throw new Error('id re-read after thin completion');
            }
            return '1';
          },
          name: 'Ada',
        },
      },
    });
    expect(result).toEqual({
      data: { user: { id: '1', name: 'Ada:en' } },
    });
    expect(idReads).toBe(1);
    expect(nameReads).toBe(1);
    expect(nameSawIdAlready).toBe(true);
  });

  // R22/R23 C1: after thinObjectMiss, completed leaf serialize must not re-run.
  it('C1: does not re-serialize a completed leaf after thinObjectMiss', () => {
    let serializeCalls = 0;
    const CountSer = new GraphQLScalarType({
      name: 'C1CountSer',
      serialize(value) {
        serializeCalls += 1;
        return String(value);
      },
    });
    const Item = new GraphQLObjectType({
      name: 'C1Item',
      fields: {
        id: { type: CountSer },
        name: {
          type: GraphQLString,
          args: { lang: { type: GraphQLString } },
          resolve: (obj: { name: string }, args: { lang?: string | null }) =>
            args.lang ? `${obj.name}:${args.lang}` : obj.name,
        },
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          items: { type: new GraphQLList(Item) },
        },
      }),
    });
    const document = parse('{ items { id name(lang: "en") } }');
    const rootValue = { items: [{ id: 1, name: 'Ada' }] };
    const result = executeSync({ schema, document, rootValue });
    expect(result).toEqual({
      data: { items: [{ id: '1', name: 'Ada:en' }] },
    });
    expect(serializeCalls).toBe(1);
    serializeCalls = 0;
    const classic = executeClassicSync({ schema, document, rootValue });
    expect(classic).toEqual(result);
    expect(serializeCalls).toBe(1);
  });

  // R22/R23 C2: pending leaf must serialize raw async values (not stash raw).
  it('C2: serializes pending async leaf raw values (not raw string for Int-like scalar)', async () => {
    const Tagged = new GraphQLScalarType({
      name: 'C2Tagged',
      serialize(value) {
        if (value === 'RAW') {
          return 'SERIALIZED';
        }
        throw new Error(`unexpected serialize input: ${String(value)}`);
      },
    });
    const Item = new GraphQLObjectType({
      name: 'C2Item',
      fields: {
        tag: { type: Tagged },
        label: { type: GraphQLString },
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          items: { type: new GraphQLList(Item) },
        },
      }),
    });
    const document = parse('{ items { tag label } }');
    const rootValue = {
      items: [{ tag: Promise.resolve('RAW'), label: 'ok' }],
    };
    const result = assertSingular(await execute({ schema, document, rootValue }));
    expect(result).toEqual({
      data: { items: [{ tag: 'SERIALIZED', label: 'ok' }] },
    });
    const classic = await executeClassic({ schema, document, rootValue });
    expect(classic).toEqual(result);
  });

  // R22/R23 C4: nested async NonNull null must bubble like classic.
  it('C4: nested async NonNull null bubbles with classic path', async () => {
    const Nested = new GraphQLObjectType({
      name: 'C4Nested',
      fields: {
        id: { type: new GraphQLNonNull(GraphQLString) },
      },
    });
    const Item = new GraphQLObjectType({
      name: 'C4Item',
      fields: {
        nested: { type: Nested },
        label: { type: GraphQLString },
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          items: { type: new GraphQLList(Item) },
        },
      }),
    });
    const document = parse('{ items { nested { id } label } }');
    const rootValue = {
      items: [
        {
          nested: Promise.resolve({ id: null }),
          label: 'keep',
        },
      ],
    };
    const result = assertSingular(await execute({ schema, document, rootValue }));
    const classic = await executeClassic({ schema, document, rootValue });
    expect(result).toEqual(classic);
    expect(result).toMatchObject({
      data: { items: [{ nested: null, label: 'keep' }] },
      errors: [expect.objectContaining({ path: ['items', 0, 'nested', 'id'] })],
    });
  });

  // R22/R23 C5: callable thenable (function with .then) — planned matches classic.
  // defaultFieldResolver invokes typeof==='function' before thenable check, so
  // both planned and classic invoke (no planned-only bug).
  it('C5: callable thenable matches classic (invoked, not awaited as thenable)', async () => {
    const Item = new GraphQLObjectType({
      name: 'C5Item',
      fields: {
        value: { type: GraphQLInt },
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          items: { type: new GraphQLList(Item) },
        },
      }),
    });
    const document = parse('{ items { value } }');
    let invokeCount = 0;
    const callableThenable = Object.assign(
      function callable() {
        invokeCount += 1;
        return 999;
      },
      { then: Promise.resolve(7).then.bind(Promise.resolve(7)) },
    );
    const rootValue = { items: [{ value: callableThenable }] };
    const result = assertSingular(await execute({ schema, document, rootValue }));
    const classic = await executeClassic({ schema, document, rootValue });
    expect(result).toEqual(classic);
    expect(result).toEqual({ data: { items: [{ value: 999 }] } });
    expect(invokeCount).toBeGreaterThan(0);
  });

  // R22/R23 C7: plan coerce must not double-call custom scalar parseValue.
  it('C7: coerce does not double-call custom scalar parseValue vs classic', () => {
    let parseCalls = 0;
    const Counted = new GraphQLScalarType({
      name: 'C7Counted',
      parseValue(value) {
        parseCalls += 1;
        return Number(value);
      },
      parseLiteral(ast) {
        if (ast.kind === 'IntValue') {
          return Number(ast.value);
        }
        return null;
      },
      serialize: Number,
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          echo: {
            type: GraphQLInt,
            args: { n: { type: Counted } },
            resolve: (_s, args: { n: number }) => args.n,
          },
        },
      }),
    });
    const document = parse('query ($n: C7Counted!) { echo(n: $n) }');
    parseCalls = 0;
    const result = executeSync({
      schema,
      document,
      variableValues: { n: 3 },
    });
    const plannedCalls = parseCalls;
    parseCalls = 0;
    const classic = executeClassicSync({
      schema,
      document,
      variableValues: { n: 3 },
    });
    expect(result).toEqual(classic);
    expect(result).toEqual({ data: { echo: 3 } });
    // Planned must not call parseValue more times than classic.
    expect(plannedCalls).toBeLessThanOrEqual(parseCalls);
    expect(plannedCalls).toBeGreaterThan(0);
  });

  // R22/R23 C3: plain walker must localize getter throws to the field path.
  it('C3: localizes plain-walker getter throws to the child field path', () => {
    const Item = new GraphQLObjectType({
      name: 'C3Item',
      fields: {
        ok: { type: GraphQLString },
        bad: { type: GraphQLString },
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          items: { type: new GraphQLList(Item) },
        },
      }),
    });
    const document = parse('{ items { ok bad } }');
    const rootValue = {
      items: [
        {
          ok: 'fine',
          get bad() {
            throw new Error('getter boom');
          },
        },
      ],
    };
    const result = executeSync({ schema, document, rootValue });
    expect(result).toMatchObject({
      data: { items: [{ ok: 'fine', bad: null }] },
      errors: [expect.objectContaining({ message: 'getter boom', path: ['items', 0, 'bad'] })],
    });
    const classic = executeClassicSync({ schema, document, rootValue });
    expect(classic).toMatchObject({
      data: { items: [{ ok: 'fine', bad: null }] },
      errors: [expect.objectContaining({ message: 'getter boom', path: ['items', 0, 'bad'] })],
    });
  });

  // R24 P1-07: compile must not run custom scalar parseLiteral for skipped fields;
  // holdArgumentError must not sticky-fail when the field is skipped.
  it('P1-07: no compile-time custom parseLiteral on skipped fields; skip hides bad literal', () => {
    let parseLiteralCalls = 0;
    const Boom = new GraphQLScalarType({
      name: 'BoomSkip',
      serialize: v => v,
      parseValue: v => v,
      parseLiteral(ast) {
        parseLiteralCalls += 1;
        if (ast.kind === 'StringValue' && ast.value === 'bad') {
          throw new GraphQLError('boom literal');
        }
        return valueFromASTUntyped(ast);
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          ok: { type: GraphQLString, resolve: () => 'ok' },
          echo: {
            type: Boom,
            args: { msg: { type: Boom } },
            resolve: (_s, args: { msg: unknown }) => args.msg,
          },
        },
      }),
    });
    const document = parse('query ($s: Boolean!) { ok echo(msg: "hi") @skip(if: $s) }');
    clearExecutionPlanCache(document);
    parseLiteralCalls = 0;
    const plan = compileExecutionPlan({ schema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    // Compile must not coerce skipped-field custom literals.
    expect(parseLiteralCalls).toBe(0);

    parseLiteralCalls = 0;
    const skipped = executeSync({
      schema,
      document,
      variableValues: { s: true },
    });
    expect(skipped).toEqual({ data: { ok: 'ok' } });
    expect(parseLiteralCalls).toBe(0);

    const badDoc = parse('query ($s: Boolean!) { ok echo(msg: "bad") @skip(if: $s) }');
    clearExecutionPlanCache(badDoc);
    const badPlan = compileExecutionPlan({ schema, document: badDoc });
    expect(isExecutionPlan(badPlan)).toBe(true);
    // Skipped: holdArgumentError must not surface.
    expect(executeSync({ schema, document: badDoc, variableValues: { s: true } })).toEqual({
      data: { ok: 'ok' },
    });
    // Included: bad literal errors like classic.
    const included = executeSync({ schema, document: badDoc, variableValues: { s: false } });
    const classic = executeClassicSync({
      schema,
      document: badDoc,
      variableValues: { s: false },
    });
    expect(included.errors?.length).toBeGreaterThan(0);
    expect(included).toEqual(classic);
  });

  // R24 V03: @oneOf input must not double-read the selected key getter.
  it('V03: @oneOf coerce reads the selected key getter once', () => {
    const oneOfInput = new GraphQLInputObjectType({
      name: 'V03OneOf',
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
            resolve: (_src, args: { input: { a?: string } }) => args.input.a ?? null,
          },
        },
      }),
    });
    const document = parse('query ($input: V03OneOf!) { test(input: $input) }');
    const plan = compileExecutionPlan({ schema: oneOfSchema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    if (!isExecutionPlan(plan)) {
      return;
    }
    let aReads = 0;
    const raw = {
      input: {
        get a() {
          aReads += 1;
          return 'only';
        },
      },
    };
    const coerced = plan.coerceVariables(raw);
    expect('variableValues' in coerced).toBe(true);
    expect(aReads).toBe(1);
  });

  // R24 V04: EMPTY_ARGS must stay frozen.
  it('V04: EMPTY_ARGS is frozen', () => {
    const document = parse('{ id }');
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: { id: { type: GraphQLString, resolve: () => 'x' } },
      }),
    });
    const plan = compileExecutionPlan({ schema, document });
    expect(isExecutionPlan(plan)).toBe(true);
    if (!isExecutionPlan(plan)) {
      return;
    }
    const fieldPlan = plan.fieldPlanByNodes.get(plan.rootFields.get('id')!);
    expect(fieldPlan?.staticArgs).toBeDefined();
    expect(Object.isFrozen(fieldPlan!.staticArgs)).toBe(true);
    expect(() => {
      (fieldPlan!.staticArgs as Record<string, unknown>)['x'] = 1;
    }).toThrow();
  });

  // R24 V05: skip/include fold order matches classic for mixed directives.
  it('V05: skip/include fold order matches classic', () => {
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          a: { type: GraphQLString, resolve: () => 'A' },
          b: { type: GraphQLString, resolve: () => 'B' },
        },
      }),
    });
    const document = parse(`
      query ($skip: Boolean!, $include: Boolean!) {
        a @skip(if: $skip) @include(if: $include)
        b @include(if: $include) @skip(if: $skip)
      }
    `);
    for (const vars of [
      { skip: false, include: true },
      { skip: true, include: true },
      { skip: false, include: false },
      { skip: true, include: false },
    ]) {
      const planned = executeSync({ schema, document, variableValues: vars });
      const classic = executeClassicSync({ schema, document, variableValues: vars });
      expect(planned).toEqual(classic);
    }
  });
});

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

describe('list completion: retain preflight item reads', () => {
  it('does not reread accessor array slots after object-list preflight', () => {
    const Item = new GraphQLObjectType({
      name: 'AccessorItem',
      fields: {
        id: { type: new GraphQLNonNull(GraphQLString) },
      },
    });
    let reads = 0;
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          users: { type: new GraphQLList(new GraphQLNonNull(Item)) },
        },
      }),
    });
    const document = parse('{ users { id } }');
    const rootValue = {
      users() {
        const base: Array<{ id: string } | null> = [{ id: '1' }];
        return new Proxy(base, {
          get(target, prop, receiver) {
            if (prop === '0') {
              reads += 1;
              return reads === 1 ? { id: '1' } : null;
            }
            return Reflect.get(target, prop, receiver);
          },
        });
      },
    };
    reads = 0;
    const planned = executeSync({ schema, document, rootValue });
    const plannedReads = reads;
    reads = 0;
    const classic = executeClassicSync({ schema, document, rootValue });
    // Classic reads once; planned must match (not store null from a second read).
    expect(planned).toEqual(classic);
    expect(planned).toEqual({ data: { users: [{ id: '1' }] } });
    // Single-pass must not double-hit the accessor (one retained read).
    expect(plannedReads).toBe(1);
  });

  it('does not reread accessors when object-list preflight fails (NonNull null item)', () => {
    const Item = new GraphQLObjectType({
      name: 'FailPreflightItem',
      fields: {
        id: { type: new GraphQLNonNull(GraphQLString) },
      },
    });
    let reads0 = 0;
    let reads1 = 0;
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          // Nullable list of NonNull items: null item → list field null + error.
          users: { type: new GraphQLList(new GraphQLNonNull(Item)) },
        },
      }),
    });
    const document = parse('{ users { id } }');
    const rootValue = {
      users() {
        const base: Array<{ id: string } | null> = [{ id: '1' }, null];
        return new Proxy(base, {
          get(target, prop, receiver) {
            if (prop === '0') {
              reads0 += 1;
              // Second read would flip the value — must not happen.
              return reads0 === 1 ? { id: '1' } : { id: 'CHANGED' };
            }
            if (prop === '1') {
              reads1 += 1;
              return null;
            }
            return Reflect.get(target, prop, receiver);
          },
        });
      },
    };
    reads0 = 0;
    reads1 = 0;
    const planned = executeSync({ schema, document, rootValue });
    expect(planned).toMatchObject({
      data: { users: null },
      errors: [{ path: ['users', 1] }],
    });
    // Index 0 observed once; index 1 once — no double-read of retained slots.
    expect(reads0).toBe(1);
    expect(reads1).toBe(1);
  });

  it('does not reread String-list accessors when mid-list null forces fast-path fallback', () => {
    let reads = 0;
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          values: {
            type: new GraphQLList(GraphQLString),
            resolve: () => {
              const values: Array<string | null> = ['first', null];
              Object.defineProperty(values, '0', {
                configurable: true,
                enumerable: true,
                get() {
                  reads += 1;
                  // Re-read would yield "changed" — must not happen after mid-null fallback.
                  return reads === 1 ? 'first' : 'changed';
                },
              });
              return values;
            },
          },
        },
      }),
    });
    const document = parse('{ values }');
    reads = 0;
    const planned = executeSync({ schema, document });
    // Retained first read + null second item; re-read would have produced "changed".
    expect(planned).toEqual({ data: { values: ['first', null] } });
    expect(reads).toBe(1);
  });

  it('does not reread Int-list accessors when mid-list null forces allPrimitive fallback', () => {
    let reads = 0;
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          values: {
            type: new GraphQLList(GraphQLInt),
            resolve: () => {
              const values: Array<number | null> = [1, null];
              Object.defineProperty(values, '0', {
                configurable: true,
                enumerable: true,
                get() {
                  reads += 1;
                  return reads === 1 ? 1 : 2;
                },
              });
              return values;
            },
          },
        },
      }),
    });
    const document = parse('{ values }');
    reads = 0;
    const planned = executeSync({ schema, document });
    expect(planned).toEqual({ data: { values: [1, null] } });
    expect(reads).toBe(1);
  });

  it('does not read later object-list accessors after NonNull null item', () => {
    const Item = new GraphQLObjectType({
      name: 'StopAfterNullItem',
      fields: {
        id: { type: new GraphQLNonNull(GraphQLString) },
      },
    });
    let plannedRead2 = 0;
    let classicRead2 = 0;
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          // Default property resolve — thin object-list path (not schemaResolve).
          users: { type: new GraphQLList(new GraphQLNonNull(Item)) },
        },
      }),
    });
    const document = parse('{ users { id } }');
    const makeRoot = (onRead2: () => void) => ({
      users() {
        const users: Array<{ id: string } | null> = [{ id: '1' }, null, { id: '3' }];
        Object.defineProperty(users, '2', {
          configurable: true,
          enumerable: true,
          get() {
            onRead2();
            throw new Error('Unexpected read');
          },
        });
        return users;
      },
    });
    const planned = executeSync({
      schema,
      document,
      rootValue: makeRoot(() => {
        plannedRead2 += 1;
      }),
    });
    expect(planned).toMatchObject({
      data: { users: null },
      errors: [{ path: ['users', 1] }],
    });
    expect(plannedRead2).toBe(0);
    const classic = executeClassicSync({
      schema,
      document,
      rootValue: makeRoot(() => {
        classicRead2 += 1;
      }),
    });
    expect(planned).toEqual(classic);
    expect(classicRead2).toBe(0);
  });

  it('does not read later accessors when earlier item child NonNull fails', () => {
    const Item = new GraphQLObjectType({
      name: 'ChildNullItem',
      fields: {
        id: {
          type: new GraphQLNonNull(GraphQLString),
          resolve: () => null,
        },
      },
    });
    let plannedRead1 = 0;
    let classicRead1 = 0;
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          users: { type: new GraphQLList(new GraphQLNonNull(Item)) },
        },
      }),
    });
    const document = parse('{ users { id } }');
    const makeRoot = (onRead1: () => void) => ({
      users() {
        const users: Array<Record<string, never>> = [{}, {}];
        Object.defineProperty(users, '1', {
          configurable: true,
          enumerable: true,
          get() {
            onRead1();
            throw new Error('Unexpected later read');
          },
        });
        return users;
      },
    });
    const planned = executeSync({
      schema,
      document,
      rootValue: makeRoot(() => {
        plannedRead1 += 1;
      }),
    });
    expect(planned).toMatchObject({
      data: { users: null },
      errors: [{ path: ['users', 0, 'id'] }],
    });
    expect(plannedRead1).toBe(0);
    const classic = executeClassicSync({
      schema,
      document,
      rootValue: makeRoot(() => {
        classicRead1 += 1;
      }),
    });
    expect(planned).toEqual(classic);
    expect(classicRead1).toBe(0);
  });

  // process.on('unhandledRejection') retains the Jest isolate under --detectLeaks
  // (Node 22 + GraphQL 17 CI). Skip the observation assertion there; unit tests still cover it.
  (process.env['LEAK_TEST'] ? it.skip : it)(
    'observes pending item promises when a later default-resolved list accessor throws',
    async () => {
      const Item = new GraphQLObjectType({
        name: 'PendingDefaultItem',
        fields: {
          id: { type: new GraphQLNonNull(GraphQLString) },
        },
      });
      const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            // Default property resolve — exercises thin object-list + classic list paths.
            users: { type: new GraphQLList(new GraphQLNonNull(Item)) },
          },
        }),
      });
      const document = parse('{ users { id } }');
      const makeRoot = (): { rootValue: { users: Array<unknown> }; getRead2: () => number } => {
        let read2 = 0;
        const users: Array<unknown> = [
          Promise.reject(Object.assign(new Error('pending fail'), { name: 'PendingFail' })),
          { id: 'ok' },
          { id: 'tail' },
        ];
        Object.defineProperty(users, '2', {
          configurable: true,
          enumerable: true,
          get() {
            read2 += 1;
            throw new Error('tail accessor');
          },
        });
        return { rootValue: { users }, getRead2: () => read2 };
      };
      const expected = {
        data: { users: null },
        errors: [{ message: 'tail accessor', path: ['users'] }],
      };
      let unhandled = 0;
      const onUnhandled = (): void => {
        unhandled += 1;
      };
      process.on('unhandledRejection', onUnhandled);
      try {
        const plannedRoot = makeRoot();
        const planned = await execute({ schema, document, rootValue: plannedRoot.rootValue });
        const classicRoot = makeRoot();
        const classicCtx = buildExecutionContext(
          { schema, document, rootValue: classicRoot.rootValue },
          null,
        );
        expect('schema' in classicCtx).toBe(true);
        if (!('schema' in classicCtx)) {
          throw new Error('expected classic execution context');
        }
        const classic = await executeImpl(classicCtx);
        // Flush microtasks so a leaked derived rejection would surface.
        await new Promise<void>(resolve => {
          setImmediate(resolve);
        });
        expect(unhandled).toBe(0);
        expect(plannedRoot.getRead2()).toBe(1);
        expect(classicRoot.getRead2()).toBe(1);
        expect(planned).toMatchObject(expected);
        expect(classic).toMatchObject(expected);
        expect(planned).toEqual(classic);
      } finally {
        process.off('unhandledRejection', onUnhandled);
      }
    },
  );

  it('strips GraphQLError extensions from retained-prefix leaf serialize (sibling fields survive)', () => {
    const ExtScalar = new GraphQLScalarType({
      name: 'ExtScalar',
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
          // Mid-list null forces retained-prefix serialize of index 0.
          values: {
            type: new GraphQLList(ExtScalar),
            resolve: () => [1, null],
          },
          ok: {
            type: GraphQLString,
            resolve: () => 'yes',
          },
        },
      }),
    });
    const document = parse('{ values ok }');
    const planned = executeSync({ schema, document });
    const classic = executeClassicSync({ schema, document });
    // completeLeafValue strips CRITICAL_ERROR so only the item nulls — not the root.
    expect(planned).toEqual(classic);
    expect(planned).toMatchObject({
      data: { values: [null, null], ok: 'yes' },
      errors: [{ message: 'boom', path: ['values', 0] }],
    });
    expect(planned.errors?.[0]?.extensions?.['CRITICAL_ERROR']).toBeUndefined();
  });

  it('does not reread snapshot slots when a prefix serialize returns a thenable', async () => {
    let reads = 0;
    const AsyncScalar = new GraphQLScalarType({
      name: 'AsyncScalar',
      serialize(value: unknown) {
        if (value === 'first') {
          return Promise.resolve('FIRST');
        }
        return String(value);
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          values: {
            type: new GraphQLList(AsyncScalar),
            resolve: () => {
              const values: Array<unknown> = ['first', 'second'];
              Object.defineProperty(values, '1', {
                configurable: true,
                enumerable: true,
                get() {
                  reads += 1;
                  if (reads > 1) {
                    throw new Error('second re-read');
                  }
                  return 'second';
                },
              });
              return values;
            },
          },
        },
      }),
    });
    const document = parse('{ values }');
    reads = 0;
    const planned = await execute({ schema, document });
    const plannedReads = reads;
    reads = 0;
    const classicCtx = buildExecutionContext({ schema, document }, null);
    expect('schema' in classicCtx).toBe(true);
    if (!('schema' in classicCtx)) {
      throw new Error('expected classic execution context');
    }
    const classic = await executeImpl(classicCtx);
    expect(planned).toEqual(classic);
    expect(planned).toEqual({ data: { values: ['FIRST', 'second'] } });
    expect(plannedReads).toBe(1);
  });

  it('does not replay completed custom-scalar serializes when a later item returns null', () => {
    let serializeCalls = 0;
    const CountingScalar = new GraphQLScalarType({
      name: 'CountingScalar',
      serialize(value: unknown) {
        serializeCalls += 1;
        if (value === 'fail') {
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
            type: new GraphQLList(CountingScalar),
            resolve: () => ['ok', 'fail'],
          },
        },
      }),
    });
    const document = parse('{ values }');
    serializeCalls = 0;
    const planned = executeSync({ schema, document });
    const plannedCalls = serializeCalls;
    serializeCalls = 0;
    const classic = executeClassicSync({ schema, document });
    const classicCalls = serializeCalls;
    // Mid-list null serialize must not re-invoke serialize on the completed prefix.
    expect(planned).toEqual(classic);
    expect(plannedCalls).toBe(classicCalls);
    // One serialize per item (ok + fail) — no replay of the completed prefix.
    expect(plannedCalls).toBe(2);
  });

  it('does not use String fast-path when GraphQLString.serialize is replaced', () => {
    const originalSerialize = GraphQLString.serialize;
    GraphQLString.serialize = (value: unknown) =>
      value === 'secret' ? 'masked' : originalSerialize(value);
    try {
      const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            values: {
              type: new GraphQLList(GraphQLString),
              resolve: () => ['secret', 'ok'],
            },
          },
        }),
      });
      const document = parse('{ values }');
      const planned = executeSync({ schema, document });
      const classic = executeClassicSync({ schema, document });
      expect(planned).toEqual(classic);
      expect(planned).toEqual({ data: { values: ['masked', 'ok'] } });
    } finally {
      GraphQLString.serialize = originalSerialize;
    }
  });
});

describe('object-list thin path: r8 differential matrix', () => {
  const Item = new GraphQLObjectType({
    name: 'R8Item',
    fields: {
      id: {
        type: new GraphQLNonNull(GraphQLString),
        // Async child resolver: completeListItemValue returns a thenable that
        // the object-list thin path must await (r8 §3).
        async resolve(source: unknown) {
          return String(source);
        },
      },
    },
  });
  const ItemPlain = new GraphQLObjectType({
    name: 'R8ItemPlain',
    fields: {
      id: { type: new GraphQLNonNull(GraphQLString) },
    },
  });

  function nonNullUsersSchema(itemType: GraphQLObjectType = ItemPlain) {
    return new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          // Default property resolve → thin object-list path.
          users: { type: new GraphQLList(new GraphQLNonNull(itemType)) },
          ok: { type: GraphQLString, resolve: () => 'yes' },
        },
      }),
    });
  }

  function nullableUsersSchema(itemType: GraphQLObjectType = ItemPlain) {
    return new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          users: { type: new GraphQLList(itemType) },
          ok: { type: GraphQLString, resolve: () => 'yes' },
        },
      }),
    });
  }

  it('localizes sync NonNull null item at the item path', () => {
    const schema = nonNullUsersSchema();
    const document = parse('{ users { id } ok }');
    const rootValue = { users: [{ id: '1' }, null] };
    const planned = executeSync({ schema, document, rootValue });
    const classic = executeClassicSync({ schema, document, rootValue });
    expect(planned).toEqual(classic);
    expect(planned).toMatchObject({
      data: { users: null, ok: 'yes' },
      errors: [{ path: ['users', 1], message: expect.stringContaining('non-nullable') }],
    });
  });

  it('localizes Promise.resolve(null) NonNull item at the item path', async () => {
    const schema = nonNullUsersSchema();
    const document = parse('{ users { id } ok }');
    const rootValue = { users: [{ id: '1' }, Promise.resolve(null)] };
    const planned = await execute({ schema, document, rootValue });
    const classic = await executeClassic({ schema, document, rootValue });
    expect(planned).toEqual(classic);
    expect(planned).toMatchObject({
      data: { users: null, ok: 'yes' },
      errors: [{ path: ['users', 1], message: expect.stringContaining('non-nullable') }],
    });
  });

  it('localizes Promise.reject(Error) with path and locations (nullable item)', async () => {
    const schema = nullableUsersSchema();
    const document = parse('{ users { id } ok }');
    const rootValue = {
      users: [Promise.reject(new Error('reject boom'))],
    };
    const planned = await execute({ schema, document, rootValue });
    const classic = await executeClassic({ schema, document, rootValue });
    expect(planned).toEqual(classic);
    expect(planned).toMatchObject({
      data: { users: [null], ok: 'yes' },
      errors: [{ message: 'reject boom', path: ['users', 0], locations: [{ line: 1, column: 3 }] }],
    });
  });

  it('localizes Promise.reject(GraphQLError) like classic', async () => {
    const schema = nullableUsersSchema();
    const document = parse('{ users { id } ok }');
    const rootValue = {
      users: [Promise.reject(new GraphQLError('gql reject'))],
    };
    const planned = await execute({ schema, document, rootValue });
    const classic = await executeClassic({ schema, document, rootValue });
    expect(planned).toEqual(classic);
    expect(planned).toMatchObject({
      data: { users: [null], ok: 'yes' },
      errors: [{ message: 'gql reject', path: ['users', 0] }],
    });
  });

  it('localizes Promise.resolve(Error) with classic metadata', async () => {
    const schema = nullableUsersSchema();
    const document = parse('{ users { id } ok }');
    const rootValue = {
      users: [Promise.resolve(new Error('resolved err'))],
    };
    const planned = await execute({ schema, document, rootValue });
    const classic = await executeClassic({ schema, document, rootValue });
    expect(planned).toEqual(classic);
    expect(planned).toMatchObject({
      data: { users: [null], ok: 'yes' },
      errors: [
        { message: 'resolved err', path: ['users', 0], locations: [{ line: 1, column: 3 }] },
      ],
    });
  });

  it('awaits async child completion for Promise.resolve(primitive) object items', async () => {
    const schema = nonNullUsersSchema(Item);
    const document = parse('{ users { id } }');
    const rootValue = { users: [Promise.resolve(42)] };
    const planned = await execute({ schema, document, rootValue });
    const classic = await executeClassic({ schema, document, rootValue });
    expect(planned).toEqual(classic);
    expect(planned).toEqual({ data: { users: [{ id: '42' }] } });
  });

  it('matches classic schemaCoordinateInErrors on object-list item errors', async () => {
    const schema = nullableUsersSchema();
    const document = parse('{ users { id } ok }');
    const rootValue = {
      users: [Promise.reject(new Error('coord boom'))],
    };
    const args = { schema, document, rootValue, schemaCoordinateInErrors: true };
    const planned = await execute(args);
    const classic = await executeClassic(args);
    expect(planned).toEqual(classic);
    expect(planned).toMatchObject({
      data: { users: [null], ok: 'yes' },
      errors: [
        {
          message: 'coord boom',
          path: ['users', 0],
          coordinate: 'Query.users',
        },
      ],
    });
  });

  it('trims completedResults when an item truncates the array mid-loop', () => {
    const TruncItem = new GraphQLObjectType({
      name: 'TruncItem',
      fields: {
        id: {
          type: new GraphQLNonNull(GraphQLString),
          resolve(source: { id: string; shrink?: () => void }) {
            source.shrink?.();
            return source.id;
          },
        },
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          users: { type: new GraphQLList(new GraphQLNonNull(TruncItem)) },
        },
      }),
    });
    const document = parse('{ users { id } }');
    const makeUsers = (): Array<{ id: string; shrink?: () => void }> => {
      const users: Array<{ id: string; shrink?: () => void }> = [
        {
          id: '1',
          shrink() {
            users.length = 1;
          },
        },
        { id: '2' },
      ];
      return users;
    };
    const planned = executeSync({ schema, document, rootValue: { users: makeUsers() } });
    const classic = executeClassicSync({
      schema,
      document,
      rootValue: { users: makeUsers() },
    });
    expect(planned).toEqual(classic);
    // Preallocated output must not keep a trailing hole as null.
    expect(planned).toEqual({ data: { users: [{ id: '1' }] } });
  });

  (process.env['LEAK_TEST'] ? it.skip : it)(
    'does not pre-read later custom-scalar slots when earlier NonNull serialize fails',
    async () => {
      // Classic reports path ["values", 0] without touching later getters. Planned
      // must match: pre-reading a getter that returns a rejected promise would
      // orphan that rejection if prefix NonNull failure returns first.
      let plannedTailReads = 0;
      let classicTailReads = 0;
      const Custom = new GraphQLScalarType({
        name: 'CustomNonNullFail',
        serialize(value: unknown) {
          if (value === 1) {
            throw new Error('ser 1');
          }
          return String(value);
        },
      });
      const document = parse('{ values }');
      const makeSchema = () =>
        new GraphQLSchema({
          query: new GraphQLObjectType({
            name: 'Query',
            fields: {
              values: {
                type: new GraphQLList(new GraphQLNonNull(Custom)),
                resolve(_src, _args, ctx: { onTail: () => void }) {
                  const values: Array<unknown> = [1, 2];
                  Object.defineProperty(values, '1', {
                    configurable: true,
                    enumerable: true,
                    get() {
                      ctx.onTail();
                      return Promise.reject(new Error('tail rejected'));
                    },
                  });
                  return values;
                },
              },
            },
          }),
        });
      let unhandled = 0;
      const onUnhandled = (): void => {
        unhandled += 1;
      };
      process.on('unhandledRejection', onUnhandled);
      try {
        const planned = await execute({
          schema: makeSchema(),
          document,
          contextValue: {
            onTail: () => {
              plannedTailReads += 1;
            },
          },
        });
        await new Promise<void>(resolve => {
          setImmediate(resolve);
        });
        expect(planned).toMatchObject({
          data: { values: null },
          errors: [{ message: 'ser 1', path: ['values', 0] }],
        });
        expect(plannedTailReads).toBe(0);
        expect(unhandled).toBe(0);

        const classic = await executeClassic({
          schema: makeSchema(),
          document,
          contextValue: {
            onTail: () => {
              classicTailReads += 1;
            },
          },
        });
        await new Promise<void>(resolve => {
          setImmediate(resolve);
        });
        expect(planned).toEqual(classic);
        expect(classicTailReads).toBe(0);
        expect(unhandled).toBe(0);
      } finally {
        process.off('unhandledRejection', onUnhandled);
      }
    },
  );

  it('sees serializer mutations of later leaf-list slots (planned == classic)', async () => {
    // serialize(1) rewrites values[1] before returning a thenable; classic
    // re-reads that slot when completion reaches it. Planned must not resume
    // from a pre-serialize snapshot of unread slots.
    const document = parse('{ values }');
    const makeSchema = () => {
      let values: Array<unknown> = [];
      const Mutating = new GraphQLScalarType({
        name: 'MutatingSer',
        serialize(value: unknown) {
          if (value === 1) {
            values[1] = 3;
            return Promise.resolve('1');
          }
          return String(value);
        },
      });
      return new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            values: {
              type: new GraphQLList(Mutating),
              resolve() {
                values = [1, 2];
                return values;
              },
            },
          },
        }),
      });
    };
    const planned = await execute({ schema: makeSchema(), document });
    const classic = await executeClassic({ schema: makeSchema(), document });
    expect(planned).toEqual({ data: { values: ['1', '3'] } });
    expect(planned).toEqual(classic);
  });

  it('trims leaf-list output when serialize truncates the input array', () => {
    let values: Array<unknown> = [];
    const Truncating = new GraphQLScalarType({
      name: 'TruncatingSer',
      serialize(value: unknown) {
        if (value === 1) {
          values.length = 1;
          return '1';
        }
        return String(value);
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          values: {
            type: new GraphQLList(new GraphQLNonNull(Truncating)),
            resolve() {
              values = [1, 2];
              return values;
            },
          },
        },
      }),
    });
    const document = parse('{ values }');
    const planned = executeSync({ schema, document });
    const classic = executeClassicSync({ schema, document });
    expect(planned).toEqual({ data: { values: ['1'] } });
    expect(planned).toEqual(classic);
  });

  it('trims GraphQLString leaf-list when a getter truncates after the read', () => {
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          values: {
            type: new GraphQLList(GraphQLString),
            resolve() {
              const values: Array<unknown> = ['a', 'b'];
              Object.defineProperty(values, '0', {
                configurable: true,
                enumerable: true,
                get() {
                  values.length = 1;
                  return 'a';
                },
              });
              return values;
            },
          },
        },
      }),
    });
    const document = parse('{ values }');
    const planned = executeSync({ schema, document });
    const classic = executeClassicSync({ schema, document });
    expect(planned).toEqual(classic);
    expect(planned.data?.values).toStrictEqual(['a']);
    expect((planned.data?.values as unknown[]).length).toBe(1);
  });

  // R11 P3: array mutation edges not covered by truncate-to-one alone.
  it('trims GraphQLString leaf-list when a getter truncates to empty after the first read', () => {
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          values: {
            type: new GraphQLList(GraphQLString),
            resolve() {
              const values: Array<unknown> = ['a', 'b'];
              Object.defineProperty(values, '0', {
                configurable: true,
                enumerable: true,
                get() {
                  values.length = 0;
                  return 'a';
                },
              });
              return values;
            },
          },
        },
      }),
    });
    const document = parse('{ values }');
    const planned = executeSync({ schema, document });
    const classic = executeClassicSync({ schema, document });
    // Visited slot kept; unread holes trimmed (not length-0 wipe of the returned value).
    expect(planned).toEqual(classic);
    expect(planned.data?.values).toStrictEqual(['a']);
    expect((planned.data?.values as unknown[]).length).toBe(1);
  });

  it('sees later slots grown during GraphQLString leaf-list traversal (planned == classic)', () => {
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          values: {
            type: new GraphQLList(GraphQLString),
            resolve() {
              const values: Array<unknown> = ['a'];
              Object.defineProperty(values, '0', {
                configurable: true,
                enumerable: true,
                get() {
                  values.push('b');
                  return 'a';
                },
              });
              return values;
            },
          },
        },
      }),
    });
    const document = parse('{ values }');
    const planned = executeSync({ schema, document });
    const classic = executeClassicSync({ schema, document });
    expect(planned).toEqual(classic);
    expect(planned).toEqual({ data: { values: ['a', 'b'] } });
  });

  it('falls back after GraphQLString truncate mid-list then a null slot', () => {
    // First slot truncates then grows a null; String fast retains at the null
    // and the general path completes without re-reading index 0.
    let reads0 = 0;
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          values: {
            type: new GraphQLList(GraphQLString),
            resolve() {
              const values: Array<unknown> = ['a', 'b'];
              Object.defineProperty(values, '0', {
                configurable: true,
                enumerable: true,
                get() {
                  reads0 += 1;
                  values.length = 1;
                  values.push(null);
                  return 'a';
                },
              });
              return values;
            },
          },
        },
      }),
    });
    const document = parse('{ values }');
    reads0 = 0;
    const planned = executeSync({ schema, document });
    const plannedReads = reads0;
    reads0 = 0;
    const classic = executeClassicSync({ schema, document });
    expect(planned).toEqual(classic);
    expect(planned).toEqual({ data: { values: ['a', null] } });
    expect(plannedReads).toBe(1);
    expect(reads0).toBe(1);
  });

  it('does not re-read earlier slots when a later GraphQLString getter throws', () => {
    let reads0 = 0;
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          values: {
            type: new GraphQLList(GraphQLString),
            resolve() {
              const values: Array<unknown> = ['a', 'b'];
              Object.defineProperty(values, '0', {
                configurable: true,
                enumerable: true,
                get() {
                  reads0 += 1;
                  return 'a';
                },
              });
              Object.defineProperty(values, '1', {
                configurable: true,
                enumerable: true,
                get() {
                  throw new Error('tail throw');
                },
              });
              return values;
            },
          },
        },
      }),
    });
    const document = parse('{ values }');
    reads0 = 0;
    const planned = executeSync({ schema, document });
    const plannedReads = reads0;
    reads0 = 0;
    const classic = executeClassicSync({ schema, document });
    expect(planned).toEqual(classic);
    expect(planned).toMatchObject({
      data: { values: null },
      errors: [{ message: 'tail throw', path: ['values'] }],
    });
    expect(plannedReads).toBe(1);
    expect(reads0).toBe(1);
  });

  it('keeps indexed traversal when serialize installs a custom iterator', async () => {
    const document = parse('{ values }');
    const makeSchema = () => {
      let values: Array<unknown> = [];
      const FlipIter = new GraphQLScalarType({
        name: 'FlipIterSer',
        serialize(value: unknown) {
          if (value === 1) {
            (values as { [Symbol.iterator]: () => Iterator<unknown> })[Symbol.iterator] =
              function* () {
                yield 9;
              };
            return Promise.resolve('1');
          }
          return String(value);
        },
      });
      return new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            values: {
              type: new GraphQLList(FlipIter),
              resolve() {
                values = [1, 2];
                return values;
              },
            },
          },
        }),
      });
    };
    const planned = await execute({ schema: makeSchema(), document });
    const classic = await executeClassic({ schema: makeSchema(), document });
    expect(planned).toEqual({ data: { values: ['1', '2'] } });
    expect(planned).toEqual(classic);
  });

  it('classic knownPlan=null does not compile or cache a plan', () => {
    let parseLiteralCalls = 0;
    const Echo = new GraphQLScalarType({
      name: 'EchoClassicNull',
      serialize: value => value,
      parseValue: value => value,
      parseLiteral(ast) {
        parseLiteralCalls += 1;
        return valueFromASTUntyped(ast);
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          echo: {
            type: Echo,
            args: { msg: { type: Echo } },
            resolve: (_s, args: { msg: unknown }) => args.msg,
          },
        },
      }),
    });
    const document = parse(`{ echo(msg: "hi") }`);
    clearExecutionPlanCache(document);
    const classic = executeClassicSync({ schema, document });
    expect(classic).toEqual({ data: { echo: 'hi' } });
    expect(getExecutionPlan(schema, document)).toBeUndefined();
    // Classic coercion ran parseLiteral once; plan compile did not add another.
    expect(parseLiteralCalls).toBe(1);
  });
});

describe('list completion: observe pending without re-inspect', () => {
  // process.on('unhandledRejection') retains the Jest isolate under --detectLeaks.
  (process.env['LEAK_TEST'] ? it.skip : it)(
    'observes recorded item promises on sync abort without re-isPromise slots',
    async () => {
      let thenReads = 0;
      let flip = false;
      const Custom = new GraphQLScalarType({
        name: 'ObserveCustom',
        serialize(value: unknown) {
          if (value === 'pending') {
            return Promise.reject(
              Object.assign(new Error('pending fail'), { name: 'PendingFail' }),
            );
          }
          if (value === 'thenable') {
            const obj: Record<string, unknown> = { ok: true };
            Object.defineProperty(obj, 'then', {
              configurable: true,
              enumerable: false,
              get() {
                thenReads += 1;
                if (flip) {
                  throw new Error('then re-read');
                }
                // First isPromise: undefined → sync completed value.
                return undefined;
              },
            });
            return obj;
          }
          return String(value);
        },
      });
      const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            values: {
              type: new GraphQLList(new GraphQLNonNull(Custom)),
              resolve: () => {
                const values: Array<unknown> = ['thenable', 'pending', 'tail'];
                Object.defineProperty(values, '2', {
                  configurable: true,
                  enumerable: true,
                  get() {
                    flip = true;
                    throw new Error('tail accessor');
                  },
                });
                return values;
              },
            },
          },
        }),
      });
      const document = parse('{ values }');
      let unhandled = 0;
      const onUnhandled = (): void => {
        unhandled += 1;
      };
      process.on('unhandledRejection', onUnhandled);
      try {
        // Classic completeListValue owns the sync-abort observe path under test.
        thenReads = 0;
        flip = false;
        const classic = await executeClassic({ schema, document });
        await new Promise<void>(resolve => {
          setImmediate(resolve);
        });
        expect(unhandled).toBe(0);
        expect(classic).toMatchObject({
          data: { values: null },
          errors: [{ message: 'tail accessor', path: ['values'] }],
        });
        // Cleanup must not re-read the sync thenable slot (would throw 'then re-read').
        expect(thenReads).toBe(1);

        unhandled = 0;
        thenReads = 0;
        flip = false;
        const planned = await execute({ schema, document });
        await new Promise<void>(resolve => {
          setImmediate(resolve);
        });
        expect(unhandled).toBe(0);
        expect(planned).toMatchObject({
          errors: [{ message: 'tail accessor', path: ['values'] }],
        });
      } finally {
        process.off('unhandledRejection', onUnhandled);
      }
    },
  );
});

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
});
