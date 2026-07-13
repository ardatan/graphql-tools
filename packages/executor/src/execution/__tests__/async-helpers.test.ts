import { GraphQLResolveInfo } from 'graphql';
import { createSchema, createYoga } from 'graphql-yoga';
import { createDeferred } from '@graphql-tools/utils';
import { patchSymbols } from '@whatwg-node/disposablestack';

patchSymbols();

// GraphQL.js v17 adds getAsyncHelpers; our executor provides it on all supported versions.
type ResolveInfoWithAsyncHelpers = GraphQLResolveInfo & {
  getAsyncHelpers: () => {
    track: (maybePromises: ReadonlyArray<unknown>) => void;
  };
};

describe('getAsyncHelpers().track with Yoga', () => {
  it('registers tracked work with Yoga waitUntil so dispose waits for it', async () => {
    const cleanup = createDeferred<void>();
    let cleanupFinished = false;

    const yoga = createYoga({
      logging: false,
      schema: createSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            hello: String
          }
        `,
        resolvers: {
          Query: {
            hello(_source: unknown, _args: unknown, _context: unknown, info: GraphQLResolveInfo) {
              (info as ResolveInfoWithAsyncHelpers).getAsyncHelpers().track([
                cleanup.promise.then(() => {
                  cleanupFinished = true;
                }),
              ]);
              return 'world';
            },
          },
        },
      }),
    });

    try {
      const response = await yoga.fetch('http://yoga/graphql', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          query: '{ hello }',
        }),
      });

      expect(await response.json()).toEqual({
        data: {
          hello: 'world',
        },
      });
      expect(cleanupFinished).toBe(false);

      let disposed = false;
      const disposePromise = Promise.resolve(yoga.dispose()).then(() => {
        disposed = true;
      });

      // Dispose must stay pending while tracked waitUntil work is unfinished.
      await new Promise<void>(resolve => setTimeout(resolve, 20));
      expect(disposed).toBe(false);
      expect(cleanupFinished).toBe(false);

      cleanup.resolve();
      await disposePromise;
      expect(disposed).toBe(true);
      expect(cleanupFinished).toBe(true);
    } finally {
      await yoga.dispose();
    }
  });
});
