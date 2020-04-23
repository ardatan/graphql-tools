import {
  parse,
  graphql,
  subscribe,
  ExecutionResult,
  graphqlSync,
} from 'graphql';
import { PubSub } from 'graphql-subscriptions';
import { forAwaitEach } from 'iterall';

import { makeExecutableSchema, addSchemaLevelResolver } from '..';

describe('Resolve', () => {
  describe('addSchemaLevelResolver', () => {
    const pubsub = new PubSub();
    const typeDefs = `
      type RootQuery {
        printRoot: String!
        printRootAgain: String!
      }

      type RootMutation {
        printRoot: String!
      }

      type RootSubscription {
        printRoot: String!
      }

      schema {
        query: RootQuery
        mutation: RootMutation
        subscription: RootSubscription
      }
    `;
    const printRoot = (root: any) => root.toString();
    const resolvers = {
      RootQuery: {
        printRoot,
        printRootAgain: printRoot,
      },
      RootMutation: {
        printRoot,
      },
      RootSubscription: {
        printRoot: {
          subscribe: () => pubsub.asyncIterator('printRootChannel'),
        },
      },
    };
    const schema = makeExecutableSchema({ typeDefs, resolvers });
    let schemaLevelResolverCalls = 0;
    addSchemaLevelResolver(schema, (root) => {
      schemaLevelResolverCalls += 1;
      return root;
    });

    test('should run the schema level resolver once in a same query', () => {
      schemaLevelResolverCalls = 0;
      const root = 'queryRoot';
      return graphql(
        schema,
        `
          query TestOnce {
            printRoot
            printRootAgain
          }
        `,
        root,
      ).then(({ data }) => {
        expect(data).toEqual({
          printRoot: root,
          printRootAgain: root,
        });
        expect(schemaLevelResolverCalls).toEqual(1);
      });
    });

    test('should isolate roots from the different operation types', (done) => {
      schemaLevelResolverCalls = 0;
      const queryRoot = 'queryRoot';
      const mutationRoot = 'mutationRoot';
      const subscriptionRoot = 'subscriptionRoot';
      const subscriptionRoot2 = 'subscriptionRoot2';

      let subsCbkCalls = 0;
      const firstSubsTriggered = new Promise((resolveFirst) => {
        subscribe(
          schema,
          parse(`
            subscription TestSubscription {
              printRoot
            }
          `),
        )
          .then((results) => {
            forAwaitEach(
              results as AsyncIterable<ExecutionResult>,
              (result: ExecutionResult) => {
                if (result.errors != null) {
                  return done(
                    new Error(
                      `Unexpected errors in GraphQL result: ${JSON.stringify(
                        result.errors,
                      )}`,
                    ),
                  );
                }

                const subsData = result.data;
                subsCbkCalls++;
                try {
                  if (subsCbkCalls === 1) {
                    expect(schemaLevelResolverCalls).toEqual(1);
                    expect(subsData).toEqual({ printRoot: subscriptionRoot });
                    return resolveFirst();
                  } else if (subsCbkCalls === 2) {
                    expect(schemaLevelResolverCalls).toEqual(4);
                    expect(subsData).toEqual({
                      printRoot: subscriptionRoot2,
                    });
                    return done();
                  }
                } catch (e) {
                  return done(e);
                }
                done(new Error('Too many subscription fired'));
              },
            ).catch(done);
          })
          .then(() =>
            pubsub.publish('printRootChannel', { printRoot: subscriptionRoot }),
          )
          .catch(done);
      });

      firstSubsTriggered
        .then(() =>
          graphql(
            schema,
            `
              query TestQuery {
                printRoot
              }
            `,
            queryRoot,
          ),
        )
        .then(({ data }) => {
          expect(schemaLevelResolverCalls).toEqual(2);
          expect(data).toEqual({ printRoot: queryRoot });
          return graphql(
            schema,
            `
              mutation TestMutation {
                printRoot
              }
            `,
            mutationRoot,
          );
        })
        .then(({ data: mutationData }) => {
          expect(schemaLevelResolverCalls).toEqual(3);
          expect(mutationData).toEqual({ printRoot: mutationRoot });
          return pubsub.publish('printRootChannel', {
            printRoot: subscriptionRoot2,
          });
        })
        .catch(done);
    });

    it('should not force an otherwise synchronous operation to be asynchronous', () => {
      const queryRoot = 'queryRoot';
      // This will throw an error if schema has any asynchronous resolvers
      graphqlSync(
        schema,
        `
          query TestQuery {
            printRoot
          }
        `,
        queryRoot,
      );
    });
  });
});
