import { ApolloLink, toPromise, execute, ExecutionResult } from 'apollo-link';

import { Fetcher, IFetcherOptions } from '../Interfaces';

export { execute } from 'apollo-link';

export default function linkToFetcher(link: ApolloLink): Fetcher {
  return ({
    query,
    operationName,
    variables,
    context,
  }: IFetcherOptions): Promise<ExecutionResult> =>
    toPromise(execute(link, { query, operationName, variables, context }));
}
