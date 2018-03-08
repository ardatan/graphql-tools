import { parse } from 'graphql';
import { Fetcher, FetcherOperation } from './makeRemoteExecutableSchema';

// This import doesn't actually import code - only the types.
// Don't use ApolloLink to actually construct a link here.
import {
  ApolloLink,
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
