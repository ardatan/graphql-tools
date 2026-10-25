import {
  graphql,
  GraphQLBoolean,
  GraphQLInputObjectType,
  GraphQLInputType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  parse,
} from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { stitchSchemas } from '@graphql-tools/stitch';
import { RenameInputObjectFields, wrapSchema } from '@graphql-tools/wrap';
import {
  mapSchema,
  parseInputValue,
  serializeInputValue,
  transformInputValue,
  type InputObjectValueTransformer,
} from '../src/index.js';

describe('transformInputValue list coercion', () => {
  const listOfString = new GraphQLList(GraphQLString);
  const SomeInput = new GraphQLInputObjectType({
    name: 'SomeInput',
    fields: {
      fieldX: { type: listOfString },
    },
  });

  it('coerces a single value for a list field instead of calling value.map', () => {
    expect(transformInputValue(listOfString, 'valueY')).toEqual(['valueY']);
    expect(transformInputValue(listOfString, '')).toEqual(['']);
    expect(transformInputValue(new GraphQLList(GraphQLInt), 0)).toEqual([0]);
    expect(transformInputValue(new GraphQLList(GraphQLBoolean), false)).toEqual([false]);
    expect(transformInputValue(SomeInput, { fieldX: 'valueY' })).toEqual({
      fieldX: ['valueY'],
    });
    expect(transformInputValue(SomeInput, { fieldX: '' })).toEqual({
      fieldX: [''],
    });
  });

  it('leaves an actual list as a list', () => {
    expect(transformInputValue(listOfString, ['valueY', 'valueZ'])).toEqual(['valueY', 'valueZ']);
  });

  it('serializeInputValue and parseInputValue accept a coerced list item', () => {
    expect(serializeInputValue(SomeInput, { fieldX: 'valueY' })).toEqual({
      fieldX: ['valueY'],
    });
    expect(parseInputValue(SomeInput, { fieldX: 'valueY' })).toEqual({
      fieldX: ['valueY'],
    });
  });

  it('mapSchema keeps list argument and input-field defaults that were given as a singleton', () => {
    const Input = new GraphQLInputObjectType({
      name: 'SomeInput',
      fields: {
        fieldX: { type: listOfString, defaultValue: '' },
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          foo: {
            type: GraphQLString,
            args: {
              ids: { type: listOfString, defaultValue: 'valueY' },
              flags: { type: new GraphQLList(GraphQLBoolean), defaultValue: false },
              counts: { type: new GraphQLList(GraphQLInt), defaultValue: 0 },
            },
          },
        },
      }),
      types: [Input],
    });

    const mapped = mapSchema(schema, {});
    const foo = mapped.getQueryType()!.getFields()['foo'];

    expect(foo.args.find(arg => arg.name === 'ids')?.defaultValue).toEqual(['valueY']);
    expect(foo.args.find(arg => arg.name === 'flags')?.defaultValue).toEqual([false]);
    expect(foo.args.find(arg => arg.name === 'counts')?.defaultValue).toEqual([0]);
    expect(
      (mapped.getType('SomeInput') as GraphQLInputObjectType).getFields()['fieldX'].defaultValue,
    ).toEqual(['']);
  });
});

// @graphql-tools/wrap TransformInputObjectFields.transformRequest (gateway) walks
// each operation variable with transformInputValue(varType, value, undefined, renameKeys).
// stitch applies the same wrap transforms when a subschema is renamed.
function rewriteVariablesLikeWrap(
  varType: GraphQLInputType,
  value: unknown,
  mapping: Record<string, Record<string, string>>,
) {
  const inputObjectValueTransformer: InputObjectValueTransformer = (type, originalValue) => {
    const newValue = Object.create(null) as Record<string, unknown>;
    const fields = type.getFields();
    for (const key in originalValue) {
      const field = fields[key];
      if (field != null) {
        const upstreamName = mapping[type.name]?.[field.name];
        if (upstreamName != null) {
          newValue[upstreamName] = originalValue[field.name];
        } else {
          newValue[field.name] = originalValue[field.name];
        }
      }
    }
    return newValue;
  };
  return transformInputValue(varType, value, undefined, inputObjectValueTransformer);
}

