import { graphql } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { RenameObjectFields, wrapSchema } from '@graphql-tools/wrap';

describe('RenameObjectFields', () => {
  test('works', async () => {
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
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
          namedWidget: () => ({ id: '1', name: 'gizmo' }),
        },
      },
    });

    const transformedSchema = wrapSchema({
      schema,
      transforms: [
        new RenameObjectFields((_typeName, fieldName) => fieldName.replace(/^name/, 'title')),
      ],
    });

    const result = await graphql({
      schema: transformedSchema,
      source: /* GraphQL */ `
        {
          titledWidget {
            title
          }
        }
      `,
    });

    expect(result.data).toEqual({
      titledWidget: {
        title: 'gizmo',
      },
    });
  });
});
