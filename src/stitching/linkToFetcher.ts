import { parse } from 'graphql';
import { Fetcher, FetcherOperation } from './makeRemoteExecutableSchema';

import {
  ApolloLink, // This import doesn't actually import code - only the types.
  makePromise,
  execute,
} from 'apollo-link';

export { execute } from 'apollo-link';

export default function linkToFetcher(link: ApolloLink): Fetcher {
  return (fetcherOperation: FetcherOperation) => {
    const linkOperation = {
      ...fetcherOperation,
      query: parse(fetcherOperation.query),
    };

    return makePromise(execute(link, linkOperation));
  };
}
