import { ApolloLink } from 'apollo-link';
import { GraphQLFieldResolver, GraphQLSchema, buildSchema } from 'graphql';

import { Fetcher, IMakeRemoteExecutableSchemaOptions } from '../Interfaces';
import linkToFetcher from '../links/linkToFetcher';
import { delegateToSchema } from '../delegate';

import { wrapSchema } from './wrapSchema';

export default function makeRemoteExecutableSchema({
  schema: schemaOrTypeDefs,
  link,
  fetcher,
  createResolver = defaultCreateRemoteResolver,
  createSubscriptionResolver = defaultCreateRemoteSubscriptionResolver,
  buildSchemaOptions,
}: IMakeRemoteExecutableSchemaOptions): GraphQLSchema {
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
  return (_parent, _args, context, info) =>
    delegateToSchema({
      schema: { schema: info.schema, fetcher },
      context,
      info,
    });
}

export function defaultCreateRemoteSubscriptionResolver(
  link: ApolloLink,
): GraphQLFieldResolver<any, any> {
  return (_parent, _args, context, info) =>
    delegateToSchema({
      schema: { schema: info.schema, link },
      context,
      info,
    });
}
