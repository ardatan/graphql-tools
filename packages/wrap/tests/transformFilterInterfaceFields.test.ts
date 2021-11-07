import { wrapSchema, FilterInterfaceFields } from '@graphql-tools/wrap';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { GraphQLObjectType, GraphQLInterfaceType } from 'graphql';

describe('FilterInterfaceFields', () => {
  test('works', async () => {
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        interface IWidget {
          alpha: String
          bravo: String
        }

        type Widget implements IWidget {
          alpha: String
          bravo: String
        }

        type Query {
          widget: Widget
          anotherWidget: Widget
        }
      `,
    });

    const transformedSchema = wrapSchema({
      schema,
      transforms: [new FilterInterfaceFields((_typeName, fieldName) => !fieldName.startsWith('a'))],
    });

    const iwidget = transformedSchema.getType('IWidget') as GraphQLInterfaceType;
    const widget = transformedSchema.getType('Widget') as GraphQLObjectType;
    const query = transformedSchema.getType('Query') as GraphQLObjectType;
    expect(Object.keys(iwidget.getFields())).toEqual(['bravo']);
    expect(Object.keys(widget.getFields())).toEqual(['alpha', 'bravo']);
    expect(Object.keys(query.getFields())).toEqual(['widget', 'anotherWidget']);
  });
});
