import { wrapSchema, TransformCompositeFields } from '@graphql-tools/wrap';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { parse } from 'graphql';
import { execute, isIncrementalResult } from '@graphql-tools/executor';

const baseSchema = makeExecutableSchema({
  typeDefs: /* GraphQL */ `
    type Product {
      _id: ID!
    }

    type Query {
      product: Product
    }
  `,
  resolvers: {
    Query: {
      product: () => ({ _id: 'r2d2c3p0' }),
    },
  },
});

describe('TransformCompositeFields', () => {
  test('renames and translates field selections', async () => {
    const transformedSchema = wrapSchema({
      schema: baseSchema,
      transforms: [
        new TransformCompositeFields((typeName, _fieldName, fieldConfig) => {
          return typeName === 'Product' ? ['id', fieldConfig] : fieldConfig;
        }),
      ],
    });

    const result = await execute({
      schema: transformedSchema,
      document: parse('{ product { id, theId: id } }'),
    });
    if (isIncrementalResult(result)) throw Error('result is incremental');
    expect(result.data).toEqual({
      product: { id: 'r2d2c3p0', theId: 'r2d2c3p0' },
    });
  });

  test('translates field values with custom resolver', async () => {
    const transformedSchema = wrapSchema({
      schema: baseSchema,
      transforms: [
        new TransformCompositeFields((typeName, _fieldName, fieldConfig) => {
          if (typeName === 'Product') {
            return [
              'id',
              {
                ...fieldConfig,
                resolve: (parent, _args, _context, info) => {
                  return parent[info.path.key].toUpperCase();
                },
              },
            ];
          }
          return fieldConfig;
        }),
      ],
    });

    const result = await execute({
      schema: transformedSchema,
      document: parse('{ product { theId: id } }'),
    });
    if (isIncrementalResult(result)) throw Error('result is incremental');
    expect(result.data).toEqual({
      product: { theId: 'R2D2C3P0' },
    });
  });

  test('transforms each data object with mapping', async () => {
    const dataObjects: Array<string> = [];
    const transformedSchema = wrapSchema({
      schema: baseSchema,
      transforms: [
        new TransformCompositeFields(
          (_typeName, _fieldName, fieldConfig) => fieldConfig,
          undefined,
          obj => {
            dataObjects.push(obj.__typename);
            if (obj._id) obj._id = obj._id.toUpperCase();
            return obj;
          }
        ),
      ],
    });

    const result = await execute({
      schema: transformedSchema,
      document: parse('{ product { _id } }'),
    });
    if (isIncrementalResult(result)) throw Error('result is incremental');
    expect(dataObjects).toEqual(['Query', 'Product']);
    expect(result.data).toEqual({
      product: { _id: 'R2D2C3P0' },
    });
  });
});
