import { Plugin } from 'graphql-yoga';
import { Executor } from '@graphql-tools/utils';
import { schemaFromExecutor } from '@graphql-tools/wrap';
import { GraphQLSchema } from 'graphql';
import { useExecutor as useEnvelopExecutor } from '@graphql-tools/executor-envelop';

export function useExecutor(executor: Executor): Plugin {
  let schema: GraphQLSchema;
  return {
    onPluginInit({ addPlugin }) {
      addPlugin(
        // @ts-expect-error TODO: fix typings
        useEnvelopExecutor(executor)
      );
    },
    onRequestParse() {
      return {
        async onRequestParseDone() {
          if (!schema) {
            schema = await schemaFromExecutor(executor);
          }
        },
      };
    },
    onEnveloped({ setSchema }) {
      if (!schema) {
        throw new Error(
          `You provide a promise of a schema but it hasn't been resolved yet. Make sure you use this plugin with GraphQL Yoga.`
        );
      }
      setSchema(schema);
    },
  };
}
