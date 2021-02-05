import { makeExecutableSchema } from '@graphql-tools/schema';
import { splitMergedTypeAccessTransformer } from '@graphql-tools/stitch';

const schema = makeExecutableSchema({ typeDefs: 'type Query { go:Int }' });

describe('splitMergedTypeAccessTransformer', () => {
  it('applies merged type config accessors', () => {
    const results = splitMergedTypeAccessTransformer({
      schema,
      merge: {
        Product: {
          accessors: [{
            selectionSet: '{ yep }',
            fieldName: 'yep',
          }],
          selectionSet: '{ nope }',
          fieldName: 'nope',
        }
      }
    });

    expect(results.length).toEqual(1);
    expect(results[0].merge.Product).toEqual({
      selectionSet: '{ yep }',
      fieldName: 'yep',
      accessors: undefined,
    });
  });

  it('builds multiple subschemas for separate accessors', () => {
    const results = splitMergedTypeAccessTransformer({
      schema,
      merge: {
        Product: {
          accessors: [{
            selectionSet: '{ id }',
            fieldName: 'productById',
          }, {
            selectionSet: '{ upc }',
            fieldName: 'productByUpc',
          }]
        }
      }
    });

    expect(results.length).toEqual(2);
    expect(results[0].merge.Product).toEqual({
      selectionSet: '{ id }',
      fieldName: 'productById',
      accessors: undefined,
    });
    expect(results[1].merge.Product).toEqual({
      selectionSet: '{ upc }',
      fieldName: 'productByUpc',
      accessors: undefined,
    });
  });

  it('consolidates type permutations into shared subschemas', () => {
    const results = splitMergedTypeAccessTransformer({
      schema,
      merge: {
        Product: {
          accessors: [{
            selectionSet: '{ id }',
            fieldName: 'productById',
          }, {
            selectionSet: '{ upc }',
            fieldName: 'productByUpc',
          }, {
            selectionSet: '{ key }',
            fieldName: 'productByKey',
          }]
        },
        Video: {
          accessors: [{
            selectionSet: '{ id }',
            fieldName: 'videoById',
          }, {
            selectionSet: '{ key }',
            fieldName: 'videoByKey',
          }]
        },
        User: {
          accessors: [{
            selectionSet: '{ id }',
            fieldName: 'userById',
          }]
        },
        Thing: {
          selectionSet: '{ id }',
          fieldName: 'thingById',
        }
      }
    });

    expect(results.length).toEqual(3);
    expect(results[0].merge).toEqual({
      Product: {
        selectionSet: '{ id }',
        fieldName: 'productById',
        accessors: undefined,
      },
      Video: {
        selectionSet: '{ id }',
        fieldName: 'videoById',
        accessors: undefined,
      },
      User: {
        selectionSet: '{ id }',
        fieldName: 'userById',
        accessors: undefined,
      },
      Thing: {
        selectionSet: '{ id }',
        fieldName: 'thingById',
      },
    });

    expect(results[1].merge).toEqual({
      Product: {
        selectionSet: '{ upc }',
        fieldName: 'productByUpc',
        accessors: undefined,
      },
      Video: {
        selectionSet: '{ key }',
        fieldName: 'videoByKey',
        accessors: undefined,
      },
    });

    expect(results[2].merge).toEqual({
      Product: {
        selectionSet: '{ key }',
        fieldName: 'productByKey',
        accessors: undefined,
      },
    });
  });
});
