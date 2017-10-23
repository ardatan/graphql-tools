import { print, parse } from 'graphql';
import { getOperationName } from 'apollo-utilities';
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

// Most code from below here is copied from apollo-link
// TODO - remove

function makePromise<R>(observable: Observable<R>): Promise<R> {
  let completed = false;
  return new Promise<R>((resolve, reject) => {
    observable.subscribe({
      next: data => {
        if (completed) {
          console.warn(
            `Promise Wrapper does not support multiple results from Observable`,
          );
        } else {
          completed = true;
          resolve(data);
        }
      },
      error: reject,
    });
  });
}

function execute(
  link: ApolloLink,
  operation: GraphQLRequest,
): Observable<FetchResult> {
  return (
    link.request(
      createOperation(
        operation.context,
        transformOperation(validateOperation(operation)),
      ),
    )
  );
}

function createOperation(starting: any, operation: GraphQLRequest): Operation {
  let context = { ...starting };
  const setContext = (next: any) => {
    if (typeof next === 'function') {
      context = next(context);
    } else {
      context = { ...next };
    }
  };
  const getContext = () => ({ ...context });

  Object.defineProperty(operation, 'setContext', {
    enumerable: false,
    value: setContext,
  });

  Object.defineProperty(operation, 'getContext', {
    enumerable: false,
    value: getContext,
  });

  Object.defineProperty(operation, 'toKey', {
    enumerable: false,
    value: () => getKey(operation),
  });

  return operation as Operation;
}

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

function getKey(operation: GraphQLRequest) {
  // XXX we're assuming here that variables will be serialized in the same order.
  // that might not always be true
  return `${print(operation.query)}|${JSON.stringify(
    operation.variables,
  )}|${operation.operationName}`;
}

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
