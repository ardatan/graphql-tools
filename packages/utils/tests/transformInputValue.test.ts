import {
  GraphQLBoolean,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLString,
} from 'graphql';
import { parseInputValue, serializeInputValue, transformInputValue } from '../src/index.js';

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
});
