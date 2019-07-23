import { Fetcher, IFetcherOperation } from '../Interfaces';

import {
  ApolloLink, // This import doesn't actually import code - only the types.
  makePromise,
  execute,
  GraphQLRequest,
} from 'apollo-link';

export { execute } from 'apollo-link';

export default function linkToFetcher(link: ApolloLink): Fetcher {
  return (fetcherOperation: IFetcherOperation) => {
    return makePromise(execute(link, fetcherOperation as GraphQLRequest));
  };
}
