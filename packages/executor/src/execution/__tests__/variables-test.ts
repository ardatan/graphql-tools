// eslint-disable-next-line import/no-extraneous-dependencies
import { inspect } from 'cross-inspect';
import {
  GraphQLArgumentConfig,
  GraphQLEnumType,
  GraphQLFieldConfig,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLString,
  Kind,
  parse,
  versionInfo,
} from 'graphql';
import { createGraphQLError } from '@graphql-tools/utils';
import { expectJSON } from '../../__testUtils__/expectJSON.js';
import { executeSync } from '../execute.js';
import { getVariableValues } from '../values.js';

const isGraphQL17 = versionInfo.major >= 17;

const TestComplexScalar = new GraphQLScalarType({
  name: 'ComplexScalar',
  parseValue(value) {
    expect(value).toEqual('SerializedValue');
    return 'DeserializedValue';
  },
  parseLiteral(ast) {
    expect(ast).toMatchObject({ kind: 'StringValue', value: 'SerializedValue' });
    return 'DeserializedValue';
  },
});

const TestFaultyScalarGraphQLError = createGraphQLError('FaultyScalarErrorMessage', {
  extensions: {
    code: 'FaultyScalarErrorMessageExtensionCode',
  },
});

const TestFaultyScalar = new GraphQLScalarType({
  name: 'FaultyScalar',
  parseValue() {
    throw TestFaultyScalarGraphQLError;
  },
  parseLiteral() {
    throw TestFaultyScalarGraphQLError;
  },
});

const TestInputObject = new GraphQLInputObjectType({
  name: 'TestInputObject',
  fields: {
    a: { type: GraphQLString },
    b: { type: new GraphQLList(GraphQLString) },
    c: { type: new GraphQLNonNull(GraphQLString) },
    d: { type: TestComplexScalar },
    e: { type: TestFaultyScalar },
  },
});

const TestNestedInputObject = new GraphQLInputObjectType({
  name: 'TestNestedInputObject',
  fields: {
    na: { type: new GraphQLNonNull(TestInputObject) },
    nb: { type: new GraphQLNonNull(GraphQLString) },
  },
});

const TestEnum = new GraphQLEnumType({
  name: 'TestEnum',
  values: {
    NULL: { value: null },
    UNDEFINED: { value: undefined },
    NAN: { value: NaN },
    FALSE: { value: false },
    CUSTOM: { value: 'custom value' },
    DEFAULT_VALUE: {},
  },
});

function fieldWithInputArg(inputArg: GraphQLArgumentConfig): GraphQLFieldConfig<any, any> {
  return {
    type: GraphQLString,
    args: { input: inputArg },
    resolve(_, args: any) {
      if ('input' in args) {
        return inspect(args.input);
      }
      return undefined;
    },
  };
}

const TestType = new GraphQLObjectType({
  name: 'TestType',
  fields: {
    fieldWithEnumInput: fieldWithInputArg({ type: TestEnum }),
    fieldWithNonNullableEnumInput: fieldWithInputArg({
      type: new GraphQLNonNull(TestEnum),
    }),
    fieldWithObjectInput: fieldWithInputArg({ type: TestInputObject }),
    fieldWithNullableStringInput: fieldWithInputArg({ type: GraphQLString }),
    fieldWithNonNullableStringInput: fieldWithInputArg({
      type: new GraphQLNonNull(GraphQLString),
    }),
    fieldWithDefaultArgumentValue: fieldWithInputArg({
      type: GraphQLString,
      defaultValue: 'Hello World',
    }),
    fieldWithNonNullableStringInputAndDefaultArgumentValue: fieldWithInputArg({
      type: new GraphQLNonNull(GraphQLString),
      defaultValue: 'Hello World',
    }),
    fieldWithNestedInputObject: fieldWithInputArg({
      type: TestNestedInputObject,
      defaultValue: 'Hello World',
    }),
    list: fieldWithInputArg({ type: new GraphQLList(GraphQLString) }),
    nnList: fieldWithInputArg({
      type: new GraphQLNonNull(new GraphQLList(GraphQLString)),
    }),
    listNN: fieldWithInputArg({
      type: new GraphQLList(new GraphQLNonNull(GraphQLString)),
    }),
    nnListNN: fieldWithInputArg({
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString))),
    }),
  },
});

const schema = new GraphQLSchema({ query: TestType });

function executeQuery(query: string, variableValues?: { [variable: string]: unknown }) {
  const document = parse(query);
  return executeSync({ schema, document, variableValues });
}

