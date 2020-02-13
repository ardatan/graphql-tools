import {
  graphql,
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLEnumType,
  GraphQLUnionType,
  GraphQLInterfaceType,
  GraphQLList,
  GraphQLType,
  GraphQLField,
  GraphQLResolveInfo,
  getNullableType,
  getNamedType,
  GraphQLNamedType,
  GraphQLFieldResolver,
  GraphQLNonNull,
  GraphQLNullableType,
} from 'graphql';
import { v4 as uuid } from 'uuid';

import { buildSchemaFromTypeDefinitions } from './makeExecutableSchema';
import { forEachField } from './utils';

import {
  IMocks,
  IMockServer,
  IMockOptions,
  IMockFn,
  IMockTypeFn,
  ITypeDefinitions,
} from './Interfaces';

// This function wraps addMocksToSchema for more convenience
function mockServer(
  schema: GraphQLSchema | ITypeDefinitions,
  mocks: IMocks,
  preserveResolvers: boolean = false,
): IMockServer {
  let mySchema: GraphQLSchema;
  if (!(schema instanceof GraphQLSchema)) {
    // TODO: provide useful error messages here if this fails
    mySchema = buildSchemaFromTypeDefinitions(schema);
  } else {
    mySchema = schema;
  }

  addMocksToSchema({ schema: mySchema, mocks, preserveResolvers });

  return { query: (query, vars) => graphql(mySchema, query, {}, {}, vars) };
}

const defaultMockMap: Map<string, IMockFn> = new Map();
defaultMockMap.set('Int', () => Math.round(Math.random() * 200) - 100);
defaultMockMap.set('Float', () => Math.random() * 200 - 100);
defaultMockMap.set('String', () => 'Hello World');
defaultMockMap.set('Boolean', () => Math.random() > 0.5);
defaultMockMap.set('ID', () => uuid());

