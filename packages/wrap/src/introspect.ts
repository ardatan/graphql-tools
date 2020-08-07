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
import { AsyncExecutor, SyncExecutor } from '@graphql-tools/delegate';
import AggregateError from '@ardatan/aggregate-error';

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

export async function introspectSchema(
  executor: AsyncExecutor,
  context?: Record<string, any>,
  options?: IntrospectionOptions
): Promise<GraphQLSchema> {
  const parsedIntrospectionQuery: DocumentNode = parse(getIntrospectionQuery(options));
  const introspectionResult = await executor<IntrospectionQuery>({
    document: parsedIntrospectionQuery,
    context,
  });
  return getSchemaFromIntrospection(introspectionResult);
}

export function introspectSchemaSync(
  executor: SyncExecutor,
  context?: Record<string, any>,
  options?: IntrospectionOptions
): GraphQLSchema {
  const parsedIntrospectionQuery: DocumentNode = parse(getIntrospectionQuery(options));
  const introspectionResult = executor<IntrospectionQuery>({
    document: parsedIntrospectionQuery,
    context,
  });
  if ('then' in introspectionResult) {
    throw new Error(`Executor cannot return promise value in introspectSchemaSync!`);
  }
  return getSchemaFromIntrospection(introspectionResult);
}
