import { Fetcher, FetcherOperation } from './makeRemoteExecutableSchema';

import {
  ApolloLink, // This import doesn't actually import code - only the types.
  makePromise,
  execute,
} from 'apollo-link';

export { execute } from 'apollo-link';

export default function linkToFetcher(link: ApolloLink): Fetcher {
  return (fetcherOperation: FetcherOperation) => {
    return makePromise(execute(link, fetcherOperation));
  };
}
