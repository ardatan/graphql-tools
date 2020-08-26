/* eslint-disable promise/param-names */
import {
  parse,
  graphql,
  subscribe,
  graphqlSync,
} from 'graphql';
import { PubSub } from 'graphql-subscriptions';

import { makeExecutableSchema, addSchemaLevelResolver } from '@graphql-tools/schema';

import { ExecutionResult } from '@graphql-tools/utils';

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
    let schema = makeExecutableSchema({ typeDefs, resolvers });
    let schemaLevelResolverCalls = 0;
    schema = addSchemaLevelResolver(schema, (root) => {
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

    test('should isolate roots from the different operation types', async () => {
      schemaLevelResolverCalls = 0;
      const queryRoot = 'queryRoot';
      const mutationRoot = 'mutationRoot';
      const subscriptionRoot = 'subscriptionRoot';
      const subscriptionRoot2 = 'subscriptionRoot2';

      const sub = await subscribe(
        schema,
        parse(`
          subscription TestSubscription {
            printRoot
          }
        `),
      ) as AsyncIterableIterator<ExecutionResult>;

      const payload1 = sub.next();
      await pubsub.publish('printRootChannel', { printRoot: subscriptionRoot });

      expect(await payload1).toEqual({ done: false, value: { data: { printRoot: subscriptionRoot } } });
      expect(schemaLevelResolverCalls).toEqual(1);

      const queryResult = await graphql(
        schema,
        `
          query TestQuery {
            printRoot
          }
        `,
        queryRoot,
      );

      expect(queryResult).toEqual({ data: { printRoot: queryRoot } });
      expect(schemaLevelResolverCalls).toEqual(2);

      const mutationResult = await graphql(
        schema,
        `
          mutation TestMutation {
            printRoot
          }
        `,
        mutationRoot,
      );

      expect(mutationResult).toEqual({ data: { printRoot: mutationRoot } });
      expect(schemaLevelResolverCalls).toEqual(3);

      await pubsub.publish('printRootChannel', { printRoot: subscriptionRoot2 });

      expect(await sub.next()).toEqual({ done: false, value: { data: { printRoot: subscriptionRoot2 } } });
      expect(schemaLevelResolverCalls).toEqual(4);
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
