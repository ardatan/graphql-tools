import { buildSchema, parse } from 'graphql';
import { execute } from '../../index.js';

/**
 * Predicate collect must match classic getDirectiveValues errors when a
 * variable used by `@skip`/`@include` is null or missing (directive `if` is
 * `Boolean!`), including when the operation variable itself is nullable.
 */
describe('field-level skip/include predicate null/missing parity', () => {
  const schema = buildSchema(
    /* GraphQL */ `
      type Query {
        q: String
      }
      type Mutation {
        doThing: String
      }
    `,
    { assumeValid: true },
  );
  const root = { doThing: () => 'ran' };

  function run(document: ReturnType<typeof parse>, variableValues?: Record<string, unknown>) {
    return execute({
      schema,
      document,
      rootValue: root,
      variableValues,
    });
  }

  describe('with Boolean default', () => {
    const includeDoc = parse(/* GraphQL */ `
      mutation ($s: Boolean = true) {
        doThing @include(if: $s)
      }
    `);
    const skipDoc = parse(/* GraphQL */ `
      mutation ($s: Boolean = true) {
        doThing @skip(if: $s)
      }
    `);

    it('includes / skips for ordinary booleans and defaults', () => {
      expect(run(includeDoc)).toEqual({ data: { doThing: 'ran' } });
      expect(run(includeDoc, { s: true })).toEqual({ data: { doThing: 'ran' } });
      expect(run(includeDoc, { s: false })).toEqual({ data: {} });

      expect(run(skipDoc)).toEqual({ data: {} });
      expect(run(skipDoc, { s: true })).toEqual({ data: {} });
      expect(run(skipDoc, { s: false })).toEqual({ data: { doThing: 'ran' } });
    });

    it('errors on explicit null before resolvers run', () => {
      const includeResult = run(includeDoc, { s: null });
      expect(includeResult).toMatchObject({
        data: null,
        errors: [
          {
            message: expect.stringContaining(
              'Expected variable "$s" provided to non-null type "Boolean!" not to be null',
            ),
          },
        ],
      });

      const skipResult = run(skipDoc, { s: null });
      expect(skipResult).toMatchObject({
        data: null,
        errors: [
          {
            message: expect.stringContaining(
              'Expected variable "$s" provided to non-null type "Boolean!" not to be null',
            ),
          },
        ],
      });
    });
  });

  describe('nullable Boolean without default', () => {
    const includeDoc = parse(/* GraphQL */ `
      mutation ($s: Boolean) {
        doThing @include(if: $s)
      }
    `);
    const skipDoc = parse(/* GraphQL */ `
      mutation ($s: Boolean) {
        doThing @skip(if: $s)
      }
    `);

    it('errors when the variable is missing or null', () => {
      for (const vars of [undefined, {}, { s: null }] as const) {
        const includeResult = run(includeDoc, vars as any);
        expect(includeResult.data).toBeNull();
        expect(includeResult.errors?.[0]?.message).toEqual(expect.stringMatching(/\$s|Boolean!/));

        const skipResult = run(skipDoc, vars as any);
        expect(skipResult.data).toBeNull();
        expect(skipResult.errors?.[0]?.message).toEqual(expect.stringMatching(/\$s|Boolean!/));
      }
    });

    it('still honors true/false', () => {
      expect(run(includeDoc, { s: true })).toEqual({ data: { doThing: 'ran' } });
      expect(run(includeDoc, { s: false })).toEqual({ data: {} });
      expect(run(skipDoc, { s: true })).toEqual({ data: {} });
      expect(run(skipDoc, { s: false })).toEqual({ data: { doThing: 'ran' } });
    });
  });
});
