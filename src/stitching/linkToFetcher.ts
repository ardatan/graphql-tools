import { Fetcher, IFetcherOperation } from '../Interfaces';

import {
  ApolloLink,
  toPromise,
  execute,
  ExecutionResult,
} from 'apollo-link';

export { execute } from 'apollo-link';

export default function linkToFetcher(link: ApolloLink): Fetcher {
  return (fetcherOperation: IFetcherOperation): Promise<ExecutionResult> =>
    toPromise(execute(link, fetcherOperation));
}
