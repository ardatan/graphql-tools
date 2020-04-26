import { ApolloLink, toPromise, execute, ExecutionResult } from 'apollo-link';

import { Executor } from '../Interfaces';

export { execute } from 'apollo-link';

export default function linkToExecutor(link: ApolloLink): Executor {
  return ({ document, variables, context, info }): Promise<ExecutionResult> =>
    toPromise(
      execute(link, {
        query: document,
        variables,
        context: {
          graphqlContext: context,
          graphqlResolveInfo: info,
        },
      }),
    );
}
