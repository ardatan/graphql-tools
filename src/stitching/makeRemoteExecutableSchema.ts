import { printSchema, print, Kind, ValueNode, ExecutionResult } from 'graphql';
import { execute, makePromise, ApolloLink, Observable } from 'apollo-link';

import {
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
} from 'graphql';
import isEmptyObject from '../isEmptyObject';
import { IResolvers, IResolverObject } from '../Interfaces';
import { makeExecutableSchema } from '../schemaGenerator';
import resolveParentFromTypename from './resolveFromParentTypename';

export type Fetcher = (
  operation: {
    query: string;
    operationName?: string;
    variables?: { [key: string]: any };
    context?: { [key: string]: any };
  }
) => Promise<ExecutionResult>;

export type LinkContextCreator = (
  context: { [key: string]: any }
) => { [key: string]: any };

export const fetcherToLink = (fetcher: Fetcher): ApolloLink => {
  return new ApolloLink(operation => {
    return new Observable(observer => {
      const { query, operationName, variables } = operation;
      const context = operation.getContext();
      fetcher({
        query: typeof query === 'string' ? query : print(query),
        operationName,
        variables,
        context,
      })
        .then((result: ExecutionResult) => {
          observer.next(result);
          observer.complete();
        })
        .catch(observer.error.bind(observer));
    });
  });
};

export default function makeRemoteExecutableSchema({
  schema,
  link,
  fetcher,
  linkContext,
}: {
  schema: GraphQLSchema;
  link?: ApolloLink;
  fetcher?: Fetcher;
  linkContext?: LinkContextCreator;
}): GraphQLSchema {
  if (fetcher && !link) {
    link = fetcherToLink(fetcher);
  }

  const queryType = schema.getQueryType();
  const queries = queryType.getFields();
  const queryResolvers: IResolverObject = {};
  Object.keys(queries).forEach(key => {
    queryResolvers[key] = createResolver(link, linkContext);
  });
  let mutationResolvers: IResolverObject = {};
  const mutationType = schema.getMutationType();
  if (mutationType) {
    const mutations = mutationType.getFields();
    Object.keys(mutations).forEach(key => {
      mutationResolvers[key] = createResolver(link, linkContext);
    });
  }

  const resolvers: IResolvers = { [queryType.name]: queryResolvers };

  if (!isEmptyObject(mutationResolvers)) {
    resolvers[mutationType.name] = mutationResolvers;
  }

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
        resolvers[type.name] = createPassThroughScalar(type);
      }
    }
  }

  const typeDefs = printSchema(schema);

  return makeExecutableSchema({
    typeDefs,
    resolvers,
  });
}

function createResolver(
  link: ApolloLink,
  linkContext: LinkContextCreator
): GraphQLFieldResolver<any, any> {
  return async (root, args, context, info) => {
    const fragments = Object.keys(info.fragments).map(
      fragment => info.fragments[fragment]
    );
    const document = {
      kind: Kind.DOCUMENT,
      definitions: [info.operation, ...fragments],
    };
    let contextForLink = {};
    if (linkContext && typeof linkContext === 'function') {
      contextForLink = linkContext(context);
    }
    const result = await makePromise(
      execute(link, {
        query: document,
        variables: info.variableValues,
        context: contextForLink,
      })
    );
    const fieldName = info.fieldNodes[0].alias
      ? info.fieldNodes[0].alias.value
      : info.fieldName;
    if (result.errors) {
      const errorMessage = result.errors.map(error => error.message).join('\n');
      throw new Error(errorMessage);
    } else {
      return result.data[fieldName];
    }
  };
}

function createPassThroughScalar({
  name,
  description,
}: {
  name: string;
  description: string;
}): GraphQLScalarType {
  return new GraphQLScalarType({
    name: name,
    description: description,
    serialize(value) {
      return value;
    },
    parseValue(value) {
      return value;
    },
    parseLiteral(ast) {
      return parseLiteral(ast);
    },
  });
}

function parseLiteral(ast: ValueNode): any {
  switch (ast.kind) {
    case Kind.STRING:
    case Kind.BOOLEAN: {
      return ast.value;
    }
    case Kind.INT:
    case Kind.FLOAT: {
      return parseFloat(ast.value);
    }
    case Kind.OBJECT: {
      const value = Object.create(null);
      ast.fields.forEach(field => {
        value[field.name.value] = parseLiteral(field.value);
      });

      return value;
    }
    case Kind.LIST: {
      return ast.values.map(parseLiteral);
    }
    default:
      return null;
  }
}
