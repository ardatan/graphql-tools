import { YogaInitialContext, type Plugin } from 'graphql-yoga';
import {
  ExecutorPluginExtras,
  ExecutorPluginOpts,
  useExecutor as useEnvelopExecutor,
} from '@graphql-tools/executor-envelop';
import { Executor } from '@graphql-tools/utils';

export function useExecutor(
  executor: Executor,
  opts?: ExecutorPluginOpts,
): Plugin & ExecutorPluginExtras {
  let logWarn = opts?.logWarn || ((message: any) => console.warn(message));
  const envelopPlugin = useEnvelopExecutor<YogaInitialContext>(executor, {
    ...opts,
    logWarn(...args) {
      return logWarn(...args);
    },
  });
  return {
    ...envelopPlugin,
    onRequestParse({ serverContext }) {
      // Prefer the request-scoped logger (carries requestId). See yoga v5→v6 migration.
      logWarn = (message?: any, ...args: any[]) => {
        serverContext.log.warn(typeof message === 'string' ? message : String(message), ...args);
      };
      return {
        onRequestParseDone() {
          envelopPlugin.ensureSchema(serverContext);
          if (envelopPlugin.pluginCtx.schemaSetPromise$) {
            return envelopPlugin.pluginCtx.schemaSetPromise$ as Promise<void>;
          }
        },
      };
    },
    onDispose() {
      const asyncDispose = executor[Symbol.asyncDispose];
      if (typeof asyncDispose === 'function') {
        return asyncDispose.call(executor);
      }
      const dispose = executor[Symbol.dispose];
      if (typeof dispose === 'function') {
        return dispose.call(executor);
      }
    },
  };
}
