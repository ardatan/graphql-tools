import { ApolloLink, toPromise, execute, ExecutionResult } from 'apollo-link';

import { Executor } from '@graphql-tools/schema-stitching';

export { execute } from 'apollo-link';

export function linkToExecutor(link: ApolloLink): Executor {
  return ({ document, variables, context, info }): Promise<ExecutionResult> =>
    toPromise(
      execute(link, {
        query: document,
        variables,
        context: {
          graphqlContext: context,
          graphqlResolveInfo: info,
        },
      })
    );
}
