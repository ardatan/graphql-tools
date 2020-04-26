import { ApolloLink, execute } from 'apollo-link';

import { Subscriber } from '../Interfaces';

import { observableToAsyncIterable } from './observableToAsyncIterable';

export { execute } from 'apollo-link';

export default function linkToSubscriber(link: ApolloLink): Subscriber {
  return ({
    document,
    variables,
    context,
    info,
  }) =>
    Promise.resolve(observableToAsyncIterable(execute(link, { query: document, variables, context: {
      graphqlContext: context,
      graphqlResolveInfo: info,
    } })));
}
