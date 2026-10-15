import {
  buildSchema,
  FieldNode,
  GraphQLEnumType,
  GraphQLField,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLString,
  Kind,
  OperationDefinitionNode,
  parse,
  valueFromASTUntyped,
  versionInfo,
} from 'graphql';
import { getArgumentValues } from '../src/getArgumentValues.js';

function fieldNodeFrom(query: string): FieldNode {
  const doc = parse(query);
  const op = doc.definitions[0] as OperationDefinitionNode;
  return op.selectionSet.selections[0] as FieldNode;
}

// These tests exercise graphql-js@17's `default` / `coerceInputLiteral`
// mechanism. On older versions, schemas use legacy `defaultValue` and
// argument coercion takes `valueFromAST`, so skip rather than assert on
// that unrelated path.
(versionInfo.major >= 17 ? describe : describe.skip)('getArgumentValues (graphql-js@17)', () => {
  it('coerces an enum default.literal to the enum internal value', () => {
    const Shade = new GraphQLEnumType({
      name: 'Shade',
      values: {
        LIGHT: { value: 'light-shade' },
        DARK: { value: 'dark-shade' },
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          shade: {
            type: GraphQLString,
            args: {
              s: {
                type: Shade,
                default: { literal: { kind: Kind.ENUM, value: 'LIGHT' } },
              } as any,
            },
          },
        },
      }),
    });
    const field = schema.getQueryType()!.getFields()['shade'];

    expect(getArgumentValues(field, fieldNodeFrom('{ shade }'), {})).toEqual({
      s: 'light-shade',
    });
  });

  it('applies a coerced enum default when a variable has no runtime value', () => {
    const Shade = new GraphQLEnumType({
      name: 'Shade',
      values: {
        LIGHT: { value: 'light-shade' },
        DARK: { value: 'dark-shade' },
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          shade: {
            type: GraphQLString,
            args: {
              s: {
                type: Shade,
                default: { literal: { kind: Kind.ENUM, value: 'LIGHT' } },
              } as any,
            },
          },
        },
      }),
    });
    const field = schema.getQueryType()!.getFields()['shade'];

    expect(
      getArgumentValues(field, fieldNodeFrom('query ($s: Shade) { shade(s: $s) }'), {}),
    ).toEqual({ s: 'light-shade' });
  });

  it('applies an Int default when a variable has no runtime value', () => {
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          page: {
            type: GraphQLString,
            args: {
              first: {
                type: GraphQLInt,
                default: { literal: { kind: Kind.INT, value: '50' } },
              } as any,
            },
          },
        },
      }),
    });
    const field = schema.getQueryType()!.getFields()['page'];

    expect(
      getArgumentValues(field, fieldNodeFrom('query ($n: Int) { page(first: $n) }'), {}),
    ).toEqual({ first: 50 });
  });

  it('applies a schema-defined SDL default when a non-null argument references a variable with no runtime value', () => {
    // Schemas built from SDL (buildSchema -> extendSchemaImpl) only populate
    // graphql-js@17's `arg.default`, never the legacy `arg.defaultValue`.
    const schema = buildSchema(`
      type Query {
        foo(bar: String! = "fallback"): String
      }
    `);
    const field = schema.getQueryType()!.getFields()['foo'];

    expect(
      getArgumentValues(field, fieldNodeFrom('query ($bar: String) { foo(bar: $bar) }'), {}),
    ).toEqual({ bar: 'fallback' });
  });

  it('coerces an SDL enum default to the enum internal value', () => {
    const schema = buildSchema(`
      enum Color {
        RED
      }
      type Query {
        anEnum(arg: Color = RED): String
      }
    `);
    // Override the enum value the same way makeExecutableSchema / resolvers do.
    const colorType = schema.getType('Color') as GraphQLEnumType;
    (colorType.getValues()[0] as any).value = '#f00';

    const field = schema.getQueryType()!.getFields()['anEnum'];
    expect(getArgumentValues(field, fieldNodeFrom('{ anEnum }'), {})).toEqual({
      arg: '#f00',
    });
  });

  it('applies an input-object field default when a literal omits that field', () => {
    const Input = new GraphQLInputObjectType({
      name: 'Input',
      fields: {
        n: {
          type: GraphQLInt,
          default: { literal: { kind: Kind.INT, value: '7' } },
        } as any,
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          foo: {
            type: GraphQLString,
            args: {
              input: { type: Input },
            },
          },
        },
      }),
    });
    const field = schema.getQueryType()!.getFields()['foo'];

    expect(getArgumentValues(field, fieldNodeFrom('{ foo(input: {}) }'), {})).toEqual({
      input: { n: 7 },
    });
  });

  it('resolves a variable nested inside an object literal argument for a custom scalar with coerceInputLiteral', () => {
    const JSONScalar = new GraphQLScalarType({
      name: 'JSON',
      coerceInputValue: (v: any) => v,
      // A real `coerceInputLiteral` parses the AST node itself, same as the
      // legacy `parseLiteral` it supersedes.
      coerceInputLiteral: (node: any) => valueFromASTUntyped(node),
    } as any);

    const field = {
      name: 'foo',
      args: [{ name: 'data', type: JSONScalar }],
    } as unknown as GraphQLField<any, any>;

    const result = getArgumentValues(field, fieldNodeFrom('{ foo(data: { key: $v }) }'), {
      v: 'hello',
    });

    expect(result).toEqual({ data: { key: 'hello' } });
  });

  it('preserves a Date-valued variable nested inside an object literal argument', () => {
    const JSONScalar = new GraphQLScalarType({
      name: 'JSON',
      coerceInputValue: (v: any) => v,
      coerceInputLiteral: (node: any) => valueFromASTUntyped(node),
    } as any);

    const field = {
      name: 'foo',
      args: [{ name: 'data', type: JSONScalar }],
    } as unknown as GraphQLField<any, any>;

    const when = new Date('2024-01-01T00:00:00.000Z');
    const result = getArgumentValues(field, fieldNodeFrom('{ foo(data: { occurredAt: $when }) }'), {
      when,
    });

    expect(result).toEqual({ data: { occurredAt: when.toJSON() } });
  });

  it('rebuilds synthetic sources when the same variable map is mutated and reused', () => {
    const JSONScalar = new GraphQLScalarType({
      name: 'JSON',
      coerceInputValue: (v: any) => v,
      coerceInputLiteral: (node: any) => valueFromASTUntyped(node),
    } as any);

    const field = {
      name: 'foo',
      args: [{ name: 'data', type: JSONScalar }],
    } as unknown as GraphQLField<any, any>;

    const variables: Record<string, any> = { v: 'first' };
    const fieldNode = fieldNodeFrom('{ foo(data: { key: $v }) }');

    expect(getArgumentValues(field, fieldNode, variables)).toEqual({
      data: { key: 'first' },
    });

    variables['v'] = 'second';
    expect(getArgumentValues(field, fieldNode, variables)).toEqual({
      data: { key: 'second' },
    });
  });

  it('preserves large integer-valued floats nested in object literals', () => {
    // Number.isInteger(1e21) is true, but String(1e21) is "1e+21" — must be a
    // FloatValue or valueFromASTUntyped corrupts it to 1.
    const JSONScalar = new GraphQLScalarType({
      name: 'JSON',
      coerceInputValue: (v: any) => v,
      coerceInputLiteral: (node: any) => valueFromASTUntyped(node),
    } as any);

    const field = {
      name: 'foo',
      args: [{ name: 'data', type: JSONScalar }],
    } as unknown as GraphQLField<any, any>;

    const result = getArgumentValues(field, fieldNodeFrom('{ foo(data: { n: $v }) }'), {
      v: 1e21,
    });

    expect(result).toEqual({ data: { n: 1e21 } });
  });

  it('preserves enum names when declared variable sources are provided', () => {
    const Shade = new GraphQLEnumType({
      name: 'Shade',
      values: {
        LIGHT: { value: 'light-shade' },
        DARK: { value: 'dark-shade' },
      },
    });
    const JSONScalar = new GraphQLScalarType({
      name: 'JSON',
      coerceInputValue: (v: any) => v,
      coerceInputLiteral: (node: any) => valueFromASTUntyped(node),
    } as any);

    const field = {
      name: 'foo',
      args: [{ name: 'data', type: JSONScalar }],
    } as unknown as GraphQLField<any, any>;

    // Coerced runtime value is the internal enum value; the source still has
    // the original input name and declared enum type, which graphql-js uses
    // when reconstructing a nested literal.
    const result = getArgumentValues(
      field,
      fieldNodeFrom('{ foo(data: { shade: $s }) }'),
      { s: 'light-shade' },
      {
        s: {
          signature: { name: 's', type: Shade, default: undefined },
          value: 'LIGHT',
        },
      },
    );

    expect(result).toEqual({ data: { shade: 'LIGHT' } });
  });

  it('rejects nested variables when the declared type valueToLiteral fails', () => {
    const RejectingScalar = new GraphQLScalarType({
      name: 'Rejecting',
      coerceInputValue: (v: any) => v,
      valueToLiteral: () => undefined,
    } as any);
    const JSONScalar = new GraphQLScalarType({
      name: 'JSON',
      coerceInputValue: (v: any) => v,
      coerceInputLiteral: (node: any) => valueFromASTUntyped(node),
    } as any);

    const field = {
      name: 'foo',
      args: [{ name: 'data', type: JSONScalar }],
    } as unknown as GraphQLField<any, any>;

    expect(() =>
      getArgumentValues(
        field,
        fieldNodeFrom('{ foo(data: { key: $v }) }'),
        { v: 'hello' },
        {
          v: {
            signature: { name: 'v', type: RejectingScalar, default: undefined },
            value: 'hello',
          },
        },
      ),
    ).toThrow(/Argument "data" has invalid value/);
  });

  it('coerces default.value through coerceInputValue', () => {
    const Shade = new GraphQLEnumType({
      name: 'Shade',
      values: {
        LIGHT: { value: 'light-shade' },
        DARK: { value: 'dark-shade' },
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          shade: {
            type: GraphQLString,
            args: {
              s: {
                type: Shade,
                // Programmatic default.value still needs type coercion when the
                // provided value is the enum name rather than the internal value.
                default: { value: 'LIGHT' },
              } as any,
            },
          },
        },
      }),
    });
    const field = schema.getQueryType()!.getFields()['shade'];

    expect(getArgumentValues(field, fieldNodeFrom('{ shade }'), {})).toEqual({
      s: 'light-shade',
    });
  });
});
