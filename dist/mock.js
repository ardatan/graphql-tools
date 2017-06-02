"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var graphql_1 = require("graphql");
var graphql_2 = require("graphql");
var uuid = require("uuid");
var schemaGenerator_1 = require("./schemaGenerator");
// This function wraps addMockFunctionsToSchema for more convenience
function mockServer(schema, mocks, preserveResolvers) {
    if (preserveResolvers === void 0) { preserveResolvers = false; }
    var mySchema;
    if (!(schema instanceof graphql_1.GraphQLSchema)) {
        // TODO: provide useful error messages here if this fails
        mySchema = schemaGenerator_1.buildSchemaFromTypeDefinitions(schema);
    }
    else {
        mySchema = schema;
    }
    addMockFunctionsToSchema({ schema: mySchema, mocks: mocks, preserveResolvers: preserveResolvers });
    return { query: function (query, vars) { return graphql_2.graphql(mySchema, query, {}, {}, vars); } };
}
exports.mockServer = mockServer;
// TODO allow providing a seed such that lengths of list could be deterministic
// this could be done by using casual to get a random list length if the casual
// object is global.
function addMockFunctionsToSchema(_a) {
    var schema = _a.schema, _b = _a.mocks, mocks = _b === void 0 ? {} : _b, _c = _a.preserveResolvers, preserveResolvers = _c === void 0 ? false : _c;
    function isObject(thing) {
        return thing === Object(thing) && !Array.isArray(thing);
    }
    if (!schema) {
        throw new Error('Must provide schema to mock');
    }
    if (!(schema instanceof graphql_1.GraphQLSchema)) {
        throw new Error('Value at "schema" must be of type GraphQLSchema');
    }
    if (!isObject(mocks)) {
        throw new Error('mocks must be of type Object');
    }
    // use Map internally, because that API is nicer.
    var mockFunctionMap = new Map();
    Object.keys(mocks).forEach(function (typeName) {
        mockFunctionMap.set(typeName, mocks[typeName]);
    });
    mockFunctionMap.forEach(function (mockFunction, mockTypeName) {
        if (typeof mockFunction !== 'function') {
            throw new Error("mockFunctionMap[" + mockTypeName + "] must be a function");
        }
    });
    var defaultMockMap = new Map();
    defaultMockMap.set('Int', function () { return Math.round(Math.random() * 200) - 100; });
    defaultMockMap.set('Float', function () { return (Math.random() * 200) - 100; });
    defaultMockMap.set('String', function () { return 'Hello World'; });
    defaultMockMap.set('Boolean', function () { return Math.random() > 0.5; });
    defaultMockMap.set('ID', function () { return uuid.v4(); });
    function mergeObjects(a, b) {
        return Object.assign(a, b);
    }
    function copyOwnPropsIfNotPresent(target, source) {
        Object.getOwnPropertyNames(source).forEach(function (prop) {
            if (!Object.getOwnPropertyDescriptor(target, prop)) {
                Object.defineProperty(target, prop, Object.getOwnPropertyDescriptor(source, prop));
            }
        });
    }
    function copyOwnProps(target) {
        var sources = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            sources[_i - 1] = arguments[_i];
        }
        sources.forEach(function (source) {
            var chain = source;
            while (chain) {
                copyOwnPropsIfNotPresent(target, chain);
                chain = Object.getPrototypeOf(chain);
            }
        });
        return target;
    }
    // returns a random element from that ary
    function getRandomElement(ary) {
        var sample = Math.floor(Math.random() * ary.length);
        return ary[sample];
    }
    // takes either an object or a (possibly nested) array
    // and completes the customMock object with any fields
    // defined on genericMock
    // only merges objects or arrays. Scalars are returned as is
    function mergeMocks(genericMockFunction, customMock) {
        if (Array.isArray(customMock)) {
            return customMock.map(function (el) { return mergeMocks(genericMockFunction, el); });
        }
        if (isObject(customMock)) {
            return mergeObjects(genericMockFunction(), customMock);
        }
        return customMock;
    }
    function getResolveType(namedFieldType) {
        if ((namedFieldType instanceof graphql_1.GraphQLInterfaceType) ||
            (namedFieldType instanceof graphql_1.GraphQLUnionType)) {
            return namedFieldType.resolveType;
        }
        else {
            return undefined;
        }
    }
    function assignResolveType(type) {
        var fieldType = graphql_1.getNullableType(type);
        var namedFieldType = graphql_1.getNamedType(fieldType);
        var oldResolveType = getResolveType(namedFieldType);
        if (preserveResolvers && oldResolveType && oldResolveType.length) {
            return;
        }
        if (namedFieldType instanceof graphql_1.GraphQLUnionType ||
            namedFieldType instanceof graphql_1.GraphQLInterfaceType) {
            // the default `resolveType` always returns null. We add a fallback
            // resolution that works with how unions and interface are mocked
            namedFieldType.resolveType = function (data, context, info) {
                return info.schema.getType(data.typename);
            };
        }
    }
    var mockType = function mockType(type, typeName, fieldName) {
        // order of precendence for mocking:
        // 1. if the object passed in already has fieldName, just use that
        // --> if it's a function, that becomes your resolver
        // --> if it's a value, the mock resolver will return that
        // 2. if the nullableType is a list, recurse
        // 2. if there's a mock defined for this typeName, that will be used
        // 3. if there's no mock defined, use the default mocks for this type
        return function (root, args, context, info) {
            // nullability doesn't matter for the purpose of mocking.
            var fieldType = graphql_1.getNullableType(type);
            var namedFieldType = graphql_1.getNamedType(fieldType);
            if (root && typeof root[fieldName] !== 'undefined') {
                var result = void 0;
                // if we're here, the field is already defined
                if (typeof root[fieldName] === 'function') {
                    result = root[fieldName](root, args, context, info);
                    if (result instanceof MockList) {
                        result = result.mock(root, args, context, info, fieldType, mockType);
                    }
                }
                else {
                    result = root[fieldName];
                }
                // Now we merge the result with the default mock for this type.
                // This allows overriding defaults while writing very little code.
                if (mockFunctionMap.has(namedFieldType.name)) {
                    result = mergeMocks(mockFunctionMap.get(namedFieldType.name).bind(null, root, args, context, info), result);
                }
                return result;
            }
            if (fieldType instanceof graphql_1.GraphQLList) {
                return [mockType(fieldType.ofType)(root, args, context, info),
                    mockType(fieldType.ofType)(root, args, context, info)];
            }
            if (mockFunctionMap.has(fieldType.name)) {
                // the object passed doesn't have this field, so we apply the default mock
                return mockFunctionMap.get(fieldType.name)(root, args, context, info);
            }
            if (fieldType instanceof graphql_1.GraphQLObjectType) {
                // objects don't return actual data, we only need to mock scalars!
                return {};
            }
            // TODO mocking Interface and Union types will require determining the
            // resolve type before passing it on.
            // XXX we recommend a generic way for resolve type here, which is defining
            // typename on the object.
            if (fieldType instanceof graphql_1.GraphQLUnionType) {
                var randomType = getRandomElement(fieldType.getTypes());
                return Object.assign({ typename: randomType }, mockType(randomType)(root, args, context, info));
            }
            if (fieldType instanceof graphql_1.GraphQLInterfaceType) {
                var possibleTypes = schema.getPossibleTypes(fieldType);
                var randomType = getRandomElement(possibleTypes);
                return Object.assign({ typename: randomType }, mockType(randomType)(root, args, context, info));
            }
            if (fieldType instanceof graphql_1.GraphQLEnumType) {
                return getRandomElement(fieldType.getValues()).value;
            }
            if (defaultMockMap.has(fieldType.name)) {
                return defaultMockMap.get(fieldType.name)(root, args, context, info);
            }
            // if we get to here, we don't have a value, and we don't have a mock for this type,
            // we could return undefined, but that would be hard to debug, so we throw instead.
            // however, we returning it instead of throwing it, so preserveResolvers can handle the failures.
            return Error("No mock defined for type \"" + fieldType.name + "\"");
        };
    };
    schemaGenerator_1.forEachField(schema, function (field, typeName, fieldName) {
        assignResolveType(field.type);
        var mockResolver;
        // we have to handle the root mutation and root query types differently,
        // because no resolver is called at the root.
        /* istanbul ignore next: Must provide schema DefinitionNode with query type or a type named Query. */
        var isOnQueryType = schema.getQueryType() ? (schema.getQueryType().name === typeName) : false;
        var isOnMutationType = schema.getMutationType() ? (schema.getMutationType().name === typeName) : false;
        if (isOnQueryType || isOnMutationType) {
            if (mockFunctionMap.has(typeName)) {
                var rootMock_1 = mockFunctionMap.get(typeName);
                // XXX: BUG in here, need to provide proper signature for rootMock.
                if (rootMock_1(undefined, {}, {}, {})[fieldName]) {
                    // TODO: assert that it's a function
                    mockResolver = function (root, args, context, info) {
                        var updatedRoot = root || {}; // TODO: should we clone instead?
                        updatedRoot[fieldName] = rootMock_1(root, args, context, info)[fieldName];
                        // XXX this is a bit of a hack to still use mockType, which
                        // lets you mock lists etc. as well
                        // otherwise we could just set field.resolve to rootMock()[fieldName]
                        // it's like pretending there was a resolve function that ran before
                        // the root resolve function.
                        return mockType(field.type, typeName, fieldName)(updatedRoot, args, context, info);
                    };
                }
            }
        }
        if (!mockResolver) {
            mockResolver = mockType(field.type, typeName, fieldName);
        }
        if (!preserveResolvers || !field.resolve) {
            field.resolve = mockResolver;
        }
        else {
            var oldResolver_1 = field.resolve;
            field.resolve = function (rootObject, args, context, info) { return Promise.all([
                mockResolver(rootObject, args, context, info),
                oldResolver_1(rootObject, args, context, info),
            ]).then(function (values) {
                var mockedValue = values[0], resolvedValue = values[1];
                // In case we couldn't mock
                if (mockedValue instanceof Error) {
                    // only if value was not resolved, populate the error.
                    if (undefined === resolvedValue) {
                        throw mockedValue;
                    }
                    return resolvedValue;
                }
                if (isObject(mockedValue) && isObject(resolvedValue)) {
                    // Object.assign() won't do here, as we need to all properties, including
                    // the non-enumerable ones and defined using Object.defineProperty
                    return copyOwnProps({}, resolvedValue, mockedValue);
                }
                return (undefined !== resolvedValue) ? resolvedValue : mockedValue;
            }); };
        }
    });
}
exports.addMockFunctionsToSchema = addMockFunctionsToSchema;
var MockList = (function () {
    // wrappedFunction can return another MockList or a value
    function MockList(len, wrappedFunction) {
        this.len = len;
        if (typeof wrappedFunction !== 'undefined') {
            if (typeof wrappedFunction !== 'function') {
                throw new Error('Second argument to MockList must be a function or undefined');
            }
            this.wrappedFunction = wrappedFunction;
        }
    }
    MockList.prototype.mock = function (root, args, context, info, fieldType, mockTypeFunc) {
        var arr;
        if (Array.isArray(this.len)) {
            arr = new Array(this.randint(this.len[0], this.len[1]));
        }
        else {
            arr = new Array(this.len);
        }
        for (var i = 0; i < arr.length; i++) {
            if (typeof this.wrappedFunction === 'function') {
                var res = this.wrappedFunction(root, args, context, info);
                if (res instanceof MockList) {
                    var nullableType = graphql_1.getNullableType(fieldType.ofType);
                    arr[i] = res.mock(root, args, context, info, nullableType, mockTypeFunc);
                }
                else {
                    arr[i] = res;
                }
            }
            else {
                arr[i] = mockTypeFunc(fieldType.ofType)(root, args, context, info);
            }
        }
        return arr;
    };
    MockList.prototype.randint = function (low, high) {
        return Math.floor((Math.random() * ((high - low) + 1)) + low);
    };
    return MockList;
}());
exports.MockList = MockList;
//# sourceMappingURL=mock.js.map