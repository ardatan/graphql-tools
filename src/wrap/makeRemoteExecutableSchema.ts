import { ApolloLink } from 'apollo-link';
import {
  GraphQLFieldResolver,
  GraphQLSchema,
  Kind,
  GraphQLResolveInfo,
  BuildSchemaOptions,
  DocumentNode,
} from 'graphql';

import { addResolversToSchema } from '../generate';
import { Fetcher, Operation } from '../Interfaces';
import { cloneSchema } from '../utils';
import { buildSchema } from '../polyfills';
import { addTypenameToAbstract } from '../delegate/addTypenameToAbstract';
import { checkResultAndHandleErrors } from '../delegate/checkResultAndHandleErrors';

import linkToFetcher, { execute } from '../stitch/linkToFetcher';
import { observableToAsyncIterable } from '../stitch/observableToAsyncIterable';
import mapAsyncIterator from '../stitch/mapAsyncIterator';
import { stripResolvers, generateProxyingResolvers } from '../stitch/resolvers';

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
  createResolver: customCreateResolver = createResolver,
  buildSchemaOptions,
}: {
  schema: GraphQLSchema | string;
  link?: ApolloLink;
  fetcher?: Fetcher;
  createResolver?: (fetcher: Fetcher) => GraphQLFieldResolver<any, any>;
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

  const remoteSchema = cloneSchema(targetSchema);
  stripResolvers(remoteSchema);

  function createProxyingResolver({
    operation,
  }: {
    operation: Operation;
  }): GraphQLFieldResolver<any, any> {
    if (operation === 'query' || operation === 'mutation') {
      return customCreateResolver(finalFetcher);
    }
    return createSubscriptionResolver(link);
  }

  addResolversToSchema({
    schema: remoteSchema,
    resolvers: generateProxyingResolvers({
      subschemaConfig: { schema: remoteSchema },
      createProxyingResolver,
    }),
    resolverValidationOptions: {
      allowResolversNotInSchema: true,
    },
  });

  return remoteSchema;
}

export function createResolver(
  fetcher: Fetcher,
): GraphQLFieldResolver<any, any> {
  return async (_root, _args, context, info) => {
    const fragments = Object.keys(info.fragments).map(
      fragment => info.fragments[fragment],
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

function createSubscriptionResolver(link: ApolloLink): ResolverFn {
  return (_root, _args, context, info) => {
    const fragments = Object.keys(info.fragments).map(
      fragment => info.fragments[fragment],
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
    return mapAsyncIterator(originalAsyncIterator, result => ({
      [info.fieldName]: checkResultAndHandleErrors(result, context, info),
    }));
  };
}
