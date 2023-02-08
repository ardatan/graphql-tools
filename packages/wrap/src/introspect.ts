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
  MaybePromise,
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

export type SchemaFromExecutorOptions = Partial<IntrospectionOptions> &
  Parameters<typeof buildClientSchema>[1] &
  ParseOptions;

let hasWarned = false;

export const introspectSchema = function introspectSchema(...args) {
  if (!hasWarned) {
    hasWarned = true;
    console.warn(
      `\`introspectSchema\` is deprecated, and will be removed in the next major. Please use \`schemaFromExecutor\` instead.`
    );
  }
  return schemaFromExecutor(...(args as Parameters<typeof schemaFromExecutor>));
} as typeof schemaFromExecutor;

export function schemaFromExecutor(
  executor: SyncExecutor,
  context?: Record<string, any>,
  options?: SchemaFromExecutorOptions
): GraphQLSchema;
export function schemaFromExecutor(
  executor: AsyncExecutor,
  context?: Record<string, any>,
  options?: SchemaFromExecutorOptions
): Promise<GraphQLSchema>;
export function schemaFromExecutor(
  executor: Executor,
  context?: Record<string, any>,
  options?: SchemaFromExecutorOptions
): MaybePromise<GraphQLSchema>;
export function schemaFromExecutor(
  executor: Executor,
  context?: Record<string, any>,
  options?: SchemaFromExecutorOptions
): MaybePromise<GraphQLSchema> {
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
