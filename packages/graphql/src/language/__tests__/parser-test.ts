import { dedent } from '../../__testUtils__/dedent.js';
import { expectJSON, expectToThrowJSON } from '../../__testUtils__/expectJSON.js';
import { kitchenSinkQuery } from '../../__testUtils__/kitchenSinkQuery.js';

import { inspect } from '../../jsutils/inspect.js';

import { Kind } from '../kinds.js';
import { parse, parseConstValue, parseType, parseValue } from '../parser.js';
import { Source } from '../source.js';
import { TokenKind } from '../tokenKind.js';

function parseCCN(source: string) {
  return parse(source, { experimentalClientControlledNullability: true });
}

function expectSyntaxError(text: string) {
  return expectToThrowJSON(() => parse(text));
}

describe('Parser', () => {
  it('parse provides useful errors', () => {
    let caughtError;
    try {
      parse('{');
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toMatchObject({
      message: 'Syntax Error: Expected Name, found <EOF>.',
      positions: [1],
      locations: [{ line: 1, column: 2 }],
    });

    expect(String(caughtError)).toEqual(dedent`
      Syntax Error: Expected Name, found <EOF>.

      GraphQL request:1:2
      1 | {
        |  ^
    `);

    expectSyntaxError(`
      { ...MissingOn }
      fragment MissingOn Type
    `).toMatchObject({
      message: 'Syntax Error: Expected "on", found Name "Type".',
      locations: [{ line: 3, column: 26 }],
    });

    expectSyntaxError('{ field: {} }').toMatchObject({
      message: 'Syntax Error: Expected Name, found "{".',
      locations: [{ line: 1, column: 10 }],
    });

    expectSyntaxError('notAnOperation Foo { field }').toMatchObject({
      message: 'Syntax Error: Unexpected Name "notAnOperation".',
      locations: [{ line: 1, column: 1 }],
    });

    expectSyntaxError('...').toMatchObject({
      message: 'Syntax Error: Unexpected "...".',
      locations: [{ line: 1, column: 1 }],
    });

    expectSyntaxError('{ ""').toMatchObject({
      message: 'Syntax Error: Expected Name, found String "".',
      locations: [{ line: 1, column: 3 }],
    });
  });

  it('parse provides useful error when using source', () => {
    let caughtError;
    try {
      parse(new Source('query', 'MyQuery.graphql'));
    } catch (error) {
      caughtError = error;
    }
    expect(String(caughtError)).toEqual(dedent`
      Syntax Error: Expected "{", found <EOF>.

      MyQuery.graphql:1:6
      1 | query
        |      ^
    `);
  });

  it('parses variable inline values', () => {
    expect(() => parse('{ field(complex: { a: { b: [ $var ] } }) }')).not.toThrow();
  });

  it('parses constant default values', () => {
    expectSyntaxError('query Foo($x: Complex = { a: { b: [ $var ] } }) { field }').toMatchObject({
      message: 'Syntax Error: Unexpected variable "$var" in constant value.',
      locations: [{ line: 1, column: 37 }],
    });
  });

  it('parses variable definition directives', () => {
    expect(() => parse('query Foo($x: Boolean = false @bar) { field }')).not.toThrow();
  });

  it('does not accept fragments named "on"', () => {
    expectSyntaxError('fragment on on on { on }').toMatchObject({
      message: 'Syntax Error: Unexpected Name "on".',
      locations: [{ line: 1, column: 10 }],
    });
  });

  it('does not accept fragments spread of "on"', () => {
    expectSyntaxError('{ ...on }').toMatchObject({
      message: 'Syntax Error: Expected Name, found "}".',
      locations: [{ line: 1, column: 9 }],
    });
  });

  it('does not allow "true", "false", or "null" as enum value', () => {
    expectSyntaxError('enum Test { VALID, true }').toMatchObject({
      message: 'Syntax Error: Name "true" is reserved and cannot be used for an enum value.',
      locations: [{ line: 1, column: 20 }],
    });

    expectSyntaxError('enum Test { VALID, false }').toMatchObject({
      message: 'Syntax Error: Name "false" is reserved and cannot be used for an enum value.',
      locations: [{ line: 1, column: 20 }],
    });

    expectSyntaxError('enum Test { VALID, null }').toMatchObject({
      message: 'Syntax Error: Name "null" is reserved and cannot be used for an enum value.',
      locations: [{ line: 1, column: 20 }],
    });
  });

  it('parses multi-byte characters', () => {
    // Note: \u0A0A could be naively interpreted as two line-feed chars.
    const ast = parse(`
      # This comment has a \u0A0A multi-byte character.
      { field(arg: "Has a \u0A0A multi-byte character.") }
    `);

    expect(ast).toHaveProperty(
      'definitions[0].selectionSet.selections[0].arguments[0].value.value',
      'Has a \u0A0A multi-byte character.'
    );
  });

  it('parses kitchen sink', () => {
    expect(() => parseCCN(kitchenSinkQuery)).not.toThrow();
  });

  it('allows non-keywords anywhere a Name is allowed', () => {
    const nonKeywords = ['on', 'fragment', 'query', 'mutation', 'subscription', 'true', 'false'];
    for (const keyword of nonKeywords) {
      // You can't define or reference a fragment named `on`.
      const fragmentName = keyword !== 'on' ? keyword : 'a';
      const document = `
        query ${keyword} {
          ... ${fragmentName}
          ... on ${keyword} { field }
        }
        fragment ${fragmentName} on Type {
          ${keyword}(${keyword}: $${keyword})
            @${keyword}(${keyword}: ${keyword})
        }
      `;

      expect(() => parse(document)).not.toThrow();
    }
  });

  it('parses anonymous mutation operations', () => {
    expect(() =>
      parse(`
      mutation {
        mutationField
      }
    `)
    ).not.toThrow();
  });

  it('parses anonymous subscription operations', () => {
    expect(() =>
      parse(`
      subscription {
        subscriptionField
      }
    `)
    ).not.toThrow();
  });

  it('parses named mutation operations', () => {
    expect(() =>
      parse(`
      mutation Foo {
        mutationField
      }
    `)
    ).not.toThrow();
  });

  it('parses named subscription operations', () => {
    expect(() =>
      parse(`
      subscription Foo {
        subscriptionField
      }
    `)
    ).not.toThrow();
  });

  it('parses required field', () => {
    const result = parseCCN('{ requiredField! }');

    expectJSON(result).toDeepNestedProperty('definitions[0].selectionSet.selections[0].nullabilityAssertion', {
      kind: Kind.NON_NULL_ASSERTION,
      loc: { start: 15, end: 16 },
      nullabilityAssertion: undefined,
    });
  });

  it('parses optional field', () => {
    expect(() => parseCCN('{ optionalField? }')).not.toThrow();
  });

  it('does not parse field with multiple designators', () => {
    expect(() => parseCCN('{ optionalField?! }')).toThrow('Syntax Error: Expected Name, found "!".');

    expect(() => parseCCN('{ optionalField!? }')).toThrow('Syntax Error: Expected Name, found "?".');
  });

  it('parses required with alias', () => {
    expect(() => parseCCN('{ requiredField: field! }')).not.toThrow();
  });

  it('parses optional with alias', () => {
    expect(() => parseCCN('{ requiredField: field? }')).not.toThrow();
  });

  it('does not parse aliased field with bang on left of colon', () => {
    expect(() => parseCCN('{ requiredField!: field }')).toThrow();
  });

  it('does not parse aliased field with question mark on left of colon', () => {
    expect(() => parseCCN('{ requiredField?: field }')).toThrow();
  });

  it('does not parse aliased field with bang on left and right of colon', () => {
    expect(() => parseCCN('{ requiredField!: field! }')).toThrow();
  });

  it('does not parse aliased field with question mark on left and right of colon', () => {
    expect(() => parseCCN('{ requiredField?: field? }')).toThrow();
  });

  it('does not parse designator on query', () => {
    expect(() => parseCCN('query? { field }')).toThrow();
  });

  it('parses required within fragment', () => {
    expect(() => parseCCN('fragment MyFragment on Query { field! }')).not.toThrow();
  });

  it('parses optional within fragment', () => {
    expect(() => parseCCN('fragment MyFragment on Query { field? }')).not.toThrow();
  });

  it('parses field with required list elements', () => {
    const result = parseCCN('{ field[!] }');

    expectJSON(result).toDeepNestedProperty('definitions[0].selectionSet.selections[0].nullabilityAssertion', {
      kind: Kind.LIST_NULLABILITY_OPERATOR,
      loc: { start: 7, end: 10 },
      nullabilityAssertion: {
        kind: Kind.NON_NULL_ASSERTION,
        loc: { start: 8, end: 9 },
        nullabilityAssertion: undefined,
      },
    });
  });

  it('parses field with optional list elements', () => {
    const result = parseCCN('{ field[?] }');

    expectJSON(result).toDeepNestedProperty('definitions[0].selectionSet.selections[0].nullabilityAssertion', {
      kind: Kind.LIST_NULLABILITY_OPERATOR,
      loc: { start: 7, end: 10 },
      nullabilityAssertion: {
        kind: Kind.ERROR_BOUNDARY,
        loc: { start: 8, end: 9 },
        nullabilityAssertion: undefined,
      },
    });
  });

  it('parses field with required list', () => {
    const result = parseCCN('{ field[]! }');

    expectJSON(result).toDeepNestedProperty('definitions[0].selectionSet.selections[0].nullabilityAssertion', {
      kind: Kind.NON_NULL_ASSERTION,
      loc: { start: 7, end: 10 },
      nullabilityAssertion: {
        kind: Kind.LIST_NULLABILITY_OPERATOR,
        loc: { start: 7, end: 9 },
        nullabilityAssertion: undefined,
      },
    });
  });

  it('parses field with optional list', () => {
    const result = parseCCN('{ field[]? }');

    expectJSON(result).toDeepNestedProperty('definitions[0].selectionSet.selections[0].nullabilityAssertion', {
      kind: Kind.ERROR_BOUNDARY,
      loc: { start: 7, end: 10 },
      nullabilityAssertion: {
        kind: Kind.LIST_NULLABILITY_OPERATOR,
        loc: { start: 7, end: 9 },
        nullabilityAssertion: undefined,
      },
    });
  });

  it('parses multidimensional field with mixed list elements', () => {
    const result = parseCCN('{ field[[[?]!]]! }');

    expectJSON(result).toDeepNestedProperty('definitions[0].selectionSet.selections[0].nullabilityAssertion', {
      kind: Kind.NON_NULL_ASSERTION,
      loc: { start: 7, end: 16 },
      nullabilityAssertion: {
        kind: Kind.LIST_NULLABILITY_OPERATOR,
        loc: { start: 7, end: 15 },
        nullabilityAssertion: {
          kind: Kind.LIST_NULLABILITY_OPERATOR,
          loc: { start: 8, end: 14 },
          nullabilityAssertion: {
            kind: Kind.NON_NULL_ASSERTION,
            loc: { start: 9, end: 13 },
            nullabilityAssertion: {
              kind: Kind.LIST_NULLABILITY_OPERATOR,
              loc: { start: 9, end: 12 },
              nullabilityAssertion: {
                kind: Kind.ERROR_BOUNDARY,
                loc: { start: 10, end: 11 },
                nullabilityAssertion: undefined,
              },
            },
          },
        },
      },
    });
  });

  it('does not parse field with unbalanced brackets', () => {
    expect(() => parseCCN('{ field[[] }')).toThrow('Syntax Error: Expected "]", found "}".');

    expect(() => parseCCN('{ field[]] }')).toThrow('Syntax Error: Expected Name, found "]".');

    expect(() => parse('{ field] }')).toThrow('Syntax Error: Expected Name, found "]".');

    expect(() => parseCCN('{ field[ }')).toThrow('Syntax Error: Expected "]", found "}".');
  });

  it('does not parse field with assorted invalid nullability designators', () => {
    expect(() => parseCCN('{ field[][] }')).toThrow('Syntax Error: Expected Name, found "[".');

    expect(() => parseCCN('{ field[!!] }')).toThrow('Syntax Error: Expected "]", found "!".');

    expect(() => parseCCN('{ field[]?! }')).toThrow('Syntax Error: Expected Name, found "!".');
  });

  it('creates ast', () => {
    const result = parse(dedent`
      {
        node(id: 4) {
          id,
          name
        }
      }
    `);

    expectJSON(result).toDeepEqual({
      kind: Kind.DOCUMENT,
      loc: { start: 0, end: 40 },
      definitions: [
        {
          kind: Kind.OPERATION_DEFINITION,
          loc: { start: 0, end: 40 },
          operation: 'query',
          name: undefined,
          variableDefinitions: [],
          directives: [],
          selectionSet: {
            kind: Kind.SELECTION_SET,
            loc: { start: 0, end: 40 },
            selections: [
              {
                kind: Kind.FIELD,
                loc: { start: 4, end: 38 },
                alias: undefined,
                name: {
                  kind: Kind.NAME,
                  loc: { start: 4, end: 8 },
                  value: 'node',
                },
                arguments: [
                  {
                    kind: Kind.ARGUMENT,
                    name: {
                      kind: Kind.NAME,
                      loc: { start: 9, end: 11 },
                      value: 'id',
                    },
                    value: {
                      kind: Kind.INT,
                      loc: { start: 13, end: 14 },
                      value: '4',
                    },
                    loc: { start: 9, end: 14 },
                  },
                ],
                nullabilityAssertion: undefined,
                directives: [],
                selectionSet: {
                  kind: Kind.SELECTION_SET,
                  loc: { start: 16, end: 38 },
                  selections: [
                    {
                      kind: Kind.FIELD,
                      loc: { start: 22, end: 24 },
                      alias: undefined,
                      name: {
                        kind: Kind.NAME,
                        loc: { start: 22, end: 24 },
                        value: 'id',
                      },
                      arguments: [],
                      nullabilityAssertion: undefined,
                      directives: [],
                      selectionSet: undefined,
                    },
                    {
                      kind: Kind.FIELD,
                      loc: { start: 30, end: 34 },
                      alias: undefined,
                      name: {
                        kind: Kind.NAME,
                        loc: { start: 30, end: 34 },
                        value: 'name',
                      },
                      arguments: [],
                      nullabilityAssertion: undefined,
                      directives: [],
                      selectionSet: undefined,
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    });
  });

  it('creates ast from nameless query without variables', () => {
    const result = parse(dedent`
      query {
        node {
          id
        }
      }
    `);

    expectJSON(result).toDeepEqual({
      kind: Kind.DOCUMENT,
      loc: { start: 0, end: 29 },
      definitions: [
        {
          kind: Kind.OPERATION_DEFINITION,
          loc: { start: 0, end: 29 },
          operation: 'query',
          name: undefined,
          variableDefinitions: [],
          directives: [],
          selectionSet: {
            kind: Kind.SELECTION_SET,
            loc: { start: 6, end: 29 },
            selections: [
              {
                kind: Kind.FIELD,
                loc: { start: 10, end: 27 },
                alias: undefined,
                name: {
                  kind: Kind.NAME,
                  loc: { start: 10, end: 14 },
                  value: 'node',
                },
                arguments: [],
                nullabilityAssertion: undefined,
                directives: [],
                selectionSet: {
                  kind: Kind.SELECTION_SET,
                  loc: { start: 15, end: 27 },
                  selections: [
                    {
                      kind: Kind.FIELD,
                      loc: { start: 21, end: 23 },
                      alias: undefined,
                      name: {
                        kind: Kind.NAME,
                        loc: { start: 21, end: 23 },
                        value: 'id',
                      },
                      arguments: [],
                      nullabilityAssertion: undefined,
                      directives: [],
                      selectionSet: undefined,
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    });
  });

  it('allows parsing without source location information', () => {
    const result = parse('{ id }', { noLocation: true });
    expect('loc' in result).toEqual(false);
  });

  it('Legacy: allows parsing fragment defined variables', () => {
    const document = 'fragment a($v: Boolean = false) on t { f(v: $v) }';

    expect(() => parse(document, { allowLegacyFragmentVariables: true })).not.toThrow();
    expect(() => parse(document)).toThrow('Syntax Error');
  });

  it('contains location that can be Object.toStringified, JSON.stringified, or jsutils.inspected', () => {
    const { loc } = parse('{ id }');

    expect(Object.prototype.toString.call(loc)).toEqual('[object Location]');
    expect(JSON.stringify(loc)).toEqual('{"start":0,"end":6}');
    expect(inspect(loc)).toEqual('{ start: 0, end: 6 }');
  });

  it('contains references to source', () => {
    const source = new Source('{ id }');
    const result = parse(source);

    expect(result).toHaveProperty('loc.source', source);
  });

  it('contains references to start and end tokens', () => {
    const result = parse('{ id }');

    expect(result).toHaveProperty('loc.startToken.kind', TokenKind.SOF);
    expect(result).toHaveProperty('loc.endToken.kind', TokenKind.EOF);
  });

  describe('parseValue', () => {
    it('parses null value', () => {
      const result = parseValue('null');
      expectJSON(result).toDeepEqual({
        kind: Kind.NULL,
        loc: { start: 0, end: 4 },
      });
    });

    it('parses list values', () => {
      const result = parseValue('[123 "abc"]');
      expectJSON(result).toDeepEqual({
        kind: Kind.LIST,
        loc: { start: 0, end: 11 },
        values: [
          {
            kind: Kind.INT,
            loc: { start: 1, end: 4 },
            value: '123',
          },
          {
            kind: Kind.STRING,
            loc: { start: 5, end: 10 },
            value: 'abc',
            block: false,
          },
        ],
      });
    });

    it('parses block strings', () => {
      const result = parseValue('["""long""" "short"]');
      expectJSON(result).toDeepEqual({
        kind: Kind.LIST,
        loc: { start: 0, end: 20 },
        values: [
          {
            kind: Kind.STRING,
            loc: { start: 1, end: 11 },
            value: 'long',
            block: true,
          },
          {
            kind: Kind.STRING,
            loc: { start: 12, end: 19 },
            value: 'short',
            block: false,
          },
        ],
      });
    });

    it('allows variables', () => {
      const result = parseValue('{ field: $var }');
      expectJSON(result).toDeepEqual({
        kind: Kind.OBJECT,
        loc: { start: 0, end: 15 },
        fields: [
          {
            kind: Kind.OBJECT_FIELD,
            loc: { start: 2, end: 13 },
            name: {
              kind: Kind.NAME,
              loc: { start: 2, end: 7 },
              value: 'field',
            },
            value: {
              kind: Kind.VARIABLE,
              loc: { start: 9, end: 13 },
              name: {
                kind: Kind.NAME,
                loc: { start: 10, end: 13 },
                value: 'var',
              },
            },
          },
        ],
      });
    });

    it('correct message for incomplete variable', () => {
      expect(() => parseValue('$')).toThrow();
      expectToThrowJSON(() => parseValue('$')).toMatchObject({
        message: 'Syntax Error: Expected Name, found <EOF>.',
        locations: [{ line: 1, column: 2 }],
      });
    });

    it('correct message for unexpected token', () => {
      expect(() => parseValue(':')).toThrow();
      expectToThrowJSON(() => parseValue(':')).toMatchObject({
        message: 'Syntax Error: Unexpected ":".',
        locations: [{ line: 1, column: 1 }],
      });
    });
  });

  describe('parseConstValue', () => {
    it('parses values', () => {
      const result = parseConstValue('[123 "abc"]');
      expectJSON(result).toDeepEqual({
        kind: Kind.LIST,
        loc: { start: 0, end: 11 },
        values: [
          {
            kind: Kind.INT,
            loc: { start: 1, end: 4 },
            value: '123',
          },
          {
            kind: Kind.STRING,
            loc: { start: 5, end: 10 },
            value: 'abc',
            block: false,
          },
        ],
      });
    });

    it('does not allow variables', () => {
      expect(() => parseConstValue('{ field: $var }')).toThrow();
      expectToThrowJSON(() => parseConstValue('{ field: $var }')).toMatchObject({
        message: 'Syntax Error: Unexpected variable "$var" in constant value.',
        locations: [{ line: 1, column: 10 }],
      });
    });

    it('correct message for unexpected token', () => {
      expect(() => parseConstValue('$')).toThrow();
      expectToThrowJSON(() => parseConstValue('$')).toMatchObject({
        message: 'Syntax Error: Unexpected "$".',
        locations: [{ line: 1, column: 1 }],
      });
    });
  });

  describe('parseType', () => {
    it('parses well known types', () => {
      const result = parseType('String');
      expectJSON(result).toDeepEqual({
        kind: Kind.NAMED_TYPE,
        loc: { start: 0, end: 6 },
        name: {
          kind: Kind.NAME,
          loc: { start: 0, end: 6 },
          value: 'String',
        },
      });
    });

    it('parses custom types', () => {
      const result = parseType('MyType');
      expectJSON(result).toDeepEqual({
        kind: Kind.NAMED_TYPE,
        loc: { start: 0, end: 6 },
        name: {
          kind: Kind.NAME,
          loc: { start: 0, end: 6 },
          value: 'MyType',
        },
      });
    });

    it('parses list types', () => {
      const result = parseType('[MyType]');
      expectJSON(result).toDeepEqual({
        kind: Kind.LIST_TYPE,
        loc: { start: 0, end: 8 },
        type: {
          kind: Kind.NAMED_TYPE,
          loc: { start: 1, end: 7 },
          name: {
            kind: Kind.NAME,
            loc: { start: 1, end: 7 },
            value: 'MyType',
          },
        },
      });
    });

    it('parses non-null types', () => {
      const result = parseType('MyType!');
      expectJSON(result).toDeepEqual({
        kind: Kind.NON_NULL_TYPE,
        loc: { start: 0, end: 7 },
        type: {
          kind: Kind.NAMED_TYPE,
          loc: { start: 0, end: 6 },
          name: {
            kind: Kind.NAME,
            loc: { start: 0, end: 6 },
            value: 'MyType',
          },
        },
      });
    });

    it('parses nested types', () => {
      const result = parseType('[MyType!]');
      expectJSON(result).toDeepEqual({
        kind: Kind.LIST_TYPE,
        loc: { start: 0, end: 9 },
        type: {
          kind: Kind.NON_NULL_TYPE,
          loc: { start: 1, end: 8 },
          type: {
            kind: Kind.NAMED_TYPE,
            loc: { start: 1, end: 7 },
            name: {
              kind: Kind.NAME,
              loc: { start: 1, end: 7 },
              value: 'MyType',
            },
          },
        },
      });
    });
  });
});
