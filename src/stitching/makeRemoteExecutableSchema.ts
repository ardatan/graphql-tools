// This import doesn't actually import code - only the types.
// Don't use ApolloLink to actually construct a link here.
import { ApolloLink } from 'apollo-link';

import {
  GraphQLObjectType,
  GraphQLFieldResolver,
  GraphQLSchema,
  GraphQLInterfaceType,
  GraphQLUnionType,
  GraphQLID,
  GraphQLString,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLInt,
  GraphQLScalarType,
  ExecutionResult,
  buildSchema,
  printSchema,
  Kind,
  GraphQLResolveInfo,
  DocumentNode
} from 'graphql';
import linkToFetcher, { execute } from './linkToFetcher';
import isEmptyObject from '../isEmptyObject';
import { IResolvers, IResolverObject } from '../Interfaces';
import { makeExecutableSchema } from '../schemaGenerator';
import { recreateType } from './schemaRecreation';
import resolveParentFromTypename from './resolveFromParentTypename';
import defaultMergedResolver from './defaultMergedResolver';
import { checkResultAndHandleErrors } from './errors';
import { observableToAsyncIterable } from './observableToAsyncIterable';

export type ResolverFn = (
  rootValue?: any,
  args?: any,
  context?: any,
  info?: GraphQLResolveInfo,
) => AsyncIterator<any>;

export type Fetcher = (operation: FetcherOperation) => Promise<ExecutionResult>;

export type FetcherOperation = {
  query: DocumentNode;
  operationName?: string;
  variables?: { [key: string]: any };
  context?: { [key: string]: any };
};

export default function makeRemoteExecutableSchema({
  schema,
  link,
  fetcher,
}: {
  schema: GraphQLSchema | string;
  link?: ApolloLink;
  fetcher?: Fetcher;
}): GraphQLSchema {
  if (!fetcher && link) {
    fetcher = linkToFetcher(link);
  }

  let typeDefs: string;

  if (typeof schema === 'string') {
    typeDefs = schema;
    schema = buildSchema(typeDefs);
  } else {
    typeDefs = printSchema(schema);
  }

  // prepare query resolvers
  const queryResolvers: IResolverObject = {};
  const queryType = schema.getQueryType();
  const queries = queryType.getFields();
  Object.keys(queries).forEach(key => {
    queryResolvers[key] = createResolver(fetcher);
  });

  // prepare mutation resolvers
  const mutationResolvers: IResolverObject = {};
  const mutationType = schema.getMutationType();
  if (mutationType) {
    const mutations = mutationType.getFields();
    Object.keys(mutations).forEach(key => {
      mutationResolvers[key] = createResolver(fetcher);
    });
  }

  // prepare subscription resolvers
  const subscriptionResolvers: IResolverObject = {};
  const subscriptionType = schema.getSubscriptionType();
  if (subscriptionType) {
    const subscriptions = subscriptionType.getFields();
    Object.keys(subscriptions).forEach(key => {
      subscriptionResolvers[key] = {
        subscribe: createSubscriptionResolver(key, link),
      };
    });
  }

  // merge resolvers into resolver map
  const resolvers: IResolvers = { [queryType.name]: queryResolvers };

  if (!isEmptyObject(mutationResolvers)) {
    resolvers[mutationType.name] = mutationResolvers;
  }

  if (!isEmptyObject(subscriptionResolvers)) {
    resolvers[subscriptionType.name] = subscriptionResolvers;
  }

  // add missing abstract resolvers (scalar, unions, interfaces)
  const typeMap = schema.getTypeMap();
  const types = Object.keys(typeMap).map(name => typeMap[name]);
  for (const type of types) {
    if (
      type instanceof GraphQLInterfaceType ||
      type instanceof GraphQLUnionType
    ) {
      resolvers[type.name] = {
        __resolveType(parent, context, info) {
          return resolveParentFromTypename(parent, info.schema);
        },
      };
    } else if (type instanceof GraphQLScalarType) {
      if (
        !(
          type === GraphQLID ||
          type === GraphQLString ||
          type === GraphQLFloat ||
          type === GraphQLBoolean ||
          type === GraphQLInt
        )
      ) {
        resolvers[type.name] = recreateType(
          type,
          (name: string) => null,
          false,
        ) as GraphQLScalarType;
      }
    } else if (
      type instanceof GraphQLObjectType &&
      type.name.slice(0, 2) !== '__' &&
      type !== queryType &&
      type !== mutationType &&
      type !== subscriptionType
    ) {
      const resolver = {};
      Object.keys(type.getFields()).forEach(field => {
        resolver[field] = defaultMergedResolver;
      });
      resolvers[type.name] = resolver;
    }
  }

  return makeExecutableSchema({
    typeDefs,
    resolvers,
  });
}

function createResolver(fetcher: Fetcher): GraphQLFieldResolver<any, any> {
  return async (root, args, context, info) => {
    const fragments = Object.keys(info.fragments).map(
      fragment => info.fragments[fragment],
    );
    const document = {
      kind: Kind.DOCUMENT,
      definitions: [info.operation, ...fragments],
    };
    const result = await fetcher({
      query: document,
      variables: info.variableValues,
      context: { graphqlContext: context },
    });
    return checkResultAndHandleErrors(result, info);
  };
}

function createSubscriptionResolver(
  name: string,
  link: ApolloLink,
): ResolverFn {
  return (root, args, context, info) => {
    const fragments = Object.keys(info.fragments).map(
      fragment => info.fragments[fragment],
    );
    const document = {
      kind: Kind.DOCUMENT,
      definitions: [info.operation, ...fragments],
    };

    const operation = {
      query: document,
      variables: info.variableValues,
      context: { graphqlContext: context },
    };

    const observable = execute(link, operation);

    return observableToAsyncIterable(observable);
  };
}
