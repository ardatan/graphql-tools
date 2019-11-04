// This import doesn't actually import code - only the types.
// Don't use ApolloLink to actually construct a link here.
import { ApolloLink } from 'apollo-link';

import {
  GraphQLFieldResolver,
  GraphQLSchema,
  buildSchema,
  Kind,
  GraphQLResolveInfo,
  BuildSchemaOptions,
  DocumentNode,
} from 'graphql';
import linkToFetcher, { execute } from './linkToFetcher';
import { Fetcher, Operation } from '../Interfaces';
import { addTypenameToAbstract } from './addTypenameToAbstract';
import { checkResultAndHandleErrors } from './checkResultAndHandleErrors';
import { observableToAsyncIterable } from './observableToAsyncIterable';
import mapAsyncIterator from './mapAsyncIterator';
import { Options as PrintSchemaOptions } from 'graphql/utilities/schemaPrinter';
import { cloneSchema } from '../utils';
import { stripResolvers, generateProxyingResolvers } from './resolvers';
import { addResolveFunctionsToSchema } from '../generate';

export type ResolverFn = (
  rootValue?: any,
  args?: any,
  context?: any,
  info?: GraphQLResolveInfo
) => AsyncIterator<any>;

export default function makeRemoteExecutableSchema({
  schema: targetSchema,
  link,
  fetcher,
  createResolver: customCreateResolver = createResolver,
  buildSchemaOptions,
  printSchemaOptions = { commentDescriptions: true }
}: {
  schema: GraphQLSchema | string;
  link?: ApolloLink;
  fetcher?: Fetcher;
  createResolver?: (fetcher: Fetcher) => GraphQLFieldResolver<any, any>;
  buildSchemaOptions?: BuildSchemaOptions;
  printSchemaOptions?: PrintSchemaOptions;
}): GraphQLSchema {
  if (!fetcher && link) {
    fetcher = linkToFetcher(link);
  }

  if (typeof targetSchema === 'string') {
    targetSchema = buildSchema(targetSchema, buildSchemaOptions);
  }

  const remoteSchema = cloneSchema(targetSchema);
  stripResolvers(remoteSchema);

  function createProxyingResolver(
    schema: GraphQLSchema,
    operation: Operation,
  ): GraphQLFieldResolver<any, any> {
    if (operation === 'query' || operation === 'mutation') {
      return customCreateResolver(fetcher);
    } else {
      return createSubscriptionResolver(link);
    }
  }

  addResolveFunctionsToSchema({
    schema: remoteSchema,
    resolvers: generateProxyingResolvers({ schema: remoteSchema }, createProxyingResolver),
    resolverValidationOptions: {
      allowResolversNotInSchema: true,
    },
  });

  return remoteSchema;
}

export function createResolver(fetcher: Fetcher): GraphQLFieldResolver<any, any> {
  return async (root, args, context, info) => {
    const fragments = Object.keys(info.fragments).map(fragment => info.fragments[fragment]);
    let query: DocumentNode = {
      kind: Kind.DOCUMENT,
      definitions: [info.operation, ...fragments]
    };

    query = addTypenameToAbstract(info.schema, query);

    const result = await fetcher({
      query,
      variables: info.variableValues,
      context: { graphqlContext: context }
    });
    return checkResultAndHandleErrors(result, info);
  };
}

function createSubscriptionResolver(link: ApolloLink): ResolverFn {
  return (root, args, context, info) => {
    const fragments = Object.keys(info.fragments).map(fragment => info.fragments[fragment]);
    let query: DocumentNode = {
      kind: Kind.DOCUMENT,
      definitions: [info.operation, ...fragments]
    };

    query = addTypenameToAbstract(info.schema, query);

    const operation = {
      query,
      variables: info.variableValues,
      context: { graphqlContext: context }
    };

    const observable = execute(link, operation);
    const originalAsyncIterator = observableToAsyncIterable(observable);
    return mapAsyncIterator(originalAsyncIterator, result => ({
      [info.fieldName]: checkResultAndHandleErrors(result, info),
    }));
  };
}
