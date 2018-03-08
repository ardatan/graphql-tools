import { parse } from 'graphql';
import { getOperationName } from 'apollo-utilities';
import { makePromise, createOperation } from 'apollo-link';
import { Fetcher, FetcherOperation } from './makeRemoteExecutableSchema';

// This import doesn't actually import code - only the types.
// Don't use ApolloLink to actually construct a link here.
import {
  ApolloLink,
  Operation,
  GraphQLRequest,
  Observable,
  FetchResult,
} from 'apollo-link';

export default function linkToFetcher(link: ApolloLink): Fetcher {
  return (fetcherOperation: FetcherOperation) => {
    const linkOperation = {
      ...fetcherOperation,
      query: parse(fetcherOperation.query),
    };

    return makePromise(execute(link, linkOperation));
  };
}

export function execute(
  link: ApolloLink,
  operation: GraphQLRequest,
): Observable<FetchResult> {
  return link.request(
    createOperation(
      operation.context,
      transformOperation(validateOperation(operation)),
    ),
  );
}

// Most code from below here is copied from apollo-link
// TODO this is also in `apollo-link` but is not exposed yet
function validateOperation(operation: GraphQLRequest): GraphQLRequest {
  const OPERATION_FIELDS = [
    'query',
    'operationName',
    'variables',
    'extensions',
    'context',
  ];

  if (!operation.query) {
    throw new Error('ApolloLink requires a query');
  }

  for (let key of Object.keys(operation)) {
    if (OPERATION_FIELDS.indexOf(key) < 0) {
      throw new Error(`illegal argument: ${key}`);
    }
  }

  return operation;
}

// TODO this is also in `apollo-link` but is not exposed yet
function transformOperation(operation: GraphQLRequest): GraphQLRequest {
  const transformedOperation: GraphQLRequest = {
    variables: operation.variables || {},
    extensions: operation.extensions || {},
    operationName: operation.operationName,
    query: operation.query,
  };

  // best guess at an operation name
  if (!transformedOperation.operationName) {
    transformedOperation.operationName =
      typeof transformedOperation.query !== 'string'
        ? getOperationName(transformedOperation.query)
        : '';
  }

  return transformedOperation as Operation;
}
