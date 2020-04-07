import { ApolloLink } from 'apollo-link';
import {
  GraphQLFieldResolver,
  GraphQLSchema,
  Kind,
  GraphQLResolveInfo,
  BuildSchemaOptions,
  DocumentNode,
} from 'graphql';

import { Fetcher } from '../Interfaces';
import { buildSchema } from '../polyfills/index';
import { addTypenameToAbstract } from '../delegate/addTypenameToAbstract';
import { checkResultAndHandleErrors } from '../delegate/checkResultAndHandleErrors';

import linkToFetcher, { execute } from '../stitch/linkToFetcher';
import { observableToAsyncIterable } from '../stitch/observableToAsyncIterable';
import mapAsyncIterator from '../stitch/mapAsyncIterator';

import { wrapSchema } from './wrapSchema';

export type ResolverFn = (
  rootValue?: any,
  args?: any,
  context?: any,
  info?: GraphQLResolveInfo,
) => AsyncIterator<any>;

export default function makeRemoteExecutableSchema({
  schema: schemaOrTypeDefs,
  link,
  fetcher,
  createResolver = defaultCreateRemoteResolver,
  createSubscriptionResolver = defaultCreateRemoteSubscriptionResolver,
  buildSchemaOptions,
}: {
  schema: GraphQLSchema | string;
  link?: ApolloLink;
  fetcher?: Fetcher;
  createResolver?: (fetcher: Fetcher) => GraphQLFieldResolver<any, any>;
  createSubscriptionResolver?: (
    link: ApolloLink,
  ) => GraphQLFieldResolver<any, any>;
  buildSchemaOptions?: BuildSchemaOptions;
}): GraphQLSchema {
  let finalFetcher: Fetcher = fetcher;

  if (finalFetcher == null && link != null) {
    finalFetcher = linkToFetcher(link);
  }

  const targetSchema =
    typeof schemaOrTypeDefs === 'string'
      ? buildSchema(schemaOrTypeDefs, buildSchemaOptions)
      : schemaOrTypeDefs;

  return wrapSchema({
    schema: targetSchema,
    createProxyingResolver: (_schema, _transforms, operation) => {
      if (operation === 'query' || operation === 'mutation') {
        return createResolver(finalFetcher);
      }
      return createSubscriptionResolver(link);
    },
  });
}

export function defaultCreateRemoteResolver(
  fetcher: Fetcher,
): GraphQLFieldResolver<any, any> {
  return async (_root, _args, context, info) => {
    const fragments = Object.keys(info.fragments).map(
      (fragment) => info.fragments[fragment],
    );
    let query: DocumentNode = {
      kind: Kind.DOCUMENT,
      definitions: [info.operation, ...fragments],
    };

    query = addTypenameToAbstract(info.schema, query);

    const result = await fetcher({
      query,
      variables: info.variableValues,
      context: { graphqlContext: context },
    });
    return checkResultAndHandleErrors(result, context, info);
  };
}

export function defaultCreateRemoteSubscriptionResolver(
  link: ApolloLink,
): GraphQLFieldResolver<any, any> {
  return (_root, _args, context, info) => {
    const fragments = Object.keys(info.fragments).map(
      (fragment) => info.fragments[fragment],
    );
    let query: DocumentNode = {
      kind: Kind.DOCUMENT,
      definitions: [info.operation, ...fragments],
    };

    query = addTypenameToAbstract(info.schema, query);

    const operation = {
      query,
      variables: info.variableValues,
      context: { graphqlContext: context },
    };

    const observable = execute(link, operation);
    const originalAsyncIterator = observableToAsyncIterable(observable);
    return mapAsyncIterator(originalAsyncIterator, (result) => ({
      [info.fieldName]: checkResultAndHandleErrors(result, context, info),
    }));
  };
}
