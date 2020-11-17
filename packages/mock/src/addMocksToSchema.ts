import {
  GraphQLSchema,
  GraphQLFieldResolver,
  defaultFieldResolver,
  GraphQLObjectType,
  GraphQLTypeResolver,
  isUnionType,
  GraphQLUnionType,
  GraphQLInterfaceType,
} from 'graphql';
import { mapSchema, MapperKind, IResolvers } from '@graphql-tools/utils';
import { addResolversToSchema } from '@graphql-tools/schema';
import { isRef, IMockStore, IMocks, TypePolicy } from './types';
import { copyOwnProps, isObject } from './utils';
import { createMockStore } from '.';

type IMockOptions = {
  schema: GraphQLSchema;
  store?: IMockStore;
  mocks?: IMocks;
  typePolicies?: {
    [typeName: string]: TypePolicy;
  };
  resolvers?: IResolvers | ((store: IMockStore) => IResolvers);
  /**
   * Set to `true` to prevent existing resolvers from being
   * overwritten to provide mock data. This can be used to mock some parts of the
   * server and not others.
   */
  preserveResolvers?: boolean;
};

// todo: add option to preserve resolver
/**
 * Given a `schema` and a `MockStore`, returns an executable schema that
 * will use the provided `MockStore` to execute queries.
 *
 * ```ts
 * const schema = buildSchema(`
 *  type User {
 *    id: ID!
 *    name: String!
 *  }
 *  type Query {
 *    me: User!
 *  }
 * `)
 *
 * const store = createMockStore({ schema });
 * const mockedSchema = addMocksToSchema({ schema, store });
 * ```
 *
 *
 * If a `resolvers` parameter is passed, the query execution will use
 * the provided `resolvers` if, one exists, instead of the default mock
 * resolver.
 *
 *
 * ```ts
 * const schema = buildSchema(`
 *   type User {
 *     id: ID!
 *     name: String!
 *   }
 *   type Query {
 *     me: User!
 *   }
 *   type Mutation {
 *     setMyName(newName: String!): User!
 *   }
 * `)
 *
 * const store = createMockStore({ schema });
 * const mockedSchema = addMocksToSchema({
 *   schema,
 *   store,
 *   resolvers: {
 *     Mutation: {
 *       setMyName: (_, { newName }) => {
 *          const ref = store.get('Query', 'ROOT', 'viewer');
 *          store.set(ref, 'name', newName);
 *          return ref;
 *       }
 *     }
 *   }
 *  });
 * ```
 *
 *
 * `Query` and `Mutation` type will use `key` `'ROOT'`.
 */
export function addMocksToSchema({
  schema,
  store: maybeStore,
  mocks,
  typePolicies,
  resolvers: resolversOrFnResolvers,
  preserveResolvers = false,
}: IMockOptions): GraphQLSchema {
  const store =
    maybeStore ||
    createMockStore({
      schema,
      mocks,
      typePolicies,
    });

  const resolvers =
    typeof resolversOrFnResolvers === 'function' ? resolversOrFnResolvers(store) : resolversOrFnResolvers;

  const mockResolver: GraphQLFieldResolver<any, any> = (source, args, contex, info) => {
    if (isRef(source)) {
      return store.get({
        typeName: source.$ref.typeName,
        key: source.$ref.key,
        fieldName: info.fieldName,
        fieldArgs: args,
      });
    }

    // we have to handle the root mutation and root query types differently,
    // because no resolver is called at the root
    if (isQueryOrMuationType(info.parentType, info.schema)) {
      return store.get({
        typeName: info.parentType.name,
        key: 'ROOT',
        fieldName: info.fieldName,
        fieldArgs: args,
      });
    }

    return defaultFieldResolver(source, args, contex, info);
  };

  const typeResolver: GraphQLTypeResolver<any, any> = data => {
    if (isRef(data)) {
      return data.$ref.typeName;
    }
  };

  const schemaWithMocks = mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: fieldConfig => {
      const oldResolver = fieldConfig.resolve;
      if (!preserveResolvers || !oldResolver) {
        return {
          ...fieldConfig,
          resolve: mockResolver,
        };
      }
      return {
        ...fieldConfig,
        resolve: async (rootObject, args, context, info) => {
          const [mockedValue, resolvedValue] = await Promise.all([
            mockResolver(rootObject, args, context, info),
            oldResolver(rootObject, args, context, info),
          ]);

          // In case we couldn't mock
          if (mockedValue instanceof Error) {
            // only if value was not resolved, populate the error.
            if (undefined === resolvedValue) {
              throw mockedValue;
            }
            return resolvedValue;
          }

          if (resolvedValue instanceof Date && mockedValue instanceof Date) {
            return undefined !== resolvedValue ? resolvedValue : mockedValue;
          }

          if (isObject(mockedValue) && isObject(resolvedValue)) {
            // Object.assign() won't do here, as we need to all properties, including
            // the non-enumerable ones and defined using Object.defineProperty
            const emptyObject = Object.create(Object.getPrototypeOf(resolvedValue));
            return copyOwnProps(emptyObject, resolvedValue, mockedValue);
          }
          return undefined !== resolvedValue ? resolvedValue : mockedValue;
        },
      };
    },
    [MapperKind.ABSTRACT_TYPE]: type => {
      if (preserveResolvers && type.resolveType != null && type.resolveType.length) {
        return;
      }
      if (isUnionType(type)) {
        return new GraphQLUnionType({
          ...type.toConfig(),
          resolveType: typeResolver,
        });
      } else {
        return new GraphQLInterfaceType({
          ...type.toConfig(),
          resolveType: typeResolver,
        });
      }
    },
  });

  return resolvers ? addResolversToSchema(schemaWithMocks, resolvers) : schemaWithMocks;
}

const isQueryOrMuationType = (type: GraphQLObjectType, schema: GraphQLSchema) => {
  const queryType = schema.getQueryType();
  const isOnQueryType = queryType != null && queryType.name === type.name;

  const mutationType = schema.getMutationType();
  const isOnMutationType = mutationType != null && mutationType.name === type.name;

  return isOnQueryType || isOnMutationType;
};
