import {
  IDelegateToSchemaOptions,
  RemoteSchemaExecutionConfig,
  Fetcher
} from '../Interfaces';
import { ApolloLink } from 'apollo-link';
import { observableToAsyncIterable } from './observableToAsyncIterable';
import linkToFetcher, { execute } from './linkToFetcher';
import delegateToSchema from './delegateToSchema';

export default function delegateToRemoteSchema(
  options: IDelegateToSchemaOptions & RemoteSchemaExecutionConfig
): Promise<any> {
  if (options.operation === 'query' || options.operation === 'mutation') {
    let fetcher: Fetcher;
    if (options.dispatcher) {
      const dynamicLinkOrFetcher = options.dispatcher(context);
      fetcher = (typeof dynamicLinkOrFetcher === 'function') ?
        dynamicLinkOrFetcher :
        linkToFetcher(dynamicLinkOrFetcher);
    } else if (options.link) {
      fetcher = linkToFetcher(options.link);
    } else {
      fetcher = options.fetcher;
    }

    if (!options.executor) {
      options.executor = ({ document, context, variables }) => fetcher({
        query: document,
        variables,
        context: { graphqlContext: context }
      });
    }

    return delegateToSchema(options);
  }

  if (options.operation === 'subscription') {
    let link: ApolloLink;
    if (options.dispatcher) {
      link = options.dispatcher(context) as ApolloLink;
    } else {
      link = options.link;
    }

    if (!options.subscriber) {
      options.subscriber = ({ document, context, variables }) => {
        const operation = {
          query: document,
          variables,
          context: { graphqlContext: context }
        };
        const observable = execute(link, operation);
        return observableToAsyncIterable(observable);
      };
    }

    return delegateToSchema(options);
  }
}
