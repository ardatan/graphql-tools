import {
  GraphQLSchema,
  GraphQLFieldResolver,
  defaultFieldResolver,
  GraphQLTypeResolver,
  isUnionType,
  GraphQLUnionType,
  GraphQLInterfaceType,
  isSchema,
} from 'graphql';
import { mapSchema, MapperKind, IResolvers } from '@graphql-tools/utils';
import { addResolversToSchema } from '@graphql-tools/schema';
import { isRef, IMockStore, IMocks, TypePolicy } from './types.js';
import { copyOwnProps, isObject, isRootType } from './utils.js';
import { createMockStore } from './MockStore.js';

type IMockOptions<TResolvers = IResolvers> = {
  schema: GraphQLSchema;
  store?: IMockStore;
  mocks?: IMocks<TResolvers>;
  typePolicies?: {
    [typeName: string]: TypePolicy;
  };
  resolvers?: Partial<TResolvers> | ((store: IMockStore) => Partial<TResolvers>);
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
export function addMocksToSchema<TResolvers = IResolvers>({
  schema,
  store: maybeStore,
  mocks,
  typePolicies,
  resolvers: resolversOrFnResolvers,
  preserveResolvers = false,
}: IMockOptions<TResolvers>): GraphQLSchema {
  if (!schema) {
    throw new Error('Must provide schema to mock');
  }
  if (!isSchema(schema)) {
    throw new Error('Value at "schema" must be of type GraphQLSchema');
  }
  if (mocks && !isObject(mocks)) {
    throw new Error('mocks must be of type Object');
  }

  const store =
    maybeStore ||
    createMockStore({
      schema,
      mocks,
      typePolicies,
    });

  const resolvers =
    typeof resolversOrFnResolvers === 'function'
      ? (resolversOrFnResolvers as (store: IMockStore) => TResolvers)(store)
      : resolversOrFnResolvers;

  const mockResolver: GraphQLFieldResolver<any, any> = (source, args, contex, info) => {
    const defaultResolvedValue = defaultFieldResolver(source, args, contex, info);

    // priority to default resolved value
    if (defaultResolvedValue !== undefined) return defaultResolvedValue;

    if (isRef(source)) {
      return store.get({
        typeName: source.$ref.typeName,
        key: source.$ref.key,
        fieldName: info.fieldName,
        fieldArgs: args,
      });
    }

    // we have to handle the root mutation, root query and root subscription types
    // differently, because no resolver is called at the root
    if (isRootType(info.parentType, info.schema)) {
      return store.get({
        typeName: info.parentType.name,
        key: 'ROOT',
        fieldName: info.fieldName,
        fieldArgs: args,
      });
    }

    if (defaultResolvedValue === undefined) {
      // any is used here because generateFieldValue is a private method at time of writing
      return (store as any).generateFieldValue(info.parentType.name, info.fieldName);
    }

    return undefined;
  };

  const typeResolver: GraphQLTypeResolver<any, any> = data => {
    if (isRef(data)) {
      return data.$ref.typeName;
    }
  };

  const mockSubscriber: GraphQLFieldResolver<any, any> = () => ({
    [Symbol.asyncIterator]() {
      return {
        async next() {
          return {
            done: true,
            value: {},
          };
        },
      };
    },
  });

  const schemaWithMocks = mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: fieldConfig => {
      const newFieldConfig = {
        ...fieldConfig,
      };

      const oldResolver = fieldConfig.resolve;
      if (!preserveResolvers || !oldResolver) {
        newFieldConfig.resolve = mockResolver;
      } else {
        newFieldConfig.resolve = async (rootObject, args, context, info) => {
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
            return copyOwnProps(emptyObject, resolvedValue as any, mockedValue as any);
          }
          return undefined !== resolvedValue ? resolvedValue : mockedValue;
        };
      }

      const fieldSubscriber = fieldConfig.subscribe;
      if (!preserveResolvers || !fieldSubscriber) {
        newFieldConfig.subscribe = mockSubscriber;
      } else {
        newFieldConfig.subscribe = async (rootObject, args, context, info) => {
          const [mockAsyncIterable, oldAsyncIterable] = await Promise.all([
            mockSubscriber(rootObject, args, context, info),
            fieldSubscriber(rootObject, args, context, info),
          ]);
          return oldAsyncIterable || mockAsyncIterable;
        };
      }

      return newFieldConfig;
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

  return resolvers
    ? addResolversToSchema({
        schema: schemaWithMocks,
        resolvers: resolvers as any,
      })
    : schemaWithMocks;
}
