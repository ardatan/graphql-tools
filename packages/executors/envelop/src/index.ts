import { ExecutionArgs, mapMaybePromise, Plugin } from '@envelop/core';
import { Executor, isPromise, MaybePromise } from '@graphql-tools/utils';
import { schemaFromExecutor } from '@graphql-tools/wrap';

type GraphQLSchema = any;

export interface ExecutorPluginContext {
  schema$?: MaybePromise<GraphQLSchema>;
  schema?: GraphQLSchema;
  schemaSetPromise$?: Promise<void>;
  skipIntrospection: boolean;
}

export type ExecutorPluginOpts = Parameters<typeof schemaFromExecutor>[2] & {
  polling?: number;
  logWarn?(...args: any[]): void;
};

export interface ExecutorPluginExtras {
  invalidateUnifiedGraph: () => void;
  pluginCtx: ExecutorPluginContext;
  ensureSchema(ctx?: any): void;
}

export function useExecutor<TPluginContext extends Record<string, any>>(
  executor: Executor,
  opts?: ExecutorPluginOpts,
): Plugin<TPluginContext> & ExecutorPluginExtras {
  const logWarn = opts?.logWarn || (message => console.warn(message));
  const EMPTY_ARRAY = Object.freeze([]);
  function executorToExecuteFn(executionArgs: ExecutionArgs) {
    return executor({
      document: executionArgs.document,
      rootValue: executionArgs.rootValue,
      context: executionArgs.contextValue,
      variables: executionArgs.variableValues,
      operationName: executionArgs.operationName,
    });
  }
  const pluginCtx: ExecutorPluginContext = {
    schema$: undefined,
    schema: undefined,
    schemaSetPromise$: undefined,
    skipIntrospection: false,
  };
  if (opts?.polling) {
    setInterval(() => {
      pluginCtx.schema$ = undefined;
      pluginCtx.schema = undefined;
    }, opts.polling);
  }
  function ensureSchema(ctx?: any) {
    if (pluginCtx.skipIntrospection) {
      return;
    }
    try {
      if (!pluginCtx.schema && !pluginCtx.schemaSetPromise$) {
        pluginCtx.schema$ ||= schemaFromExecutor(executor, ctx, opts);
        if (isPromise(pluginCtx.schema$)) {
          pluginCtx.schemaSetPromise$ = (
            pluginCtx.schema$.then(newSchema => {
              pluginCtx.schema = newSchema;
            }) as Promise<void>
          ).catch?.(err => {
            logWarn(`Introspection failed, skipping introspection due to the errors`, err);
            pluginCtx.skipIntrospection = true;
          });
        } else {
          pluginCtx.schema = pluginCtx.schema$;
        }
      }
    } catch (err) {
      pluginCtx.skipIntrospection = true;
      logWarn(`Introspection failed, skipping introspection due to the following errors`, err);
    }
  }
  return {
    onEnveloped({ context, setSchema }) {
      ensureSchema(context);
      if (pluginCtx.schema) {
        setSchema(pluginCtx.schema);
      }
    },
    onContextBuilding() {
      ensureSchema();
      if (pluginCtx.schemaSetPromise$) {
        return pluginCtx.schemaSetPromise$ as Promise<void>;
      }
    },
    onExecute({ args, setExecuteFn }) {
      if (args.schema) {
        pluginCtx.schema = args.schema;
        pluginCtx.schema$ = pluginCtx.schema;
      }
      ensureSchema(args.contextValue);
      return mapMaybePromise(pluginCtx.schemaSetPromise$, () => {
        setExecuteFn(executorToExecuteFn);
      });
    },
    onSubscribe({ args, setSubscribeFn }) {
      if (args.schema) {
        pluginCtx.schema = args.schema;
        pluginCtx.schema$ = pluginCtx.schema;
      }
      ensureSchema(args.contextValue);
      return mapMaybePromise(pluginCtx.schemaSetPromise$, () => {
        setSubscribeFn(executorToExecuteFn);
      });
    },
    onValidate({ params, context, setResult }) {
      if (params.schema) {
        pluginCtx.schema = params.schema;
        pluginCtx.schema$ = pluginCtx.schema;
      }
      ensureSchema(context);
      if (pluginCtx.schema?.[Symbol.toStringTag] !== 'GraphQLSchema') {
        setResult(EMPTY_ARRAY);
      }
    },
    pluginCtx,
    ensureSchema,
    invalidateUnifiedGraph() {
      pluginCtx.schema$ = undefined;
      pluginCtx.schema = undefined;
      pluginCtx.skipIntrospection = false;
    },
  };
}
