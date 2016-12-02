import { assert } from 'chai';
import {
  makeExecutableSchema,
  addSchemaLevelResolveFunction,
} from '..';
import { graphql } from 'graphql';
import { PubSub, SubscriptionManager } from 'graphql-subscriptions';

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
    const subscriptionRoot = 'subscriptionRoot';
    const resolvers = {
      RootQuery: {
        printRoot,
        printRootAgain: printRoot,
      },
      RootMutation: {
        printRoot: (root: any) => {
          pubsub.publish('printRoot', subscriptionRoot);
          return printRoot(root);
        },
      },
      RootSubscription: {
        printRoot,
      },
    };
    const schema = makeExecutableSchema({typeDefs, resolvers});
    let schemaLevelResolveFunctionCalls = 0;
    addSchemaLevelResolveFunction(schema, root => {
      schemaLevelResolveFunctionCalls += 1;
      return root;
    });
    const subcriptionManager = new SubscriptionManager({
      schema,
      pubsub,
      setupFunctions: {
        printRoot: () => ({
          printRoot: {
            filter: () => true,
          },
        }),
      },
    });

    it('should run the schema level resolver once in a same query', () => {
      schemaLevelResolveFunctionCalls = 0;
      const root = 'queryRoot';
      return graphql(schema, `
        query TestOnce {
          printRoot
          printRootAgain
        }
      `, root).then(({data}) => {
        assert.deepEqual(data, {
          printRoot: root,
          printRootAgain: root,
        });
        assert.equal(schemaLevelResolveFunctionCalls, 1);
      });
    });

    it('should isolate roots from the different operation types', () => {
      schemaLevelResolveFunctionCalls = 0;
      const queryRoot = 'queryRoot';
      const mutationRoot = 'mutationRoot';
      return graphql(schema, `
        query TestQuery {
          printRoot
        }
      `, queryRoot)
      .then(({data}) => {
        assert.deepEqual(data, {
          printRoot: queryRoot,
        });
        assert.equal(schemaLevelResolveFunctionCalls, 1);
        const subscribePromise = new Promise((resolve, reject) =>
          subcriptionManager.subscribe({
            query: `
              subscription TestSubscription {
                printRoot
              }
            `,
            operationName: 'TestSubscription',
            callback: (err: any, subsData: any) => {
              if (err) {
                return reject(err);
              }
              resolve(subsData);
            },
          })
        );
        return Promise.all([
          graphql(schema, `
            mutation TestMutation {
              printRoot
            }
          `, mutationRoot),
          subscribePromise,
        ]);
      })
      .then(([{data: mutationData}, {data: subsData}]) => {
        assert.deepEqual(mutationData, {
          printRoot: mutationRoot,
        });
        assert.deepEqual(subsData, {
          printRoot: subscriptionRoot,
        });
        assert.equal(schemaLevelResolveFunctionCalls, 3);
      });
    });
  });
});
