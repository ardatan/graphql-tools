import { makeExecutableSchema } from '@graphql-tools/schema';
import { stitchSchemas, defaultMergedTypeResolver } from '@graphql-tools/stitch';
import { MergedTypeConfig } from '@graphql-tools/delegate';
import { graphql } from 'graphql';

describe('Custom resolvers', () => {
  const firstSchema = makeExecutableSchema({
    typeDefs: `
      type Widget {
        id: ID!
      }
      type Sprocket {
        id: ID!
      }
      type Query {
        widget(id: ID!): Widget
        sprocket(id: ID!): Sprocket
      }
    `,
    resolvers: {
      Query: {
        widget: (_root, { id }) => ({ id }),
        sprocket: (_root, { id }) => ({ id }),
      }
    }
  });

  const secondSchema = makeExecutableSchema({
    typeDefs: `
      type Widget {
        id: ID!
        source: String
      }
      type Sprocket {
        id: ID!
        source: String
      }
      type Query {
        _widgets(ids: [ID!]!): [Widget]!
        _sprocket(id: ID!): Sprocket
      }
    `,
    resolvers: {
      Query: {
        _widgets: (_root, { ids }) => ids.map((id: any) => ({ id, source: 'service' })),
        _sprocket: (_root, { id }) => ({ id, source: 'service' }),
      }
    }
  });

  describe('eagerReturn', () => {
    const gatewaySchema = stitchSchemas({
      subschemas: [
        {
          schema: firstSchema,
        },
        {
          schema: secondSchema,
          merge: {
            Widget: {
              selectionSet: '{ id }',
              fieldName: '_widgets',
              key: ({ id }) => id,
              argsFromKeys: (ids) => ({ ids }),
              eagerReturn: (_obj, _ctx, _inf, _sch, _sel, key) => Number(key) > 5 ? null : undefined,
            },
            Sprocket: {
              selectionSet: '{ id }',
              fieldName: '_sprocket',
              args: ({ id }) => ({ id }),
              eagerReturn: ({ id }) => Number(id) > 5 ? null : undefined,
            },
          },
        },
      ]
    });

    it('passes undefined from eagerReturn through to delegation', async () => {
      const { data } = await graphql(gatewaySchema, `
        query {
          widget(id: 1) { id source }
          sprocket(id: 1) { id source }
        }
      `);

      expect(data).toEqual({
        widget: { id: '1', source: 'service' },
        sprocket: { id: '1', source: 'service' },
      });
    });

    it('returns value from eagerReturn directly', async () => {
      const { data } = await graphql(gatewaySchema, `
        query {
          widget(id: 10) { id source }
          sprocket(id: 10) { id source }
        }
      `);

      expect(data).toEqual({
        widget: { id: '10', source: null },
        sprocket: { id: '10', source: null },
      });
    });
  });

  describe('custom resolve', () => {
    const gatewaySchema = stitchSchemas({
      subschemas: [
        {
          schema: firstSchema,
        },
        {
          schema: secondSchema,
          merge: {
            Widget: {
              selectionSet: '{ id }',
              fieldName: '_widgets',
              key: ({ id }) => id,
              argsFromKeys: (ids) => ({ ids }),
              resolve: (originalResult) => ({ ...originalResult, source: 'resolve' }),
            },
            Sprocket: {
              selectionSet: '{ id }',
              fieldName: '_sprocket',
              args: ({ id }) => ({ id }),
              resolve: (originalResult) => ({ ...originalResult, source: 'resolve' }),
            },
          },
        },
      ]
    });

    it('uses custom resolvers when provided', async () => {
      const { data } = await graphql(gatewaySchema, `
        query {
          widget(id: 1) { id source }
          sprocket(id: 1) { id source }
        }
      `);

      expect(data).toEqual({
        widget: { id: '1', source: 'resolve' },
        sprocket: { id: '1', source: 'resolve' },
      });
    });
  });

  describe('wrapped default resolver', () => {
    function wrappedResolve(mergedTypeConfig: MergedTypeConfig): MergedTypeConfig {
      const defaultResolve = defaultMergedTypeResolver(mergedTypeConfig);
      mergedTypeConfig.resolve = async (obj, ctx, inf, sch, sel, key) => {
        const result = await defaultResolve(obj, ctx, inf, sch, sel, key);
        result.source += '->resolve';
        return result;
      };
      return mergedTypeConfig;
    }

    const gatewaySchema = stitchSchemas({
      subschemas: [
        {
          schema: firstSchema,
        },
        {
          schema: secondSchema,
          merge: {
            Widget: wrappedResolve({
              selectionSet: '{ id }',
              fieldName: '_widgets',
              key: ({ id }) => id,
              argsFromKeys: (ids) => ({ ids }),
            }),
            Sprocket: wrappedResolve({
              selectionSet: '{ id }',
              fieldName: '_sprocket',
              args: ({ id }) => ({ id }),
            }),
          },
        },
      ]
    });

    it('uses default merge resolver with custom wrapper', async () => {
      const { data } = await graphql(gatewaySchema, `
        query {
          widget(id: 1) { id source }
          sprocket(id: 1) { id source }
        }
      `);

      expect(data).toEqual({
        widget: { id: '1', source: 'service->resolve' },
        sprocket: { id: '1', source: 'service->resolve' },
      });
    });
  });

});
