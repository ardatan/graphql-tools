import {
  GraphQLSchema,
  DocumentNode,
  getIntrospectionQuery,
  buildClientSchema,
  parse,
  IntrospectionQuery,
} from 'graphql';

import { AsyncExecutor, SyncExecutor, ExecutionResult } from '@graphql-tools/utils';

import { combineErrors } from '../delegate/errors';

function getSchemaFromIntrospection(introspectionResult: ExecutionResult<IntrospectionQuery>): GraphQLSchema {
  if (
    (Array.isArray(introspectionResult.errors) && introspectionResult.errors.length) ||
    !introspectionResult.data.__schema
  ) {
    if (Array.isArray(introspectionResult.errors)) {
      const combinedError: Error = combineErrors(introspectionResult.errors);
      throw combinedError;
    } else {
      throw new Error('Could not obtain introspection result, received: ' + JSON.stringify(introspectionResult));
    }
  } else {
    return buildClientSchema(introspectionResult.data);
  }
}

export async function introspectSchema(executor: AsyncExecutor, context?: Record<string, any>): Promise<GraphQLSchema> {
  const parsedIntrospectionQuery: DocumentNode = parse(getIntrospectionQuery());
  const introspectionResult = await executor<IntrospectionQuery>({
    document: parsedIntrospectionQuery,
    context,
  });
  return getSchemaFromIntrospection(introspectionResult);
}

export function introspectSchemaSync(executor: SyncExecutor, context?: Record<string, any>): GraphQLSchema {
  const parsedIntrospectionQuery: DocumentNode = parse(getIntrospectionQuery());
  const introspectionResult = executor<IntrospectionQuery>({
    document: parsedIntrospectionQuery,
    context,
  });
  if ('then' in introspectionResult) {
    throw new Error(`Executor cannot return promise value in introspectSchemaSync!`);
  }
  return getSchemaFromIntrospection(introspectionResult);
}
