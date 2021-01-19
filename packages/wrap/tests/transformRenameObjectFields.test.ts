import { wrapSchema, RenameObjectFields } from '@graphql-tools/wrap';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { graphql } from 'graphql';

describe('RenameObjectFields', () => {
  test('works', async () => {
    const schema = makeExecutableSchema({
      typeDefs: `
        type Widget {
          id: ID!
          name: String
        }

        type Query {
          namedWidget: Widget
        }
      `,
      resolvers: {
        Query: {
          namedWidget: () => ({ id: '1', name: 'gizmo' })
        }
      }
    });

    const transformedSchema = wrapSchema({
      schema,
      transforms: [
        new RenameObjectFields((_typeName, fieldName) => fieldName.replace(/^name/, 'title'))
      ],
    });

    const result = await graphql(transformedSchema, `{
      titledWidget {
        title
      }
    }`);

    expect(result.data).toEqual({
      titledWidget: {
        title: 'gizmo'
      }
    });
  });
});
