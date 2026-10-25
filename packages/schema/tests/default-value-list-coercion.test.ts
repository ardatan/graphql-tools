import {
  GraphQLBoolean,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} from 'graphql';
import { addResolversToSchema } from '../src/index.js';

describe('default value list coercion', () => {
  const listOfString = new GraphQLList(GraphQLString);

  function schemaWithSingletonListDefaults() {
    const Input = new GraphQLInputObjectType({
      name: 'SomeInput',
      fields: {
        fieldX: { type: listOfString, defaultValue: '' },
      },
    });
    return new GraphQLSchema({
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
  }

  it('addResolversToSchema keeps singleton list defaults', () => {
    const schema = addResolversToSchema({
      schema: schemaWithSingletonListDefaults(),
      resolvers: {
        Query: {
          foo: () => 'ok',
        },
      },
    });
    const foo = schema.getQueryType()!.getFields()['foo'];

    expect(foo.args.find(arg => arg.name === 'ids')?.defaultValue).toEqual(['valueY']);
    expect(foo.args.find(arg => arg.name === 'flags')?.defaultValue).toEqual([false]);
    expect(foo.args.find(arg => arg.name === 'counts')?.defaultValue).toEqual([0]);
    expect(
      (schema.getType('SomeInput') as GraphQLInputObjectType).getFields()['fieldX'].defaultValue,
    ).toEqual(['']);
  });
});
