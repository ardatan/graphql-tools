import { assert } from 'chai';
import { makeExecutableSchema, addSchemaLevelResolveFunction } from '..';
import { parse, graphql, subscribe, ExecutionResult } from 'graphql';
import { PubSub } from 'graphql-subscriptions';
import { forAwaitEach } from 'iterall';

describe('Resolve', () => {
  describe('addSchemaLevelResolveFunction', () => {
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
    let schemaLevelResolveFunctionCalls = 0;
    addSchemaLevelResolveFunction(schema, root => {
      schemaLevelResolveFunctionCalls += 1;
      return root;
    });

    it('should run the schema level resolver once in a same query', () => {
      schemaLevelResolveFunctionCalls = 0;
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
        assert.deepEqual(data, {
          printRoot: root,
          printRootAgain: root,
        });
        assert.equal(schemaLevelResolveFunctionCalls, 1);
      });
    });

    it('should isolate roots from the different operation types', done => {
      schemaLevelResolveFunctionCalls = 0;
      const queryRoot = 'queryRoot';
      const mutationRoot = 'mutationRoot';
      const subscriptionRoot = 'subscriptionRoot';
      const subscriptionRoot2 = 'subscriptionRoot2';

      let subsCbkCalls = 0;
      const firstSubsTriggered = new Promise(resolveFirst => {
        subscribe(
          schema,
          parse(`
            subscription TestSubscription {
              printRoot
            }
          `),
        )
          .then(results => {
            forAwaitEach(
              results as AsyncIterable<ExecutionResult>,
              (result: ExecutionResult) => {
                if (result.errors) {
                  return done(
                    new Error(
                      `Unexpected errors in GraphQL result: ${result.errors}`,
                    ),
                  );
                }

                const subsData = result.data;
                subsCbkCalls++;
                try {
                  if (subsCbkCalls === 1) {
                    assert.equal(schemaLevelResolveFunctionCalls, 1);
                    assert.deepEqual(subsData, { printRoot: subscriptionRoot });
                    return resolveFirst();
                  } else if (subsCbkCalls === 2) {
                    assert.equal(schemaLevelResolveFunctionCalls, 4);
                    assert.deepEqual(subsData, {
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
          }).then(() => {
            pubsub.publish('printRootChannel', { printRoot: subscriptionRoot });
          }).catch(done);
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
          assert.equal(schemaLevelResolveFunctionCalls, 2);
          assert.deepEqual(data, { printRoot: queryRoot });
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
          assert.equal(schemaLevelResolveFunctionCalls, 3);
          assert.deepEqual(mutationData, { printRoot: mutationRoot });
          pubsub.publish('printRootChannel', { printRoot: subscriptionRoot2 });
        })
        .catch(done);
    });
  });
});
