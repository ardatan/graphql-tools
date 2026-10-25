import {
  GraphQLBoolean,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} from 'graphql';
import {
  mapSchema,
  parseInputValue,
  serializeInputValue,
  transformInputValue,
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
