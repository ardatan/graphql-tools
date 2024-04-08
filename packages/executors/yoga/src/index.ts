import type { Plugin } from 'graphql-yoga';
import {
  ExecutorPluginOpts,
  useExecutor as useEnvelopExecutor,
} from '@graphql-tools/executor-envelop';
import { Executor } from '@graphql-tools/utils';

export function useExecutor(
  executor: Executor,
  opts?: ExecutorPluginOpts,
): Plugin & { invalidateSupergraph: () => void } {
  const envelopPlugin = useEnvelopExecutor(executor, opts);
  return {
    onPluginInit({ addPlugin }) {
      addPlugin(
        // @ts-expect-error TODO: fix typings
        envelopPlugin,
      );
    },
    onRequestParse({ serverContext }) {
      return {
        onRequestParseDone() {
          envelopPlugin.ensureSchema(serverContext);
          if (envelopPlugin.pluginCtx.schemaSetPromise$) {
            return envelopPlugin.pluginCtx.schemaSetPromise$ as Promise<void>;
          }
        },
      };
    },
    invalidateSupergraph: envelopPlugin.invalidateSupergraph,
  };
}
