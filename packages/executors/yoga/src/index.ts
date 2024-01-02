import { GraphQLSchema } from 'graphql';
import { Plugin } from 'graphql-yoga';
import { useExecutor as useEnvelopExecutor } from '@graphql-tools/executor-envelop';
import { Executor, isPromise, MaybePromise } from '@graphql-tools/utils';
import { schemaFromExecutor } from '@graphql-tools/wrap';

type Opts = Parameters<typeof schemaFromExecutor>[2] & {
  polling?: number;
};

export function useExecutor(
  executor: Executor,
  opts?: Opts,
): Plugin & { invalidateSupergraph: () => void } {
  let schema$: MaybePromise<GraphQLSchema> | undefined;
  let schema: GraphQLSchema | undefined;
  if (opts?.polling) {
    setInterval(() => {
      schema$ = undefined;
      schema = undefined;
    }, opts.polling);
  }
  return {
    onPluginInit({ addPlugin }) {
      addPlugin(
        // @ts-expect-error TODO: fix typings
        useEnvelopExecutor(executor),
      );
    },
    onRequestParse({ serverContext }) {
      return {
        onRequestParseDone() {
          if (!schema$) {
            schema$ ||= schemaFromExecutor(executor, serverContext, opts);
            if (isPromise(schema$)) {
              return schema$.then(newSchema => {
                schema = newSchema;
              }) as Promise<void>;
            }
          }
        },
      };
    },
    onEnveloped({ setSchema }) {
      if (!schema) {
        throw new Error(
          `You provide a promise of a schema but it hasn't been resolved yet. Make sure you use this plugin with GraphQL Yoga.`,
        );
      }
      setSchema(schema);
    },
    invalidateSupergraph() {
      schema$ = undefined;
      schema = undefined;
    },
  };
}
