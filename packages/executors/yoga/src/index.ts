import { DisposableSymbols, YogaInitialContext, type Plugin } from 'graphql-yoga';
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
  const envelopPlugin = useEnvelopExecutor<YogaInitialContext>(executor, opts);
  let disposableSymbol: typeof DisposableSymbols.asyncDispose | typeof DisposableSymbols.dispose;
  if (executor[DisposableSymbols.asyncDispose]) {
    disposableSymbol = DisposableSymbols.asyncDispose;
  } else if (executor[DisposableSymbols.dispose]) {
    disposableSymbol = DisposableSymbols.dispose;
  }
  return {
    ...envelopPlugin,
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
    [disposableSymbol]() {
      return executor[disposableSymbol]();
    },
  };
}
