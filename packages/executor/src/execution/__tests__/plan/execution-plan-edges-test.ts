/**
 * Dangerous warm-path edges for the cacheable execution plan (checkpoint tip).
 * These lock in fixes for union FieldNode leakage, list-item kind,
 * leaf coerceVariables nullability / GQL17 sources, and related pitfalls.
 */
import {
  GraphQLBoolean,
  GraphQLID,
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
import { execute, executeSync } from '../../execute.js';
import { compileExecutionPlan, getPlannedFieldPlan, isExecutionPlan } from '../../plan.js';

describe('execution plan warm-path edges', () => {
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

    it('getPlannedFieldPlan requires parentType match for FieldNode fallback', () => {
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
      const dogFields = plan.__subfieldsByNodes.get(petsNodes)?.get(Dog);
      const catFields = plan.__subfieldsByNodes.get(petsNodes)?.get(Cat);
      expect(dogFields).toBeDefined();
      expect(catFields).toBeDefined();
      const dogNameNodes = dogFields!.get('name')!;
      const dogPlan = getPlannedFieldPlan(plan, dogNameNodes, Dog);
      expect(dogPlan?.parentType).toBe(Dog);
      // Wrong parentType must not return Dog's plan (even on exact array hit).
      expect(getPlannedFieldPlan(plan, dogNameNodes, Cat)).toBeUndefined();
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
        const itemsPlan = plan.__fieldPlanByNodes.get(plan.rootFields.get('items')!);
        expect(itemsPlan?.kind).toBe('List');
        if (itemsPlan?.kind === 'List') {
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
        const fieldPlan = plan.__fieldPlanByNodes.get(plan.rootFields.get('thing')!);
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
