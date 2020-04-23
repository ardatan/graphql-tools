import { ApolloLink } from 'apollo-link';
import {
  GraphQLSchema,
  DocumentNode,
  getIntrospectionQuery,
  buildClientSchema,
  parse,
} from 'graphql';

import { Fetcher } from '../Interfaces';

import { combineErrors } from './errors';
import linkToFetcher from './linkToFetcher';

const parsedIntrospectionQuery: DocumentNode = parse(getIntrospectionQuery());

export default function introspectSchema(
  linkOrFetcher: ApolloLink | Fetcher,
  linkContext?: Record<string, any>,
): Promise<GraphQLSchema> {
  const fetcher =
    typeof linkOrFetcher === 'function'
      ? linkOrFetcher
      : linkToFetcher(linkOrFetcher);

  return fetcher({
    query: parsedIntrospectionQuery,
    context: linkContext,
  }).then((introspectionResult) => {
    if (
      (Array.isArray(introspectionResult.errors) &&
        introspectionResult.errors.length) ||
      !introspectionResult.data.__schema
    ) {
      if (Array.isArray(introspectionResult.errors)) {
        const combinedError: Error = combineErrors(introspectionResult.errors);
        throw combinedError;
      } else {
        throw new Error(
          'Could not obtain introspection result, received: ' +
            JSON.stringify(introspectionResult),
        );
      }
    } else {
      const schema = buildClientSchema(
        introspectionResult.data as {
          __schema: any;
        },
      );
      return schema;
    }
  });
}