// TODO allow providing a seed such that lengths of list could be deterministic
// this could be done by using casual to get a random list length if the casual
// object is global.
function addMocksToSchema({
  schema,
  mocks = {},
  preserveResolvers = false,
}: IMockOptions): void {
  if (!schema) {
    throw new Error('Must provide schema to mock');
  }
  if (!(schema instanceof GraphQLSchema)) {
    throw new Error('Value at "schema" must be of type GraphQLSchema');
  }
  if (!isObject(mocks)) {
    throw new Error('mocks must be of type Object');
  }

  // use Map internally, because that API is nicer.
  const mockFunctionMap: Map<string, IMockFn> = new Map();
  Object.keys(mocks).forEach(typeName => {
    mockFunctionMap.set(typeName, mocks[typeName]);
  });

  mockFunctionMap.forEach((mockFunction, mockTypeName) => {
    if (typeof mockFunction !== 'function') {
      throw new Error(`mockFunctionMap[${mockTypeName}] must be a function`);
    }
  });

  const mockType = function(
    type: GraphQLType,
    _typeName?: string,
    fieldName?: string,
  ): GraphQLFieldResolver<any, any> {
    // order of precendence for mocking:
    // 1. if the object passed in already has fieldName, just use that
    // --> if it's a function, that becomes your resolver
    // --> if it's a value, the mock resolver will return that
    // 2. if the nullableType is a list, recurse
    // 2. if there's a mock defined for this typeName, that will be used
    // 3. if there's no mock defined, use the default mocks for this type
    return (
      root: any,
      args: { [key: string]: any },
      context: any,
      info: GraphQLResolveInfo,
    ): any => {
      // nullability doesn't matter for the purpose of mocking.
      const fieldType = getNullableType(type) as GraphQLNullableType;
      const namedFieldType = getNamedType(fieldType);

      if (fieldName && root && typeof root[fieldName] !== 'undefined') {
        let result: any;

        // if we're here, the field is already defined
        if (typeof root[fieldName] === 'function') {
          result = root[fieldName](root, args, context, info);
          if (result instanceof MockList) {
            result = result.mock(
              root,
              args,
              context,
              info,
              fieldType as GraphQLList<any>,
              mockType,
            );
          }
        } else {
          result = root[fieldName];
        }

        // Now we merge the result with the default mock for this type.
        // This allows overriding defaults while writing very little code.
        if (mockFunctionMap.has(namedFieldType.name)) {
          const mock = mockFunctionMap.get(namedFieldType.name);

          result = mergeMocks(
            mock.bind(null, root, args, context, info),
            result,
          );
        }
        return result;
      }

      if (
        fieldType instanceof GraphQLList ||
        fieldType instanceof GraphQLNonNull
      ) {
        return [
          mockType(fieldType.ofType)(root, args, context, info),
          mockType(fieldType.ofType)(root, args, context, info),
        ];
      }
      if (
        mockFunctionMap.has(fieldType.name) &&
        !(
          fieldType instanceof GraphQLUnionType ||
          fieldType instanceof GraphQLInterfaceType
        )
      ) {
        // the object passed doesn't have this field, so we apply the default mock
        const mock = mockFunctionMap.get(fieldType.name);
        return mock(root, args, context, info);
      }
      if (fieldType instanceof GraphQLObjectType) {
        // objects don't return actual data, we only need to mock scalars!
        return {};
      }
      // if a mock function is provided for unionType or interfaceType, execute it to resolve the concrete type
      // otherwise randomly pick a type from all implementation types
      if (
        fieldType instanceof GraphQLUnionType ||
        fieldType instanceof GraphQLInterfaceType
      ) {
        let implementationType;
        if (mockFunctionMap.has(fieldType.name)) {
          const mock = mockFunctionMap.get(fieldType.name);
          const interfaceMockObj = mock(root, args, context, info);
          if (!interfaceMockObj || !interfaceMockObj.__typename) {
            return Error(`Please return a __typename in "${fieldType.name}"`);
          }
          implementationType = schema.getType(interfaceMockObj.__typename);
        } else {
          const possibleTypes = schema.getPossibleTypes(fieldType);
          implementationType = getRandomElement(possibleTypes);
        }
        return {
          __typename: implementationType,
          ...mockType(implementationType)(root, args, context, info),
        };
      }

      if (fieldType instanceof GraphQLEnumType) {
        return getRandomElement(fieldType.getValues()).value;
      }

      if (defaultMockMap.has(fieldType.name)) {
        const defaultMock = defaultMockMap.get(fieldType.name);
        return defaultMock(root, args, context, info);
      }

      // if we get to here, we don't have a value, and we don't have a mock for this type,
      // we could return undefined, but that would be hard to debug, so we throw instead.
      // however, we returning it instead of throwing it, so preserveResolvers can handle the failures.
      return Error(`No mock defined for type "${fieldType.name}"`);
    };
  };

  forEachField(
    schema,
    (field: GraphQLField<any, any>, typeName: string, fieldName: string) => {
      assignResolveType(field.type, preserveResolvers);
      let mockResolver: GraphQLFieldResolver<any, any> = mockType(
        field.type,
        typeName,
        fieldName,
      );

      // we have to handle the root mutation and root query types differently,
      // because no resolver is called at the root.
      const queryType = schema.getQueryType();
      const isOnQueryType = queryType != null && queryType.name === typeName;

      const mutationType = schema.getMutationType();
      const isOnMutationType =
        mutationType != null && mutationType.name === typeName;

      if (isOnQueryType || isOnMutationType) {
        if (mockFunctionMap.has(typeName)) {
          const rootMock = mockFunctionMap.get(typeName);
          // XXX: BUG in here, need to provide proper signature for rootMock.
          if (
            typeof rootMock(undefined, {}, {}, {} as any)[fieldName] ===
            'function'
          ) {
            mockResolver = (
              root: any,
              args: { [key: string]: any },
              context: any,
              info: GraphQLResolveInfo,
            ) => {
              const updatedRoot = root ?? {}; // TODO: should we clone instead?
              updatedRoot[fieldName] = rootMock(root, args, context, info)[
                fieldName
              ];
              // XXX this is a bit of a hack to still use mockType, which
              // lets you mock lists etc. as well
              // otherwise we could just set field.resolve to rootMock()[fieldName]
              // it's like pretending there was a resolver that ran before
              // the root resolver.
              return mockType(field.type, typeName, fieldName)(
                updatedRoot,
                args,
                context,
                info,
              );
            };
          }
        }
      }
      if (!preserveResolvers || !field.resolve) {
        field.resolve = mockResolver;
      } else {
        const oldResolver = field.resolve;
        field.resolve = (
          rootObject: any,
          args: { [key: string]: any },
          context: any,
          info: GraphQLResolveInfo,
        ) =>
          Promise.all([
            mockResolver(rootObject, args, context, info),
            oldResolver(rootObject, args, context, info),
          ]).then(values => {
            const [mockedValue, resolvedValue] = values;

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
              const emptyObject = Object.create(
                Object.getPrototypeOf(resolvedValue),
              );
              return copyOwnProps(emptyObject, resolvedValue, mockedValue);
            }
            return undefined !== resolvedValue ? resolvedValue : mockedValue;
          });
      }
    },
  );
}

function isObject(thing: any) {
  return thing === Object(thing) && !Array.isArray(thing);
}

