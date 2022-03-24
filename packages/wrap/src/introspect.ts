import {
  GraphQLSchema,
  getIntrospectionQuery,
  buildClientSchema,
  parse,
  IntrospectionOptions,
  IntrospectionQuery,
  ParseOptions,
  OperationTypeNode,
} from 'graphql';

import { ValueOrPromise } from 'value-or-promise';

import { AsyncExecutor, Executor, ExecutionResult, isAsyncIterable, SyncExecutor } from '@graphql-tools/utils';

function getSchemaFromIntrospection(
  introspectionResult: ExecutionResult<IntrospectionQuery>,
  options?: Parameters<typeof buildClientSchema>[1]
): GraphQLSchema {
  if (introspectionResult?.data?.__schema) {
    return buildClientSchema(introspectionResult.data, options);
  }
  throw new Error('Could not obtain introspection result, received: ' + JSON.stringify(introspectionResult));
}

export function introspectSchema(
  executor: SyncExecutor,
  context?: Record<string, any>,
  options?: Partial<IntrospectionOptions> & Parameters<typeof buildClientSchema>[1] & ParseOptions
): GraphQLSchema;
export function introspectSchema(
  executor: AsyncExecutor,
  context?: Record<string, any>,
  options?: Partial<IntrospectionOptions> & Parameters<typeof buildClientSchema>[1] & ParseOptions
): Promise<GraphQLSchema>;
export function introspectSchema(
  executor: Executor,
  context?: Record<string, any>,
  options?: Partial<IntrospectionOptions> & Parameters<typeof buildClientSchema>[1] & ParseOptions
): Promise<GraphQLSchema> | GraphQLSchema {
  const parsedIntrospectionQuery = parse(getIntrospectionQuery(options as any), options);
  return new ValueOrPromise(() =>
    executor({
      document: parsedIntrospectionQuery,
      context,
    })
  )
    .then(introspection => {
      if (isAsyncIterable(introspection)) {
        const iterator = introspection[Symbol.asyncIterator]();
        return iterator.next().then(({ value }) => value);
      }
      return introspection;
    })
    .then(introspection => getSchemaFromIntrospection(introspection, options))
    .resolve();
}
