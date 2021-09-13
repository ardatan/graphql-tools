import { __assign, __awaiter, __generator, __read } from "tslib";
import { defaultFieldResolver, isUnionType, GraphQLUnionType, GraphQLInterfaceType, isSchema, } from 'graphql';
import { mapSchema, MapperKind, getRootTypeNames } from '@graphql-tools/utils';
import { addResolversToSchema } from '@graphql-tools/schema';
import { isRef } from './types';
import { copyOwnProps, isObject } from './utils';
import { createMockStore } from './MockStore';
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
export function addMocksToSchema(_a) {
    var _b;
    var _this = this;
    var schema = _a.schema, maybeStore = _a.store, mocks = _a.mocks, typePolicies = _a.typePolicies, resolversOrFnResolvers = _a.resolvers, _c = _a.preserveResolvers, preserveResolvers = _c === void 0 ? false : _c;
    if (!schema) {
        throw new Error('Must provide schema to mock');
    }
    if (!isSchema(schema)) {
        throw new Error('Value at "schema" must be of type GraphQLSchema');
    }
    if (mocks && !isObject(mocks)) {
        throw new Error('mocks must be of type Object');
    }
    var store = maybeStore ||
        createMockStore({
            schema: schema,
            mocks: mocks,
            typePolicies: typePolicies,
        });
    var resolvers = typeof resolversOrFnResolvers === 'function' ? resolversOrFnResolvers(store) : resolversOrFnResolvers;
    var mockResolver = function (source, args, contex, info) {
        var defaultResolvedValue = defaultFieldResolver(source, args, contex, info);
        // priority to default resolved value
        if (defaultResolvedValue !== undefined)
            return defaultResolvedValue;
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
        return undefined;
    };
    var typeResolver = function (data) {
        if (isRef(data)) {
            return data.$ref.typeName;
        }
    };
    var mockSubscriber = function () {
        var _a;
        return (_a = {},
            _a[Symbol.asyncIterator] = function () {
                return {
                    next: function () {
                        return __awaiter(this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                return [2 /*return*/, {
                                        done: true,
                                        value: {},
                                    }];
                            });
                        });
                    },
                };
            },
            _a);
    };
    var schemaWithMocks = mapSchema(schema, (_b = {},
        _b[MapperKind.OBJECT_FIELD] = function (fieldConfig) {
            var newFieldConfig = __assign({}, fieldConfig);
            var oldResolver = fieldConfig.resolve;
            if (!preserveResolvers || !oldResolver) {
                newFieldConfig.resolve = mockResolver;
            }
            else {
                newFieldConfig.resolve = function (rootObject, args, context, info) { return __awaiter(_this, void 0, void 0, function () {
                    var _a, mockedValue, resolvedValue, emptyObject;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0: return [4 /*yield*/, Promise.all([
                                    mockResolver(rootObject, args, context, info),
                                    oldResolver(rootObject, args, context, info),
                                ])];
                            case 1:
                                _a = __read.apply(void 0, [_b.sent(), 2]), mockedValue = _a[0], resolvedValue = _a[1];
                                // In case we couldn't mock
                                if (mockedValue instanceof Error) {
                                    // only if value was not resolved, populate the error.
                                    if (undefined === resolvedValue) {
                                        throw mockedValue;
                                    }
                                    return [2 /*return*/, resolvedValue];
                                }
                                if (resolvedValue instanceof Date && mockedValue instanceof Date) {
                                    return [2 /*return*/, undefined !== resolvedValue ? resolvedValue : mockedValue];
                                }
                                if (isObject(mockedValue) && isObject(resolvedValue)) {
                                    emptyObject = Object.create(Object.getPrototypeOf(resolvedValue));
                                    return [2 /*return*/, copyOwnProps(emptyObject, resolvedValue, mockedValue)];
                                }
                                return [2 /*return*/, undefined !== resolvedValue ? resolvedValue : mockedValue];
                        }
                    });
                }); };
            }
            var fieldSubscriber = fieldConfig.subscribe;
            if (!preserveResolvers || !fieldSubscriber) {
                newFieldConfig.subscribe = mockSubscriber;
            }
            else {
                newFieldConfig.subscribe = function (rootObject, args, context, info) { return __awaiter(_this, void 0, void 0, function () {
                    var _a, mockAsyncIterable, oldAsyncIterable;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0: return [4 /*yield*/, Promise.all([
                                    mockSubscriber(rootObject, args, context, info),
                                    fieldSubscriber(rootObject, args, context, info),
                                ])];
                            case 1:
                                _a = __read.apply(void 0, [_b.sent(), 2]), mockAsyncIterable = _a[0], oldAsyncIterable = _a[1];
                                return [2 /*return*/, oldAsyncIterable || mockAsyncIterable];
                        }
                    });
                }); };
            }
            return newFieldConfig;
        },
        _b[MapperKind.ABSTRACT_TYPE] = function (type) {
            if (preserveResolvers && type.resolveType != null && type.resolveType.length) {
                return;
            }
            if (isUnionType(type)) {
                return new GraphQLUnionType(__assign(__assign({}, type.toConfig()), { resolveType: typeResolver }));
            }
            else {
                return new GraphQLInterfaceType(__assign(__assign({}, type.toConfig()), { resolveType: typeResolver }));
            }
        },
        _b));
    return resolvers ? addResolversToSchema(schemaWithMocks, resolvers) : schemaWithMocks;
}
var isRootType = function (type, schema) {
    var rootTypeNames = getRootTypeNames(schema);
    return rootTypeNames.has(type.name);
};