// returns a random element from that ary
function getRandomElement(ary: ReadonlyArray<any>) {
  const sample = Math.floor(Math.random() * ary.length);
  return ary[sample];
}

function mergeObjects(a: Record<string, any>, b: Record<string, any>) {
  return Object.assign(a, b);
}

function copyOwnPropsIfNotPresent(
  target: Record<string, any>,
  source: Record<string, any>,
) {
  Object.getOwnPropertyNames(source).forEach(prop => {
    if (!Object.getOwnPropertyDescriptor(target, prop)) {
      const propertyDescriptor = Object.getOwnPropertyDescriptor(source, prop);
      Object.defineProperty(
        target,
        prop,
        propertyDescriptor == null ? {} : propertyDescriptor,
      );
    }
  });
}

function copyOwnProps(
  target: Record<string, any>,
  ...sources: Array<Record<string, any>>
) {
  sources.forEach(source => {
    let chain = source;
    while (chain != null) {
      copyOwnPropsIfNotPresent(target, chain);
      chain = Object.getPrototypeOf(chain);
    }
  });
  return target;
}

// takes either an object or a (possibly nested) array
// and completes the customMock object with any fields
// defined on genericMock
// only merges objects or arrays. Scalars are returned as is
function mergeMocks(genericMockFunction: () => any, customMock: any): any {
  if (Array.isArray(customMock)) {
    return customMock.map((el: any) => mergeMocks(genericMockFunction, el));
  }
  if (isObject(customMock)) {
    return mergeObjects(genericMockFunction(), customMock);
  }
  return customMock;
}

function getResolveType(namedFieldType: GraphQLNamedType) {
  if (
    namedFieldType instanceof GraphQLInterfaceType ||
    namedFieldType instanceof GraphQLUnionType
  ) {
    return namedFieldType.resolveType;
  }
}

function assignResolveType(type: GraphQLType, preserveResolvers: boolean) {
  const fieldType = getNullableType(type) as GraphQLNullableType;
  const namedFieldType = getNamedType(fieldType);

  const oldResolveType = getResolveType(namedFieldType);
  if (preserveResolvers && oldResolveType != null && oldResolveType.length) {
    return;
  }

  if (
    namedFieldType instanceof GraphQLUnionType ||
    namedFieldType instanceof GraphQLInterfaceType
  ) {
    // the default `resolveType` always returns null. We add a fallback
    // resolution that works with how unions and interface are mocked
    namedFieldType.resolveType = (
      data: any,
      _context: any,
      info: GraphQLResolveInfo,
    ) => info.schema.getType(data.__typename) as GraphQLObjectType;
  }
}

class MockList {
  private readonly len: number | Array<number>;
  private readonly wrappedFunction: GraphQLFieldResolver<any, any> | undefined;

  // wrappedFunction can return another MockList or a value
  constructor(
    len: number | Array<number>,
    wrappedFunction?: GraphQLFieldResolver<any, any>,
  ) {
    this.len = len;
    if (typeof wrappedFunction !== 'undefined') {
      if (typeof wrappedFunction !== 'function') {
        throw new Error(
          'Second argument to MockList must be a function or undefined',
        );
      }
      this.wrappedFunction = wrappedFunction;
    }
  }

  public mock(
    root: any,
    args: { [key: string]: any },
    context: any,
    info: GraphQLResolveInfo,
    fieldType: GraphQLList<any>,
    mockTypeFunc: IMockTypeFn,
  ) {
    let arr: Array<any>;
    if (Array.isArray(this.len)) {
      arr = new Array(this.randint(this.len[0], this.len[1]));
    } else {
      arr = new Array(this.len);
    }

    for (let i = 0; i < arr.length; i++) {
      if (typeof this.wrappedFunction === 'function') {
        const res = this.wrappedFunction(root, args, context, info);
        if (res instanceof MockList) {
          const nullableType = getNullableType(fieldType.ofType) as GraphQLList<
            any
          >;
          arr[i] = res.mock(
            root,
            args,
            context,
            info,
            nullableType,
            mockTypeFunc,
          );
        } else {
          arr[i] = res;
        }
      } else {
        arr[i] = mockTypeFunc(fieldType.ofType)(root, args, context, info);
      }
    }
    return arr;
  }

  private randint(low: number, high: number): number {
    return Math.floor(Math.random() * (high - low + 1) + low);
  }
}

// retain addMockFunctionsToSchema for backwards compatibility
export {
  addMocksToSchema,
  addMocksToSchema as addMockFunctionsToSchema,
  MockList,
  mockServer,
};
