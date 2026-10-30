import { parse } from 'graphql';
import { collectFieldsDependsOnVariables } from '../src/collectFields.js';

describe('collectFieldsDependsOnVariables', () => {
  it('is false when the document has no conditional directives', () => {
    expect(collectFieldsDependsOnVariables(parse('{ a b { c } }'))).toBe(false);
  });

  it('is false for literal @skip / @include / @defer if args', () => {
    expect(collectFieldsDependsOnVariables(parse('{ a @skip(if: true) }'))).toBe(false);
    expect(collectFieldsDependsOnVariables(parse('{ a @include(if: false) }'))).toBe(false);
    expect(collectFieldsDependsOnVariables(parse('{ ... @defer(if: true) { a } }'))).toBe(false);
  });

  it('is true when @skip / @include / @defer if is a variable', () => {
    expect(collectFieldsDependsOnVariables(parse('query ($s: Boolean!) { a @skip(if: $s) }'))).toBe(
      true,
    );
    expect(
      collectFieldsDependsOnVariables(parse('query ($i: Boolean!) { a @include(if: $i) }')),
    ).toBe(true);
    expect(
      collectFieldsDependsOnVariables(parse('query ($d: Boolean!) { ... @defer(if: $d) { a } }')),
    ).toBe(true);
  });

  it('detects variable conditionals on fragments', () => {
    expect(
      collectFieldsDependsOnVariables(
        parse(`
          query ($s: Boolean!) {
            ...Frag
          }
          fragment Frag on Query {
            a @skip(if: $s)
          }
        `),
      ),
    ).toBe(true);
  });

  it('ignores unrelated variable usages', () => {
    expect(
      collectFieldsDependsOnVariables(parse('query ($id: ID!) { user(id: $id) { name } }')),
    ).toBe(false);
  });
});
