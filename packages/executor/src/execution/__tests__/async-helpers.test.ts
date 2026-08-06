import { setTimeout } from 'timers/promises';
import { createSchema, createYoga } from 'graphql-yoga';
import { createDeferred, fakePromise, GraphQLResolveInfo } from '@graphql-tools/utils';
import { patchSymbols } from '@whatwg-node/disposablestack';

patchSymbols();

describe('getAsyncHelpers().track with Yoga', () => {
  it('registers tracked work with Yoga waitUntil so dispose waits for it', async () => {
    const deferred = createDeferred<void>();

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
              info.getAsyncHelpers().track([deferred.promise]);
              return 'world';
            },
          },
        },
      }),
    });

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

    let disposed = false;
    const dispose$ = fakePromise()
      .then(() => yoga.dispose())
      .then(() => {
        disposed = true;
      });

    expect(disposed).toBe(false);

    deferred.resolve();

    await setTimeout(0);

    expect(disposed).toBe(true);

    return dispose$;
  });
});
