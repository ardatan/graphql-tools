import {
  GraphQLSchema,
  getIntrospectionQuery,
  buildClientSchema,
  parse,
  IntrospectionOptions,
  IntrospectionQuery,
  ParseOptions,
} from 'graphql';

import { ValueOrPromise } from 'value-or-promise';

import {
  AsyncExecutor,
  Executor,
  ExecutionResult,
  isAsyncIterable,
  SyncExecutor,
  AggregateError,
  createGraphQLError,
  inspect,
} from '@graphql-tools/utils';

function getSchemaFromIntrospection(
  introspectionResult: ExecutionResult<IntrospectionQuery>,
  options?: Parameters<typeof buildClientSchema>[1]
): GraphQLSchema {
  if (introspectionResult?.data?.__schema) {
    return buildClientSchema(introspectionResult.data, options);
  }
  if (introspectionResult?.errors) {
    const graphqlErrors = introspectionResult.errors.map(error => createGraphQLError(error.message, error));
    if (introspectionResult.errors.length === 1) {
      throw graphqlErrors[0];
    } else {
      throw new AggregateError(graphqlErrors, 'Could not obtain introspection result');
    }
  }
  throw createGraphQLError(
    `Could not obtain introspection result, received the following as response; \n ${inspect(introspectionResult)}`
  );
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
