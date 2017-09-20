import { mapValues, isEmpty, values } from 'lodash';
import { printSchema, print, ExecutionResult, Kind, ValueNode } from 'graphql';
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
import { IResolvers, IResolverObject } from '../Interfaces';
import { makeExecutableSchema } from '../schemaGenerator';
import resolveParentFromTypename from './resolveFromParentTypename';

export type Fetcher = (
  operation: {
    query: string;
    operationName?: string;
    variables?: { [key: string]: any };
    context?: { [key: string]: any };
  },
) => Promise<ExecutionResult>;

export default function addSimpleRoutingResolvers(
  schema: GraphQLSchema,
  fetcher: Fetcher,
): GraphQLSchema {
  const queryType = schema.getQueryType();
  const queries = queryType.getFields();
  const queryResolvers: IResolverObject = mapValues(queries, () =>
    createResolver(fetcher),
  );
  let mutationResolvers: IResolverObject = {};
  const mutationType = schema.getMutationType();
  if (mutationType) {
    const mutations = mutationType.getFields();
    mutationResolvers = mapValues(mutations, () => createResolver(fetcher));
  }

  const resolvers: IResolvers = { [queryType.name]: queryResolvers };

  if (!isEmpty(mutationResolvers)) {
    resolvers[mutationType.name] = mutationResolvers;
  }

  const types = values(schema.getTypeMap());
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

function createResolver(fetcher: Fetcher): GraphQLFieldResolver<any, any> {
  return async (root, args, context, info) => {
    const operation = print(info.operation);
    const fragments = values(info.fragments)
      .map(fragment => print(fragment))
      .join('\n');
    const query = `${operation}\n${fragments}`;
    const result = await fetcher({
      query,
      variables: info.variableValues,
      context,
    });
    const fieldName = info.fieldNodes[0].alias
      ? info.fieldNodes[0].alias.value
      : info.fieldName;
    if (result.errors || !result.data[fieldName]) {
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