describe('Execute: Handles inputs', () => {
  describe('Handles objects and nullability', () => {
    describe('using inline structs', () => {
      it('executes with complex input', () => {
        const result = executeQuery(`
          {
            fieldWithObjectInput(input: {a: "foo", b: ["bar"], c: "baz"})
          }
        `);

        expect(result).toEqual({
          data: {
            fieldWithObjectInput: '{ a: "foo", b: ["bar"], c: "baz" }',
          },
        });
      });

      it('properly parses single value to list', () => {
        const result = executeQuery(`
          {
            fieldWithObjectInput(input: {a: "foo", b: "bar", c: "baz"})
          }
        `);

        expect(result).toEqual({
          data: {
            fieldWithObjectInput: '{ a: "foo", b: ["bar"], c: "baz" }',
          },
        });
      });

      it('properly parses null value to null', () => {
        const result = executeQuery(`
          {
            fieldWithObjectInput(input: {a: null, b: null, c: "C", d: null})
          }
        `);

        expect(result).toMatchObject({
          data: {
            fieldWithObjectInput: '{ a: null, b: null, c: "C", d: null }',
          },
        });
      });

      it('properly parses null value in list', () => {
        const result = executeQuery(`
          {
            fieldWithObjectInput(input: {b: ["A",null,"C"], c: "C"})
          }
        `);

        expect(result).toEqual({
          data: {
            fieldWithObjectInput: '{ b: ["A", null, "C"], c: "C" }',
          },
        });
      });

      it('does not use incorrect value', () => {
        const result = executeQuery(`
          {
            fieldWithObjectInput(input: ["foo", "bar", "baz"])
          }
        `);

        expectJSON(result).toDeepEqual({
          data: {
            fieldWithObjectInput: null,
          },
          errors: [
            {
              message: 'Argument "input" has invalid value ["foo", "bar", "baz"].',
              path: ['fieldWithObjectInput'],
              locations: [{ line: 3, column: 41 }],
            },
          ],
        });
      });

      it('properly runs parseLiteral on complex scalar types', () => {
        const result = executeQuery(`
          {
            fieldWithObjectInput(input: {c: "foo", d: "SerializedValue"})
          }
        `);

        expect(result).toMatchObject({
          data: {
            fieldWithObjectInput: '{ c: "foo", d: "DeserializedValue" }',
          },
        });
      });
    });

    it('errors on faulty scalar type input', () => {
      const result = executeQuery(`
        {
          fieldWithObjectInput(input: {c: "foo", e: "bar"})
        }
      `);

      expectJSON(result).toDeepEqual({
        data: {
          fieldWithObjectInput: null,
        },
        errors: [
          {
            // graphql-js@16 `print` omits spaces after `{`; @17 includes them.
            message: isGraphQL17
              ? 'Argument "input" has invalid value { c: "foo", e: "bar" }.'
              : 'Argument "input" has invalid value {c: "foo", e: "bar"}.',
            path: ['fieldWithObjectInput'],
            locations: [{ line: 3, column: 39 }],
          },
        ],
      });
    });

    describe('using variables', () => {
      const doc = `
        query ($input: TestInputObject) {
          fieldWithObjectInput(input: $input)
        }
      `;

      it('executes with complex input', () => {
        const params = { input: { a: 'foo', b: ['bar'], c: 'baz' } };
        const result = executeQuery(doc, params);

        expect(result).toEqual({
          data: {
            fieldWithObjectInput: '{ a: "foo", b: ["bar"], c: "baz" }',
          },
        });
      });

      it('uses undefined when variable not provided', () => {
        const result = executeQuery(
          `
          query q($input: String) {
            fieldWithNullableStringInput(input: $input)
          }`,
          {
            // Intentionally missing variable values.
          },
        );

        expect(result).toEqual({
          data: {
            fieldWithNullableStringInput: null,
          },
        });
      });

      it('uses null when variable provided explicit null value', () => {
        const result = executeQuery(
          `
          query q($input: String) {
            fieldWithNullableStringInput(input: $input)
          }`,
          { input: null },
        );

        expect(result).toEqual({
          data: {
            fieldWithNullableStringInput: 'null',
          },
        });
      });

      it('uses default value when not provided', () => {
        const result = executeQuery(`
          query ($input: TestInputObject = {a: "foo", b: ["bar"], c: "baz"}) {
            fieldWithObjectInput(input: $input)
          }
        `);

        expect(result).toEqual({
          data: {
            fieldWithObjectInput: '{ a: "foo", b: ["bar"], c: "baz" }',
          },
        });
      });

      it('does not use default value when provided', () => {
        const result = executeQuery(
          `
            query q($input: String = "Default value") {
              fieldWithNullableStringInput(input: $input)
            }
          `,
          { input: 'Variable value' },
        );

        expect(result).toEqual({
          data: {
            fieldWithNullableStringInput: '"Variable value"',
          },
        });
      });

      it('uses explicit null value instead of default value', () => {
        const result = executeQuery(
          `
          query q($input: String = "Default value") {
            fieldWithNullableStringInput(input: $input)
          }`,
          { input: null },
        );

        expect(result).toEqual({
          data: {
            fieldWithNullableStringInput: 'null',
          },
        });
      });

      it('uses null default value when not provided', () => {
        const result = executeQuery(
          `
          query q($input: String = null) {
            fieldWithNullableStringInput(input: $input)
          }`,
          {
            // Intentionally missing variable values.
          },
        );

        expect(result).toEqual({
          data: {
            fieldWithNullableStringInput: 'null',
          },
        });
      });

      it('properly parses single value to list', () => {
        const params = { input: { a: 'foo', b: 'bar', c: 'baz' } };
        const result = executeQuery(doc, params);

        expect(result).toEqual({
          data: {
            fieldWithObjectInput: '{ a: "foo", b: ["bar"], c: "baz" }',
          },
        });
      });

      it('executes with complex scalar input', () => {
        const params = { input: { c: 'foo', d: 'SerializedValue' } };
        const result = executeQuery(doc, params);

        expect(result).toEqual({
          data: {
            fieldWithObjectInput: '{ c: "foo", d: "DeserializedValue" }',
          },
        });
      });

      it('errors on faulty scalar type input', () => {
        const params = { input: { c: 'foo', e: 'SerializedValue' } };
        const result = executeQuery(doc, params);

        expectJSON(result).toDeepEqual({
          errors: [
            {
              message:
                'Variable "$input" got invalid value "SerializedValue" at "input.e"; FaultyScalarErrorMessage',
              locations: [{ line: 2, column: 16 }],
              extensions: { code: 'FaultyScalarErrorMessageExtensionCode' },
            },
          ],
        });
      });

      it('errors on null for nested non-null', () => {
        const params = { input: { a: 'foo', b: 'bar', c: null } };
        const result = executeQuery(doc, params);

        expectJSON(result).toDeepEqual({
          errors: [
            {
              message: isGraphQL17
                ? 'Variable "$input" got invalid value null at "input.c"; Expected value of non-null type "String!" not to be null.'
                : 'Variable "$input" got invalid value null at "input.c"; Expected non-nullable type "String!" not to be null.',
              locations: [{ line: 2, column: 16 }],
            },
          ],
        });
      });

      it('errors on incorrect type', () => {
        const result = executeQuery(doc, { input: 'foo bar' });

        expectJSON(result).toDeepEqual({
          errors: [
            {
              message: isGraphQL17
                ? 'Variable "$input" got invalid value "foo bar"; Expected value of type "TestInputObject" to be an object, found: "foo bar".'
                : 'Variable "$input" got invalid value "foo bar"; Expected type "TestInputObject" to be an object.',
              locations: [{ line: 2, column: 16 }],
            },
          ],
        });
      });

      it('errors on array for input-object variable (does not coerce [] to {})', () => {
        // Snapshotting must not spread arrays into plain objects, or `[]` becomes
        // `{}` and may incorrectly pick up input-field defaults.
        const result = executeQuery(doc, { input: [] });

        // graphql-js@15's coerceInputValue treats arrays as empty objects (missing
        // required fields); @16+ reject them as non-objects. Either way `[]` must
        // not be accepted via defaults.
        const arrayInputObjectMessage =
          versionInfo.major <= 15
            ? 'Variable "$input" got invalid value []; Field "c" of required type "String!" was not provided.'
            : isGraphQL17
              ? 'Variable "$input" got invalid value []; Expected value of type "TestInputObject" to be an object, found: [].'
              : 'Variable "$input" got invalid value []; Expected type "TestInputObject" to be an object.';

        expectJSON(result).toDeepEqual({
          errors: [
            {
              message: arrayInputObjectMessage,
              locations: [{ line: 2, column: 16 }],
            },
          ],
        });
      });

      it('preserves null-prototype inputs that omit Object.prototype field names', () => {
        // Snapshotting into `{}` would inherit `toString` from Object.prototype and
        // fail String coercion for `input I { toString: String }`.
        const InputWithToString = new GraphQLInputObjectType({
          name: 'InputWithToString',
          fields: {
            toString: { type: GraphQLString },
            c: { type: new GraphQLNonNull(GraphQLString) },
          },
        });
        const NullProtoSchema = new GraphQLSchema({
          query: new GraphQLObjectType({
            name: 'Query',
            fields: {
              field: {
                type: GraphQLString,
                args: { input: { type: InputWithToString } },
                resolve: (_, args: { input?: { toString?: string; c: string } }) =>
                  inspect(args.input),
              },
            },
          }),
        });
        const document = parse(`
          query ($input: InputWithToString) {
            field(input: $input)
          }
        `);
        const input = Object.create(null) as { c: string };
        input.c = 'baz';
        const result = executeSync({
          schema: NullProtoSchema,
          document,
          variableValues: { input },
        });
        expect(result).toEqual({
          data: {
            field: '{ c: "baz" }',
          },
        });
      });

      it('preserves prototype getters on declared input fields', () => {
        class InputWithGetter {
          get c() {
            return 'baz';
          }
        }
        const result = executeQuery(doc, { input: new InputWithGetter() });
        expect(result).toEqual({
          data: {
            fieldWithObjectInput: '{ c: "baz" }',
          },
        });
      });

      it('errors on omission of nested non-null', () => {
        const result = executeQuery(doc, { input: { a: 'foo', b: 'bar' } });

        expectJSON(result).toDeepEqual({
          errors: [
            {
              message: isGraphQL17
                ? 'Variable "$input" got invalid value { a: "foo", b: "bar" }; Expected value of type "TestInputObject" to include required field "c", found: { a: "foo", b: "bar" }.'
                : 'Variable "$input" got invalid value { a: "foo", b: "bar" }; Field "c" of required type "String!" was not provided.',
              locations: [{ line: 2, column: 16 }],
            },
          ],
        });
      });

      it('errors on deep nested errors and with many errors', () => {
        const nestedDoc = `
          query ($input: TestNestedInputObject) {
            fieldWithNestedObjectInput(input: $input)
          }
        `;
        const result = executeQuery(nestedDoc, { input: { na: { a: 'foo' } } });

        expectJSON(result).toDeepEqual({
          errors: [
            {
              message: isGraphQL17
                ? 'Variable "$input" got invalid value { a: "foo" } at "input.na"; Expected value of type "TestInputObject" to include required field "c", found: { a: "foo" }.'
                : 'Variable "$input" got invalid value { a: "foo" } at "input.na"; Field "c" of required type "String!" was not provided.',
              locations: [{ line: 2, column: 18 }],
            },
            {
              message: isGraphQL17
                ? 'Variable "$input" got invalid value { na: { a: "foo" } }; Expected value of type "TestNestedInputObject" to include required field "nb", found: { na: { a: "foo" } }.'
                : 'Variable "$input" got invalid value { na: { a: "foo" } }; Field "nb" of required type "String!" was not provided.',
              locations: [{ line: 2, column: 18 }],
            },
          ],
        });
      });

      it('errors on addition of unknown input field', () => {
        const params = {
          input: { a: 'foo', b: 'bar', c: 'baz', extra: 'dog' },
        };
        const result = executeQuery(doc, params);

        expectJSON(result).toDeepEqual({
          errors: [
            {
              message: isGraphQL17
                ? 'Variable "$input" got invalid value { a: "foo", b: "bar", c: "baz", extra: "dog" }; Expected value of type "TestInputObject" not to include unknown field "extra", found: { a: "foo", b: "bar", c: "baz", extra: "dog" }.'
                : 'Variable "$input" got invalid value { a: "foo", b: "bar", c: "baz", extra: "dog" }; Field "extra" is not defined by type "TestInputObject".',
              locations: [{ line: 2, column: 16 }],
            },
          ],
        });
      });
    });
  });

  describe('Handles custom enum values', () => {
    it('allows custom enum values as inputs', () => {
      const result = executeQuery(`
        {
          null: fieldWithEnumInput(input: NULL)
          NaN: fieldWithEnumInput(input: NAN)
          false: fieldWithEnumInput(input: FALSE)
          customValue: fieldWithEnumInput(input: CUSTOM)
          defaultValue: fieldWithEnumInput(input: DEFAULT_VALUE)
        }
      `);

      expect(result).toEqual({
        data: {
          null: 'null',
          NaN: 'NaN',
          false: 'false',
          customValue: '"custom value"',
          defaultValue: '"DEFAULT_VALUE"',
        },
      });
    });

    it('allows non-nullable inputs to have null as enum custom value', () => {
      const result = executeQuery(`
        {
          fieldWithNonNullableEnumInput(input: NULL)
        }
      `);

      expect(result).toEqual({
        data: {
          fieldWithNonNullableEnumInput: 'null',
        },
      });
    });
  });

  describe('Handles nullable scalars', () => {
    it('allows nullable inputs to be omitted', () => {
      const result = executeQuery(`
        {
          fieldWithNullableStringInput
        }
      `);

      expect(result).toEqual({
        data: {
          fieldWithNullableStringInput: null,
        },
      });
    });

    it('allows nullable inputs to be omitted in a variable', () => {
      const result = executeQuery(`
        query ($value: String) {
          fieldWithNullableStringInput(input: $value)
        }
      `);

      expect(result).toEqual({
        data: {
          fieldWithNullableStringInput: null,
        },
      });
    });

    it('allows nullable inputs to be omitted in an unlisted variable', () => {
      const result = executeQuery(`
        query {
          fieldWithNullableStringInput(input: $value)
        }
      `);

      expect(result).toEqual({
        data: {
          fieldWithNullableStringInput: null,
        },
      });
    });

    it('allows nullable inputs to be set to null in a variable', () => {
      const doc = `
        query ($value: String) {
          fieldWithNullableStringInput(input: $value)
        }
      `;
      const result = executeQuery(doc, { value: null });

      expect(result).toEqual({
        data: {
          fieldWithNullableStringInput: 'null',
        },
      });
    });

    it('allows nullable inputs to be set to a value in a variable', () => {
      const doc = `
        query ($value: String) {
          fieldWithNullableStringInput(input: $value)
        }
      `;
      const result = executeQuery(doc, { value: 'a' });

      expect(result).toEqual({
        data: {
          fieldWithNullableStringInput: '"a"',
        },
      });
    });

    it('allows nullable inputs to be set to a value directly', () => {
      const result = executeQuery(`
        {
          fieldWithNullableStringInput(input: "a")
        }
      `);

      expect(result).toEqual({
        data: {
          fieldWithNullableStringInput: '"a"',
        },
      });
    });
  });

  describe('Handles non-nullable scalars', () => {
    it('allows non-nullable variable to be omitted given a default', () => {
      const result = executeQuery(`
        query ($value: String! = "default") {
          fieldWithNullableStringInput(input: $value)
        }
      `);

      expect(result).toEqual({
        data: {
          fieldWithNullableStringInput: '"default"',
        },
      });
    });

    it('allows non-nullable inputs to be omitted given a default', () => {
      const result = executeQuery(`
        query ($value: String = "default") {
          fieldWithNonNullableStringInput(input: $value)
        }
      `);

      expect(result).toEqual({
        data: {
          fieldWithNonNullableStringInput: '"default"',
        },
      });
    });

    it('does not allow non-nullable inputs to be omitted in a variable', () => {
      const result = executeQuery(`
        query ($value: String!) {
          fieldWithNonNullableStringInput(input: $value)
        }
      `);

      expectJSON(result).toDeepEqual({
        errors: [
          {
            message: 'Variable "$value" of required type "String!" was not provided.',
            locations: [{ line: 2, column: 16 }],
          },
        ],
      });
    });

    it('does not allow non-nullable inputs to be set to null in a variable', () => {
      const doc = `
        query ($value: String!) {
          fieldWithNonNullableStringInput(input: $value)
        }
      `;
      const result = executeQuery(doc, { value: null });

      expectJSON(result).toDeepEqual({
        errors: [
          {
            message: 'Variable "$value" of non-null type "String!" must not be null.',
            locations: [{ line: 2, column: 16 }],
          },
        ],
      });
    });

    it('allows non-nullable inputs to be set to a value in a variable', () => {
      const doc = `
        query ($value: String!) {
          fieldWithNonNullableStringInput(input: $value)
        }
      `;
      const result = executeQuery(doc, { value: 'a' });

      expect(result).toEqual({
        data: {
          fieldWithNonNullableStringInput: '"a"',
        },
      });
    });

    it('allows non-nullable inputs to be set to a value directly', () => {
      const result = executeQuery(`
        {
          fieldWithNonNullableStringInput(input: "a")
        }
      `);

      expect(result).toEqual({
        data: {
          fieldWithNonNullableStringInput: '"a"',
        },
      });
    });

    it('reports error for missing non-nullable inputs', () => {
      const result = executeQuery('{ fieldWithNonNullableStringInput }');

      expectJSON(result).toDeepEqual({
        data: {
          fieldWithNonNullableStringInput: null,
        },
        errors: [
          {
            message: 'Argument "input" of required type "String!" was not provided.',
            locations: [{ line: 1, column: 3 }],
            path: ['fieldWithNonNullableStringInput'],
          },
        ],
      });
    });

    it('reports error for array passed into string input', () => {
      const doc = `
        query ($value: String!) {
          fieldWithNonNullableStringInput(input: $value)
        }
      `;
      const result = executeQuery(doc, { value: [1, 2, 3] });

      expectJSON(result).toDeepEqual({
        errors: [
          {
            message:
              'Variable "$value" got invalid value [1, 2, 3]; String cannot represent a non string value: [1, 2, 3]',
            locations: [{ line: 2, column: 16 }],
          },
        ],
      });

      expect(result).toHaveProperty('errors[0].originalError');
    });

    it('reports error for non-provided variables for non-nullable inputs', () => {
      // Note: this test would typically fail validation before encountering
      // this execution error, however for queries which previously validated
      // and are being run against a new schema which have introduced a breaking
      // change to make a formerly non-required argument required, this asserts
      // failure before allowing the underlying code to receive a non-null value.
      const result = executeQuery(`
        {
          fieldWithNonNullableStringInput(input: $foo)
        }
      `);

      expectJSON(result).toDeepEqual({
        data: {
          fieldWithNonNullableStringInput: null,
        },
        errors: [
          {
            message:
              'Argument "input" of required type "String!" was provided the variable "$foo" which was not provided a runtime value.',
            locations: [{ line: 3, column: 50 }],
            path: ['fieldWithNonNullableStringInput'],
          },
        ],
      });
    });
  });

  describe('Handles lists and nullability', () => {
    it('allows lists to be null', () => {
      const doc = `
        query ($input: [String]) {
          list(input: $input)
        }
      `;
      const result = executeQuery(doc, { input: null });

      expect(result).toEqual({ data: { list: 'null' } });
    });

    it('allows lists to contain values', () => {
      const doc = `
        query ($input: [String]) {
          list(input: $input)
        }
      `;
      const result = executeQuery(doc, { input: ['A'] });

      expect(result).toEqual({ data: { list: '["A"]' } });
    });

    it('treats objects with a non-callable iterator as a singleton list item', () => {
      // graphql-js only iterates when typeof value[Symbol.iterator] === 'function'.
      // A null iterator must not snapshot to [] via Array.from.
      const listDoc = parse(`
        query ($input: [TestInputObject]) {
          list(input: $input)
        }
      `);
      const operation = listDoc.definitions[0];
      expect(operation.kind === Kind.OPERATION_DEFINITION).toBeTruthy();
      // @ts-expect-error
      const { variableDefinitions } = operation;
      const value = Object.assign(Object.create(null), {
        a: 'foo',
        b: ['bar'],
        c: 'baz',
        [Symbol.iterator]: null,
      });
      const coerced = getVariableValues(schema, variableDefinitions, { input: value });
      expect(coerced.errors).toBeUndefined();
      expect(coerced.variableValues?.coerced['input']).toEqual([
        { a: 'foo', b: ['bar'], c: 'baz' },
      ]);
    });

    it('allows lists to contain null', () => {
      const doc = `
        query ($input: [String]) {
          list(input: $input)
        }
      `;
      const result = executeQuery(doc, { input: ['A', null, 'B'] });

      expect(result).toEqual({ data: { list: '["A", null, "B"]' } });
    });

    it('does not allow non-null lists to be null', () => {
      const doc = `
        query ($input: [String]!) {
          nnList(input: $input)
        }
      `;
      const result = executeQuery(doc, { input: null });

      expectJSON(result).toDeepEqual({
        errors: [
          {
            message: 'Variable "$input" of non-null type "[String]!" must not be null.',
            locations: [{ line: 2, column: 16 }],
          },
        ],
      });
    });

    it('allows non-null lists to contain values', () => {
      const doc = `
        query ($input: [String]!) {
          nnList(input: $input)
        }
      `;
      const result = executeQuery(doc, { input: ['A'] });

      expect(result).toEqual({ data: { nnList: '["A"]' } });
    });

    it('allows non-null lists to contain null', () => {
      const doc = `
        query ($input: [String]!) {
          nnList(input: $input)
        }
      `;
      const result = executeQuery(doc, { input: ['A', null, 'B'] });

      expect(result).toEqual({ data: { nnList: '["A", null, "B"]' } });
    });

    it('allows lists of non-nulls to be null', () => {
      const doc = `
        query ($input: [String!]) {
          listNN(input: $input)
        }
      `;
      const result = executeQuery(doc, { input: null });

      expect(result).toEqual({ data: { listNN: 'null' } });
    });

    it('allows lists of non-nulls to contain values', () => {
      const doc = `
        query ($input: [String!]) {
          listNN(input: $input)
        }
      `;
      const result = executeQuery(doc, { input: ['A'] });

      expect(result).toEqual({ data: { listNN: '["A"]' } });
    });

    it('does not allow lists of non-nulls to contain null', () => {
      const doc = `
        query ($input: [String!]) {
          listNN(input: $input)
        }
      `;
      const result = executeQuery(doc, { input: ['A', null, 'B'] });

      expectJSON(result).toDeepEqual({
        errors: [
          {
            message: isGraphQL17
              ? 'Variable "$input" got invalid value null at "input[1]"; Expected value of non-null type "String!" not to be null.'
              : 'Variable "$input" got invalid value null at "input[1]"; Expected non-nullable type "String!" not to be null.',
            locations: [{ line: 2, column: 16 }],
          },
        ],
      });
    });

    it('does not allow non-null lists of non-nulls to be null', () => {
      const doc = `
        query ($input: [String!]!) {
          nnListNN(input: $input)
        }
      `;
      const result = executeQuery(doc, { input: null });

      expectJSON(result).toDeepEqual({
        errors: [
          {
            message: 'Variable "$input" of non-null type "[String!]!" must not be null.',
            locations: [{ line: 2, column: 16 }],
          },
        ],
      });
    });

    it('allows non-null lists of non-nulls to contain values', () => {
      const doc = `
        query ($input: [String!]!) {
          nnListNN(input: $input)
        }
      `;
      const result = executeQuery(doc, { input: ['A'] });

      expect(result).toEqual({ data: { nnListNN: '["A"]' } });
    });

    it('does not allow non-null lists of non-nulls to contain null', () => {
      const doc = `
        query ($input: [String!]!) {
          nnListNN(input: $input)
        }
      `;
      const result = executeQuery(doc, { input: ['A', null, 'B'] });

      expectJSON(result).toDeepEqual({
        errors: [
          {
            message: isGraphQL17
              ? 'Variable "$input" got invalid value null at "input[1]"; Expected value of non-null type "String!" not to be null.'
              : 'Variable "$input" got invalid value null at "input[1]"; Expected non-nullable type "String!" not to be null.',
            locations: [{ line: 2, column: 16 }],
          },
        ],
      });
    });

    it('does not allow invalid types to be used as values', () => {
      const doc = `
        query ($input: TestType!) {
          fieldWithObjectInput(input: $input)
        }
      `;
      const result = executeQuery(doc, { input: { list: ['A', 'B'] } });

      expectJSON(result).toDeepEqual({
        errors: [
          {
            message:
              'Variable "$input" expected value of type "TestType!" which cannot be used as an input type.',
            locations: [{ line: 2, column: 24 }],
          },
        ],
      });
    });

    it('does not allow unknown types to be used as values', () => {
      const doc = `
        query ($input: UnknownType!) {
          fieldWithObjectInput(input: $input)
        }
      `;
      const result = executeQuery(doc, { input: 'WhoKnows' });

      expectJSON(result).toDeepEqual({
        errors: [
          {
            message:
              'Variable "$input" expected value of type "UnknownType!" which cannot be used as an input type.',
            locations: [{ line: 2, column: 24 }],
          },
        ],
      });
    });
  });

  describe('Execute: Uses argument default values', () => {
    it('when no argument provided', () => {
      const result = executeQuery('{ fieldWithDefaultArgumentValue }');

      expect(result).toEqual({
        data: {
          fieldWithDefaultArgumentValue: '"Hello World"',
        },
      });
    });

    it('when omitted variable provided', () => {
      const result = executeQuery(`
        query ($optional: String) {
          fieldWithDefaultArgumentValue(input: $optional)
        }
      `);

      expect(result).toEqual({
        data: {
          fieldWithDefaultArgumentValue: '"Hello World"',
        },
      });
    });

    it('not when argument cannot be coerced', () => {
      const result = executeQuery(`
        {
          fieldWithDefaultArgumentValue(input: WRONG_TYPE)
        }
      `);

      expectJSON(result).toDeepEqual({
        data: {
          fieldWithDefaultArgumentValue: null,
        },
        errors: [
          {
            message: 'Argument "input" has invalid value WRONG_TYPE.',
            locations: [{ line: 3, column: 48 }],
            path: ['fieldWithDefaultArgumentValue'],
          },
        ],
      });
    });

    it('when no runtime value is provided to a non-null argument', () => {
      const result = executeQuery(`
        query optionalVariable($optional: String) {
          fieldWithNonNullableStringInputAndDefaultArgumentValue(input: $optional)
        }
      `);

      expect(result).toEqual({
        data: {
          fieldWithNonNullableStringInputAndDefaultArgumentValue: '"Hello World"',
        },
      });
    });
  });

  // hideSuggestions is aligned with graphql@17 ExecutionArgs; enum leaf coercion
  // only accepts the flag there. Skip on older graphql majors.
  (isGraphQL17 ? describe : describe.skip)('hideSuggestions', () => {
    const hideSuggestionsSchema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          review: fieldWithInputArg({
            type: new GraphQLInputObjectType({
              name: 'ReviewInput',
              fields: {
                comment: { type: GraphQLString },
              },
            }),
          }),
          color: fieldWithInputArg({
            type: new GraphQLEnumType({
              name: 'Color',
              values: {
                RED: {},
                GREEN: {},
              },
            }),
          }),
        },
      }),
    });

    function executeWithHideSuggestions(
      query: string,
      variableValues: { [variable: string]: unknown },
      hideSuggestions?: boolean,
    ) {
      return executeSync({
        schema: hideSuggestionsSchema,
        document: parse(query),
        variableValues,
        hideSuggestions,
      });
    }

    it('includes suggestions for unknown input fields by default', () => {
      const result = executeWithHideSuggestions(
        'query ($input: ReviewInput) { review(input: $input) }',
        { input: { commnet: 'great' } },
      );

      expectJSON(result).toDeepEqual({
        errors: [
          {
            message:
              'Variable "$input" got invalid value { commnet: "great" }; Expected value of type "ReviewInput" not to include unknown field "commnet". Did you mean "comment"? Found: { commnet: "great" }.',
            locations: [{ line: 1, column: 8 }],
          },
        ],
      });
    });

    it('omits suggestions for unknown input fields when hideSuggestions is true', () => {
      const result = executeWithHideSuggestions(
        'query ($input: ReviewInput) { review(input: $input) }',
        { input: { commnet: 'great' } },
        true,
      );

      expectJSON(result).toDeepEqual({
        errors: [
          {
            message:
              'Variable "$input" got invalid value { commnet: "great" }; Expected value of type "ReviewInput" not to include unknown field "commnet", found: { commnet: "great" }.',
            locations: [{ line: 1, column: 8 }],
          },
        ],
      });
    });

    it('includes suggestions for invalid enum values by default', () => {
      const result = executeWithHideSuggestions('query ($input: Color) { color(input: $input) }', {
        input: 'REDD',
      });

      expectJSON(result).toDeepEqual({
        errors: [
          {
            message:
              'Variable "$input" got invalid value "REDD"; Value "REDD" does not exist in "Color" enum. Did you mean the enum value "RED"?',
            locations: [{ line: 1, column: 8 }],
          },
        ],
      });
    });

    it('omits suggestions for invalid enum values when hideSuggestions is true', () => {
      const result = executeWithHideSuggestions(
        'query ($input: Color) { color(input: $input) }',
        { input: 'REDD' },
        true,
      );

      expectJSON(result).toDeepEqual({
        errors: [
          {
            message:
              'Variable "$input" got invalid value "REDD"; Value "REDD" does not exist in "Color" enum.',
            locations: [{ line: 1, column: 8 }],
          },
        ],
      });
    });
  });

  describe('getVariableValues: limit maximum number of coercion errors', () => {
    const doc = parse(`
      query ($input: [String!]) {
        listNN(input: $input)
      }
    `);

    const operation = doc.definitions[0];
    expect(operation.kind === Kind.OPERATION_DEFINITION).toBeTruthy();
    // @ts-expect-error
    const { variableDefinitions } = operation;
    expect(variableDefinitions != null).toBeTruthy();

    const inputValue = { input: [0, 1, 2] };

    function invalidValueError(value: number, index: number) {
      return {
        message: `Variable "$input" got invalid value ${value} at "input[${index}]"; String cannot represent a non string value: ${value}`,
        locations: [{ line: 2, column: 14 }],
      };
    }

    it('return all errors by default', () => {
      const result = getVariableValues(schema, variableDefinitions, inputValue);

      expectJSON(result).toDeepEqual({
        errors: [invalidValueError(0, 0), invalidValueError(1, 1), invalidValueError(2, 2)],
      });
    });

    it('when maxErrors is equal to number of errors', () => {
      const result = getVariableValues(schema, variableDefinitions, inputValue, { maxErrors: 3 });

      expectJSON(result).toDeepEqual({
        errors: [invalidValueError(0, 0), invalidValueError(1, 1), invalidValueError(2, 2)],
      });
    });

    it('when maxErrors is less than number of errors', () => {
      const result = getVariableValues(schema, variableDefinitions, inputValue, { maxErrors: 2 });

      expectJSON(result).toDeepEqual({
        errors: [
          invalidValueError(0, 0),
          invalidValueError(1, 1),
          {
            message:
              'Too many errors processing variables, error limit reached. Execution aborted.',
          },
        ],
      });
    });
  });
});
