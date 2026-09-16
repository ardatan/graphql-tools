import { versionInfo } from 'graphql';
import { testIf } from '../../testing/utils.js';
import { mergeResolvers } from '../src/index.js';

describe('Merge Resolvers', () => {
  it('should return the correct value when falsely value provided', () => {
    expect(mergeResolvers(null)).toEqual({});
  });

  it('should return the correct value when empty array provided', () => {
    expect(mergeResolvers([])).toEqual({});
  });

  it('should return the correct value when one value array provided', () => {
    expect(mergeResolvers([{ User: {} }])).toEqual({
      User: {},
    });
  });

  it('should return the correct when multiple values provided', () => {
    expect(mergeResolvers([{ User: {} }, { MyType: {} }])).toEqual({
      User: {},
      MyType: {},
    });
  });

  it('should merge first level fields', () => {
    expect(mergeResolvers([{ User: { f1: 1 } }, { User: { f2: 2 } }])).toEqual({
      User: {
        f1: 1,
        f2: 2,
      },
    });
  });

  it('should exclude types', () => {
    expect(
      mergeResolvers([{ User: {} }, { MyType: {} }], {
        exclusions: ['User.*'],
      }),
    ).toEqual({ MyType: {} });
  });

  it('should exclude fields', () => {
    expect(
      mergeResolvers([{ User: { f1: 1 } }, { User: { f2: 2 } }], {
        exclusions: ['User.f1'],
      }),
    ).toEqual({
      User: {
        f2: 2,
      },
    });
  });

  testIf(versionInfo.major >= 17)(
    'should preserve symbol-keyed field extensions when merging resolver arrays',
    () => {
      const META = Symbol('META');
      const merged = mergeResolvers([
        {
          Query: {
            hello: {
              resolve: () => 'a',
              extensions: {
                [META]: { from: 'first' },
                tagged: true,
              },
            },
          },
        },
        {
          Query: {
            hello: {
              resolve: () => 'b',
              extensions: {
                [META]: { from: 'second' },
                extra: true,
              },
            },
          },
        },
      ]);

      expect(merged.Query.hello.extensions).toEqual({
        [META]: { from: 'second' },
        tagged: true,
        extra: true,
      });
      expect(merged.Query.hello.resolve()).toBe('b');
    },
  );
});