function schemaWithListInput(argName = 'input', argType = 'SomeInput') {
  return makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      input SomeInput {
        fieldX: [String]
        count: [Int]
        flag: [Boolean]
      }
      type Query {
        foo(${argName}: ${argType}): [String]
      }
    `,
    resolvers: {
      Query: {
        foo: (_root, args) => {
          const value = args[argName];
          if (Array.isArray(value)) {
            return value.flatMap((item: { fieldX?: string[] }) => item.fieldX ?? []);
          }
          return value?.fieldX ?? value;
        },
      },
    },
  });
}

function renameFieldXToY() {
  return new RenameInputObjectFields((typeName, fieldName) =>
    typeName === 'SomeInput' && fieldName === 'fieldX' ? 'fieldY' : undefined,
  );
}

describe('wrap and stitch input-variable transforms', () => {
  const listOfString = new GraphQLList(GraphQLString);
  const SomeInput = new GraphQLInputObjectType({
    name: 'SomeInput',
    fields: {
      fieldY: { type: listOfString },
      count: { type: new GraphQLList(GraphQLInt) },
      flag: { type: new GraphQLList(GraphQLBoolean) },
    },
  });
  // Gateway name -> upstream name, same map TransformInputObjectFields builds.
  const mapping = { SomeInput: { fieldY: 'fieldX' } };

  it('rewrites renamed keys after coercing a singleton list value', () => {
    expect(rewriteVariablesLikeWrap(SomeInput, { fieldY: 'valueY' }, mapping)).toEqual({
      fieldX: ['valueY'],
    });
    expect(
      rewriteVariablesLikeWrap(new GraphQLNonNull(SomeInput), { fieldY: 'valueY' }, mapping),
    ).toEqual({
      fieldX: ['valueY'],
    });
  });

  it('keeps falsy singletons when wrap remaps input object keys', () => {
    expect(rewriteVariablesLikeWrap(SomeInput, { fieldY: '' }, mapping)).toEqual({
      fieldX: [''],
    });
    expect(rewriteVariablesLikeWrap(SomeInput, { count: 0 }, mapping)).toEqual({
      count: [0],
    });
    expect(rewriteVariablesLikeWrap(SomeInput, { flag: false }, mapping)).toEqual({
      flag: [false],
    });
  });

  it('coerces a singleton input object for a list variable', () => {
    expect(rewriteVariablesLikeWrap(new GraphQLList(SomeInput), { fieldY: '' }, mapping)).toEqual([
      { fieldX: [''] },
    ]);
    expect(
      rewriteVariablesLikeWrap(
        new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(SomeInput))),
        {
          fieldY: 'valueY',
        },
        mapping,
      ),
    ).toEqual([{ fieldX: ['valueY'] }]);
  });

  it('RenameInputObjectFields.transformRequest remaps variables through transformInputValue', () => {
    const schema = schemaWithListInput();
    const transform = renameFieldXToY();
    const transformed = transform.transformSchema(schema, { schema });
    const request = transform.transformRequest(
      {
        document: parse('query ($input: SomeInput) { foo(input: $input) }'),
        variables: { input: { fieldY: '' } },
      },
      {} as any,
      {},
    );

    expect(transformed.getType('SomeInput')).toBeDefined();
    expect(
      (transformed.getType('SomeInput') as GraphQLInputObjectType).getFields()['fieldY'],
    ).toBeDefined();
    expect(request.variables).toEqual({ input: { fieldX: [''] } });
  });

  it('wrapSchema resolver sees coerced renamed list variables', async () => {
    const wrapped = wrapSchema({
      schema: schemaWithListInput(),
      transforms: [renameFieldXToY()],
    });

    await expect(
      graphql({
        schema: wrapped,
        source: 'query ($input: SomeInput) { foo(input: $input) }',
        variableValues: { input: { fieldY: 'valueY' } },
      }),
    ).resolves.toEqual({ data: { foo: ['valueY'] } });

    await expect(
      graphql({
        schema: wrapped,
        source: 'query ($input: SomeInput) { foo(input: $input) }',
        variableValues: { input: { fieldY: '' } },
      }),
    ).resolves.toEqual({ data: { foo: [''] } });
  });

  it('wrapSchema coerces a singleton object for a list input argument', async () => {
    const wrapped = wrapSchema({
      schema: schemaWithListInput('inputs', '[SomeInput]'),
      transforms: [renameFieldXToY()],
    });

    await expect(
      graphql({
        schema: wrapped,
        source: 'query ($inputs: [SomeInput]) { foo(inputs: $inputs) }',
        variableValues: { inputs: { fieldY: 'valueY' } },
      }),
    ).resolves.toEqual({ data: { foo: ['valueY'] } });
  });

  it('stitchSchemas applies the same wrap variable rewrite', async () => {
    const stitched = stitchSchemas({
      subschemas: [
        {
          schema: schemaWithListInput(),
          transforms: [renameFieldXToY()],
        },
      ],
    });

    await expect(
      graphql({
        schema: stitched,
        source: 'query ($input: SomeInput) { foo(input: $input) }',
        variableValues: { input: { fieldY: '' } },
      }),
    ).resolves.toEqual({ data: { foo: [''] } });
  });
});
