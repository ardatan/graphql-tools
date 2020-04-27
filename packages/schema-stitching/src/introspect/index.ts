import { GraphQLSchema, DocumentNode, getIntrospectionQuery, buildClientSchema, parse } from 'graphql';

import { Executor } from '../Interfaces';

import { combineErrors } from '../delegate/errors';

export async function introspectSchema(executor: Executor, context?: Record<string, any>): Promise<GraphQLSchema> {
  const parsedIntrospectionQuery: DocumentNode = parse(getIntrospectionQuery());
  const introspectionResult = await executor({
    document: parsedIntrospectionQuery,
    context,
  });
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
    const schema = buildClientSchema(
      introspectionResult.data as {
        __schema: any;
      }
    );
    return schema;
  }
}
