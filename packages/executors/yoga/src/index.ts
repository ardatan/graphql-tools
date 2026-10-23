import { LegacyLogger, YogaInitialContext, type Plugin } from 'graphql-yoga';
import {
  ExecutorPluginExtras,
  ExecutorPluginOpts,
  useExecutor as useEnvelopExecutor,
} from '@graphql-tools/executor-envelop';
import { Executor } from '@graphql-tools/utils';
import { DisposableSymbols } from '@whatwg-node/disposablestack';

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
  let disposableSymbol: typeof DisposableSymbols.asyncDispose | typeof DisposableSymbols.dispose;
  if (executor[DisposableSymbols.asyncDispose]) {
    disposableSymbol = DisposableSymbols.asyncDispose;
  } else if (executor[DisposableSymbols.dispose]) {
    disposableSymbol = DisposableSymbols.dispose;
  }
  return {
    ...envelopPlugin,
    onYogaInit({ yoga }) {
      const legacyLogger = LegacyLogger.from(yoga.log);
      logWarn = (...args) => legacyLogger.warn(...args);
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
    [disposableSymbol]() {
      return executor[disposableSymbol]();
    },
  };
}
