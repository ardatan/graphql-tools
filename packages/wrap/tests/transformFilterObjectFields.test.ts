import { wrapSchema, FilterObjectFields } from '@graphql-tools/wrap';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { GraphQLObjectType } from 'graphql';

describe('FilterObjectFields', () => {
  test('works', async () => {
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Widget {
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
      transforms: [new FilterObjectFields((_typeName, fieldName) => !fieldName.startsWith('a'))],
    });

    const widget = transformedSchema.getType('Widget') as GraphQLObjectType;
    const query = transformedSchema.getType('Query') as GraphQLObjectType;
    expect(Object.keys(widget.getFields())).toEqual(['bravo']);
    expect(Object.keys(query.getFields())).toEqual(['widget']);
  });
});
