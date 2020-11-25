import {
  GraphQLSchema,
  DocumentNode,
  getIntrospectionQuery,
  buildClientSchema,
  parse,
  IntrospectionOptions,
  IntrospectionQuery,
} from 'graphql';

import { ExecutionResult } from '@graphql-tools/utils';
import { AsyncExecutor, Executor, SyncExecutor } from '@graphql-tools/delegate';
import AggregateError from '@ardatan/aggregate-error';
import isPromise from 'is-promise';

function getSchemaFromIntrospection(introspectionResult: ExecutionResult<IntrospectionQuery>): GraphQLSchema {
  if (introspectionResult?.data?.__schema) {
    return buildClientSchema(introspectionResult.data);
  } else if (introspectionResult?.errors?.length) {
    if (introspectionResult.errors.length > 1) {
      const combinedError = new AggregateError(introspectionResult.errors);
      throw combinedError;
    }
    const error = introspectionResult.errors[0];
    throw error.originalError || error;
  } else {
    throw new Error('Could not obtain introspection result, received: ' + JSON.stringify(introspectionResult));
  }
}

export function introspectSchema<TExecutor extends AsyncExecutor | SyncExecutor>(
  executor: TExecutor,
  context?: Record<string, any>,
  options?: IntrospectionOptions
): TExecutor extends AsyncExecutor ? Promise<GraphQLSchema> : GraphQLSchema {
  const parsedIntrospectionQuery: DocumentNode = parse(getIntrospectionQuery(options));
  const introspectionResult = (executor as Executor)<IntrospectionQuery>({
    document: parsedIntrospectionQuery,
    context,
  });
  if (isPromise(introspectionResult)) {
    return introspectionResult.then(introspection => getSchemaFromIntrospection(introspection)) as any;
  }
  return getSchemaFromIntrospection(introspectionResult) as any;
}
