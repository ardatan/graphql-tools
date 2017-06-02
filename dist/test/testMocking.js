"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var graphql_1 = require("graphql");
var mock_1 = require("../mock");
var schemaGenerator_1 = require("../schemaGenerator");
require("mocha");
describe('Mock', function () {
    var shorthand = "\n    scalar MissingMockType\n\n    interface Flying {\n      returnInt: Int\n    }\n\n    type Bird implements Flying {\n      returnInt: Int\n      returnString: String\n      returnStringArgument(s: String): String\n    }\n\n    type Bee implements Flying {\n      returnInt: Int\n      returnEnum: SomeEnum\n    }\n\n    union BirdsAndBees = Bird | Bee\n\n    enum SomeEnum {\n      A\n      B\n      C\n    }\n\n    type RootQuery {\n      returnInt: Int\n      returnFloat: Float\n      returnString: String\n      returnBoolean: Boolean\n      returnID: ID\n      returnEnum: SomeEnum\n      returnBirdsAndBees: [BirdsAndBees]\n      returnFlying: [Flying]\n      returnMockError: MissingMockType\n      returnNullableString: String\n      returnNonNullString: String!\n      returnObject: Bird\n      returnListOfInt: [Int]\n      returnListOfIntArg(l: Int): [Int]\n      returnListOfListOfInt: [[Int!]!]!\n      returnListOfListOfIntArg(l: Int): [[Int]]\n      returnListOfListOfObject: [[Bird!]]!\n      returnStringArgument(s: String): String\n    }\n\n    type RootMutation{\n      returnStringArgument(s: String): String\n    }\n    schema {\n      query: RootQuery\n      mutation: RootMutation\n    }\n  ";
    var resolveFunctions = {
        BirdsAndBees: {
            __resolveType: function (data, context, info) {
                return info.schema.getType(data.typename);
            },
        },
        Flying: {
            __resolveType: function (data, context, info) {
                return info.schema.getType(data.typename);
            },
        },
    };
    it('throws an error if you forget to pass schema', function () {
        chai_1.expect(function () { return mock_1.addMockFunctionsToSchema({}); })
            .to.throw('Must provide schema to mock');
    });
    it('throws an error if the property "schema" on the first argument is not of type GraphQLSchema', function () {
        chai_1.expect(function () { return mock_1.addMockFunctionsToSchema({ schema: {} }); })
            .to.throw('Value at "schema" must be of type GraphQLSchema');
    });
    it('throws an error if second argument is not a Map', function () {
        var jsSchema = schemaGenerator_1.buildSchemaFromTypeDefinitions(shorthand);
        chai_1.expect(function () { return mock_1.addMockFunctionsToSchema({ schema: jsSchema, mocks: ['a'] }); })
            .to.throw('mocks must be of type Object');
    });
    it('throws an error if mockFunctionMap contains a non-function thingy', function () {
        var jsSchema = schemaGenerator_1.buildSchemaFromTypeDefinitions(shorthand);
        var mockMap = { Int: 55 };
        chai_1.expect(function () { return mock_1.addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap }); })
            .to.throw('mockFunctionMap[Int] must be a function');
    });
    it('mocks the default types for you', function () {
        var jsSchema = schemaGenerator_1.buildSchemaFromTypeDefinitions(shorthand);
        var mockMap = {};
        mock_1.addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
        var testQuery = "{\n      returnInt\n      returnFloat\n      returnBoolean\n      returnString\n      returnID\n    }";
        return graphql_1.graphql(jsSchema, testQuery).then(function (res) {
            chai_1.expect(res.data['returnInt']).to.be.within(-1000, 1000);
            chai_1.expect(res.data['returnFloat']).to.be.within(-1000, 1000);
            chai_1.expect(res.data['returnBoolean']).to.be.a('boolean');
            chai_1.expect(res.data['returnString']).to.be.a('string');
            chai_1.expect(res.data['returnID']).to.be.a('string');
        });
    });
    it('lets you use mockServer for convenience', function () {
        var testQuery = "{\n      returnInt\n      returnFloat\n      returnBoolean\n      returnString\n      returnID\n      returnBirdsAndBees {\n        ... on Bird {\n          returnInt\n          returnString\n        }\n        ... on Bee {\n          returnInt\n          returnEnum\n        }\n      }\n    }";
        var mockMap = {
            Int: function () { return 12345; },
            Bird: function () { return ({ returnInt: function () { return 54321; } }); },
            Bee: function () { return ({ returnInt: function () { return 54321; } }); },
        };
        return mock_1.mockServer(shorthand, mockMap).query(testQuery).then(function (res) {
            chai_1.expect(res.data.returnInt).to.equal(12345);
            chai_1.expect(res.data.returnFloat).to.be.a('number').within(-1000, 1000);
            chai_1.expect(res.data.returnBoolean).to.be.a('boolean');
            chai_1.expect(res.data.returnString).to.be.a('string');
            chai_1.expect(res.data.returnID).to.be.a('string');
            // tests that resolveType is correctly set for unions and interfaces
            // and that the correct mock function is used
            chai_1.expect(res.data.returnBirdsAndBees[0].returnInt).to.equal(54321);
            chai_1.expect(res.data.returnBirdsAndBees[1].returnInt).to.equal(54321);
        });
    });
    it('mockServer is able to preserveResolvers of a prebuilt schema', function () {
        var jsSchema = schemaGenerator_1.buildSchemaFromTypeDefinitions(shorthand);
        var resolvers = {
            RootQuery: {
                returnString: function () { return 'someString'; },
            },
        };
        schemaGenerator_1.addResolveFunctionsToSchema(jsSchema, resolvers);
        var testQuery = "{\n      returnInt\n      returnString\n      returnBirdsAndBees {\n        ... on Bird {\n          returnInt\n        }\n        ... on Bee {\n          returnInt\n        }\n      }\n    }";
        var mockMap = {
            Int: function () { return 12345; },
            Bird: function () { return ({ returnInt: function () { return 54321; } }); },
            Bee: function () { return ({ returnInt: function () { return 54321; } }); },
        };
        return mock_1.mockServer(jsSchema, mockMap, true).query(testQuery).then(function (res) {
            chai_1.expect(res.data.returnInt).to.equal(12345);
            chai_1.expect(res.data.returnString).to.equal('someString');
            // tests that resolveType is correctly set for unions and interfaces
            // and that the correct mock function is used
            chai_1.expect(res.data.returnBirdsAndBees[0].returnInt).to.equal(54321);
            chai_1.expect(res.data.returnBirdsAndBees[1].returnInt).to.equal(54321);
        });
    });
    it('lets you use mockServer with prebuilt schema', function () {
        var jsSchema = schemaGenerator_1.buildSchemaFromTypeDefinitions(shorthand);
        var testQuery = "{\n      returnInt\n      returnFloat\n      returnBoolean\n      returnString\n      returnID\n      returnBirdsAndBees {\n        ... on Bird {\n          returnInt\n          returnString\n        }\n        ... on Bee {\n          returnInt\n          returnEnum\n        }\n      }\n    }";
        var mockMap = {
            Int: function () { return 12345; },
            Bird: function () { return ({ returnInt: function () { return 54321; } }); },
            Bee: function () { return ({ returnInt: function () { return 54321; } }); },
        };
        return mock_1.mockServer(jsSchema, mockMap).query(testQuery).then(function (res) {
            chai_1.expect(res.data.returnInt).to.equal(12345);
            chai_1.expect(res.data.returnFloat).to.be.a('number').within(-1000, 1000);
            chai_1.expect(res.data.returnBoolean).to.be.a('boolean');
            chai_1.expect(res.data.returnString).to.be.a('string');
            chai_1.expect(res.data.returnID).to.be.a('string');
            // tests that resolveType is correctly set for unions and interfaces
            // and that the correct mock function is used
            chai_1.expect(res.data.returnBirdsAndBees[0].returnInt).to.equal(54321);
            chai_1.expect(res.data.returnBirdsAndBees[1].returnInt).to.equal(54321);
        });
    });
    it('does not mask resolveType functions if you tell it not to', function () {
        var jsSchema = schemaGenerator_1.buildSchemaFromTypeDefinitions(shorthand);
        var spy = 0;
        var resolvers = {
            BirdsAndBees: {
                __resolveType: function (data, context, info) {
                    ++spy;
                    return info.schema.getType(data.typename);
                },
            },
        };
        schemaGenerator_1.addResolveFunctionsToSchema(jsSchema, resolvers);
        mock_1.addMockFunctionsToSchema({
            schema: jsSchema,
            mocks: {},
            preserveResolvers: true,
        });
        var testQuery = "{\n      returnBirdsAndBees {\n        ... on Bird {\n          returnInt\n          returnString\n        }\n        ... on Bee {\n          returnInt\n          returnEnum\n        }\n      }\n    }";
        return graphql_1.graphql(jsSchema, testQuery).then(function (res) {
            // the resolveType has been called twice
            chai_1.expect(spy).to.equal(2);
        });
    });
    // TODO test mockServer with precompiled schema
    it('can mock Enum', function () {
        var jsSchema = schemaGenerator_1.buildSchemaFromTypeDefinitions(shorthand);
        var mockMap = {};
        mock_1.addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
        var testQuery = "{\n      returnEnum\n    }";
        return graphql_1.graphql(jsSchema, testQuery).then(function (res) {
            chai_1.expect(res.data['returnEnum']).to.be.oneOf(['A', 'B', 'C']);
        });
    });
    it('can mock Unions', function () {
        var jsSchema = schemaGenerator_1.buildSchemaFromTypeDefinitions(shorthand);
        schemaGenerator_1.addResolveFunctionsToSchema(jsSchema, resolveFunctions);
        var mockMap = {
            Int: function () { return 10; },
            String: function () { return 'aha'; },
            SomeEnum: function () { return 'A'; },
            RootQuery: function () { return ({
                returnBirdsAndBees: function () { return new mock_1.MockList(40); },
            }); },
        };
        mock_1.addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
        var testQuery = "{\n      returnBirdsAndBees {\n        ... on Bird {\n          returnInt\n          returnString\n        }\n        ... on Bee {\n          returnInt\n          returnEnum\n        }\n      }\n    }";
        return graphql_1.graphql(jsSchema, testQuery).then(function (res) {
            // XXX this test is expected to fail once every 2^40 times ;-)
            chai_1.expect(res.data['returnBirdsAndBees']).to.include({
                returnInt: 10,
                returnString: 'aha',
            });
            return chai_1.expect(res.data['returnBirdsAndBees']).to.include({
                returnInt: 10,
                returnEnum: 'A',
            });
        });
    });
    it('can mock Interfaces', function () {
        var jsSchema = schemaGenerator_1.buildSchemaFromTypeDefinitions(shorthand);
        schemaGenerator_1.addResolveFunctionsToSchema(jsSchema, resolveFunctions);
        var mockMap = {
            Int: function () { return 10; },
            String: function () { return 'aha'; },
            SomeEnum: function () { return 'A'; },
            RootQuery: function () { return ({
                returnFlying: function () { return new mock_1.MockList(40); },
            }); },
        };
        mock_1.addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
        var testQuery = "{\n      returnFlying {\n        ... on Bird {\n          returnInt\n          returnString\n        }\n        ... on Bee {\n          returnInt\n          returnEnum\n        }\n      }\n    }";
        return graphql_1.graphql(jsSchema, testQuery).then(function (res) {
            chai_1.expect(res.data['returnFlying']).to.include({
                returnInt: 10,
                returnString: 'aha',
            });
            return chai_1.expect(res.data['returnFlying']).to.include({
                returnInt: 10,
                returnEnum: 'A',
            });
        });
    });
    it('throws an error in resolve if mock type is not defined', function () {
        var jsSchema = schemaGenerator_1.buildSchemaFromTypeDefinitions(shorthand);
        var mockMap = {};
        mock_1.addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
        var testQuery = "{\n      returnMockError\n    }";
        var expected = 'No mock defined for type "MissingMockType"';
        return graphql_1.graphql(jsSchema, testQuery).then(function (res) {
            chai_1.expect(res.errors[0].originalError.message).to.equal(expected);
        });
    });
    it('throws an error in resolve if mock type is not defined and resolver failed', function () {
        var jsSchema = schemaGenerator_1.buildSchemaFromTypeDefinitions(shorthand);
        var resolvers = {
            MissingMockType: {
                __serialize: function (val) { return val; },
                __parseValue: function (val) { return val; },
                __parseLiteral: function (val) { return val; },
            },
            RootQuery: {
                returnMockError: function () { return undefined; },
            },
        };
        schemaGenerator_1.addResolveFunctionsToSchema(jsSchema, resolvers);
        var mockMap = {};
        mock_1.addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap, preserveResolvers: true });
        var testQuery = "{\n      returnMockError\n    }";
        var expected = 'No mock defined for type "MissingMockType"';
        return graphql_1.graphql(jsSchema, testQuery).then(function (res) {
            chai_1.expect(res.errors[0].originalError.message).to.equal(expected);
        });
    });
    it('can preserve scalar resolvers', function () {
        var jsSchema = schemaGenerator_1.buildSchemaFromTypeDefinitions(shorthand);
        var resolvers = {
            MissingMockType: {
                __serialize: function (val) { return val; },
                __parseValue: function (val) { return val; },
                __parseLiteral: function (val) { return val; },
            },
            RootQuery: {
                returnMockError: function () { return '10-11-2012'; },
            },
        };
        schemaGenerator_1.addResolveFunctionsToSchema(jsSchema, resolvers);
        var mockMap = {};
        mock_1.addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap, preserveResolvers: true });
        var testQuery = "{\n      returnMockError\n    }";
        var expected = {
            returnMockError: '10-11-2012',
        };
        return graphql_1.graphql(jsSchema, testQuery).then(function (res) {
            chai_1.expect(res.data).to.deep.equal(expected);
            chai_1.expect(res.errors).to.equal(undefined);
        });
    });
    it('can mock an Int', function () {
        var jsSchema = schemaGenerator_1.buildSchemaFromTypeDefinitions(shorthand);
        var mockMap = { Int: function () { return 55; } };
        mock_1.addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
        var testQuery = "{\n      returnInt\n    }";
        return graphql_1.graphql(jsSchema, testQuery).then(function (res) {
            chai_1.expect(res.data['returnInt']).to.equal(55);
        });
    });
    it('can mock a Float', function () {
        var jsSchema = schemaGenerator_1.buildSchemaFromTypeDefinitions(shorthand);
        var mockMap = { Float: function () { return 55.5; } };
        mock_1.addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
        var testQuery = "{\n      returnFloat\n    }";
        return graphql_1.graphql(jsSchema, testQuery).then(function (res) {
            chai_1.expect(res.data['returnFloat']).to.equal(55.5);
        });
    });
    it('can mock a String', function () {
        var jsSchema = schemaGenerator_1.buildSchemaFromTypeDefinitions(shorthand);
        var mockMap = { String: function () { return 'a string'; } };
        mock_1.addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
        var testQuery = "{\n      returnString\n    }";
        return graphql_1.graphql(jsSchema, testQuery).then(function (res) {
            chai_1.expect(res.data['returnString']).to.equal('a string');
        });
    });
    it('can mock a Boolean', function () {
        var jsSchema = schemaGenerator_1.buildSchemaFromTypeDefinitions(shorthand);
        var mockMap = { Boolean: function () { return true; } };
        mock_1.addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
        var testQuery = "{\n      returnBoolean\n    }";
        return graphql_1.graphql(jsSchema, testQuery).then(function (res) {
            chai_1.expect(res.data['returnBoolean']).to.equal(true);
        });
    });
    it('can mock an ID', function () {
        var jsSchema = schemaGenerator_1.buildSchemaFromTypeDefinitions(shorthand);
        var mockMap = { ID: function () { return 'ea5bdc19'; } };
        mock_1.addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
        var testQuery = "{\n      returnID\n    }";
        return graphql_1.graphql(jsSchema, testQuery).then(function (res) {
            chai_1.expect(res.data['returnID']).to.equal('ea5bdc19');
        });
    });
    it('nullable type is nullable', function () {
        var jsSchema = schemaGenerator_1.buildSchemaFromTypeDefinitions(shorthand);
        var mockMap = { String: function () { return null; } };
        mock_1.addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
        var testQuery = "{\n      returnNullableString\n    }";
        return graphql_1.graphql(jsSchema, testQuery).then(function (res) {
            chai_1.expect(res.data['returnNullableString']).to.equal(null);
        });
    });
    it('can mock a nonNull type', function () {
        var jsSchema = schemaGenerator_1.buildSchemaFromTypeDefinitions(shorthand);
        var mockMap = { String: function () { return 'nonnull'; } };
        mock_1.addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
        var testQuery = "{\n      returnNonNullString\n    }";
        return graphql_1.graphql(jsSchema, testQuery).then(function (res) {
            chai_1.expect(res.data['returnNonNullString']).to.equal('nonnull');
        });
    });
    it('nonNull type is not nullable', function () {
        var jsSchema = schemaGenerator_1.buildSchemaFromTypeDefinitions(shorthand);
        var mockMap = { String: function () { return null; } };
        mock_1.addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
        var testQuery = "{\n      returnNonNullString\n    }";
        return graphql_1.graphql(jsSchema, testQuery).then(function (res) {
            chai_1.expect(res.data).to.equal(null);
            chai_1.expect(res.errors.length).to.equal(1);
        });
    });
    it('can mock object types', function () {
        var jsSchema = schemaGenerator_1.buildSchemaFromTypeDefinitions(shorthand);
        var mockMap = {
            String: function () { return 'abc'; },
            Int: function () { return 123; },
        };
        mock_1.addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
        var testQuery = "{\n      returnObject { returnInt, returnString }\n    }";
        var expected = {
            returnObject: { returnInt: 123, returnString: 'abc' },
        };
        return graphql_1.graphql(jsSchema, testQuery).then(function (res) {
            chai_1.expect(res.data).to.deep.equal(expected);
        });
    });
    it('can mock a list of ints', function () {
        var jsSchema = schemaGenerator_1.buildSchemaFromTypeDefinitions(shorthand);
        var mockMap = { Int: function () { return 123; } };
        mock_1.addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
        var testQuery = "{\n      returnListOfInt\n    }";
        var expected = {
            returnListOfInt: [123, 123],
        };
        return graphql_1.graphql(jsSchema, testQuery).then(function (res) {
            chai_1.expect(res.data).to.deep.equal(expected);
        });
    });
    it('can mock a list of lists of objects', function () {
        var jsSchema = schemaGenerator_1.buildSchemaFromTypeDefinitions(shorthand);
        var mockMap = {
            String: function () { return 'a'; },
            Int: function () { return 1; },
        };
        mock_1.addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
        var testQuery = "{\n      returnListOfListOfObject { returnInt, returnString }\n    }";
        var expected = {
            returnListOfListOfObject: [
                [{ returnInt: 1, returnString: 'a' }, { returnInt: 1, returnString: 'a' }],
                [{ returnInt: 1, returnString: 'a' }, { returnInt: 1, returnString: 'a' }],
            ],
        };
        return graphql_1.graphql(jsSchema, testQuery).then(function (res) {
            chai_1.expect(res.data).to.deep.equal(expected);
        });
    });
    it('does not mask resolve functions if you tell it not to', function () {
        var jsSchema = schemaGenerator_1.buildSchemaFromTypeDefinitions(shorthand);
        var mockMap = {
            RootQuery: function () { return ({
                returnInt: function (root, args) { return 42; },
                returnFloat: function (root, args) { return 1.3; },
                returnString: function (root, args) { return Promise.resolve('foo'); },
            }); },
        };
        var resolvers = {
            RootQuery: {
                returnInt: function () { return 5; },
                returnString: function () { return Promise.resolve('bar'); },
            },
        };
        schemaGenerator_1.addResolveFunctionsToSchema(jsSchema, resolvers);
        mock_1.addMockFunctionsToSchema({
            schema: jsSchema,
            mocks: mockMap,
            preserveResolvers: true,
        });
        var testQuery = "{\n      returnInt\n      returnFloat\n      returnString\n    }";
        var expected = {
            returnInt: 5,
            returnFloat: 1.3,
            returnString: 'bar',
        };
        return graphql_1.graphql(jsSchema, testQuery).then(function (res) {
            chai_1.expect(res.data).to.deep.equal(expected);
        });
    });
    it('lets you mock non-leaf types conveniently', function () {
        var jsSchema = schemaGenerator_1.buildSchemaFromTypeDefinitions(shorthand);
        var mockMap = {
            Bird: function () { return ({
                returnInt: 12,
                returnString: 'woot!?',
            }); },
            Int: function () { return 15; },
        };
        mock_1.addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
        var testQuery = "{\n      returnObject{\n        returnInt\n        returnString\n      }\n      returnInt\n    }";
        var expected = {
            returnObject: {
                returnInt: 12,
                returnString: 'woot!?',
            },
            returnInt: 15,
        };
        return graphql_1.graphql(jsSchema, testQuery).then(function (res) {
            chai_1.expect(res.data).to.deep.equal(expected);
        });
    });
    it('lets you mock and resolve non-leaf types concurrently', function () {
        var jsSchema = schemaGenerator_1.buildSchemaFromTypeDefinitions(shorthand);
        var resolvers = {
            RootQuery: {
                returnListOfInt: function () { return [1, 2, 3]; },
                returnObject: function () { return ({
                    returnInt: 12,
                }); },
            },
        };
        schemaGenerator_1.addResolveFunctionsToSchema(jsSchema, resolvers);
        var mockMap = {
            returnListOfInt: function () { return [5, 6, 7]; },
            Bird: function () { return ({
                returnInt: 3,
                returnString: 'woot!?',
            }); },
        };
        mock_1.addMockFunctionsToSchema({
            schema: jsSchema,
            mocks: mockMap,
            preserveResolvers: true,
        });
        var testQuery = "{\n      returnListOfInt\n      returnObject{\n        returnInt\n        returnString\n      }\n    }";
        var expected = {
            returnListOfInt: [1, 2, 3],
            returnObject: {
                returnInt: 12,
                returnString: 'woot!?',
            },
        };
        return graphql_1.graphql(jsSchema, testQuery).then(function (res) {
            chai_1.expect(res.data).to.deep.equal(expected);
        });
    });
    it('lets you mock and resolve non-leaf types concurrently, support promises', function () {
        var jsSchema = schemaGenerator_1.buildSchemaFromTypeDefinitions(shorthand);
        var resolvers = {
            RootQuery: {
                returnObject: function () { return Promise.resolve({
                    returnInt: 12,
                }); },
            },
        };
        schemaGenerator_1.addResolveFunctionsToSchema(jsSchema, resolvers);
        var mockMap = {
            Bird: function () { return ({
                returnInt: 3,
                returnString: 'woot!?',
            }); },
        };
        mock_1.addMockFunctionsToSchema({
            schema: jsSchema,
            mocks: mockMap,
            preserveResolvers: true,
        });
        var testQuery = "{\n      returnObject{\n        returnInt\n        returnString\n      }\n    }";
        var expected = {
            returnObject: {
                returnInt: 12,
                returnString: 'woot!?',
            },
        };
        return graphql_1.graphql(jsSchema, testQuery).then(function (res) {
            chai_1.expect(res.data).to.deep.equal(expected);
        });
    });
    it('lets you mock and resolve non-leaf types concurrently, support defineProperty', function () {
        var jsSchema = schemaGenerator_1.buildSchemaFromTypeDefinitions(shorthand);
        var objProxy = {};
        Object.defineProperty(objProxy, 'returnInt', // a) part of a Bird, should not be masked by mock
        { value: 12 });
        var resolvers = {
            RootQuery: {
                returnObject: function () { return objProxy; },
            },
        };
        schemaGenerator_1.addResolveFunctionsToSchema(jsSchema, resolvers);
        var mockMap = {
            Bird: function () { return ({
                returnInt: 3,
                returnString: 'woot!?',
            }); },
        };
        mock_1.addMockFunctionsToSchema({
            schema: jsSchema,
            mocks: mockMap,
            preserveResolvers: true,
        });
        var testQuery = "{\n      returnObject{\n        returnInt\n        returnString\n      }\n    }";
        var expected = {
            returnObject: {
                returnInt: 12,
                returnString: 'woot!?',
            },
        };
        return graphql_1.graphql(jsSchema, testQuery).then(function (res) {
            chai_1.expect(res.data).to.deep.equal(expected);
        });
    });
    it('let you mock with preserving resolvers, also when using logger', function () {
        var resolvers = {
            RootQuery: {
                returnString: function () { return 'woot!?'; },
            },
        };
        var jsSchema = schemaGenerator_1.makeExecutableSchema({
            typeDefs: [shorthand],
            resolvers: resolvers,
            resolverValidationOptions: {
                requireResolversForArgs: false,
                requireResolversForNonScalar: false,
                requireResolversForAllFields: false,
            },
            logger: console,
        });
        var mockMap = {
            Int: function () { return 123; },
        };
        mock_1.addMockFunctionsToSchema({
            schema: jsSchema,
            mocks: mockMap,
            preserveResolvers: true,
        });
        var testQuery = "{\n      returnObject {\n        returnInt\n          returnString\n      }\n      returnString\n    }";
        var expected = {
            returnObject: {
                returnInt: 123,
                returnString: 'Hello World',
            },
            returnString: 'woot!?',
        };
        return graphql_1.graphql(jsSchema, testQuery).then(function (res) {
            chai_1.expect(res.data).to.deep.equal(expected);
        });
    });
    it('let you mock with preserving resolvers, also when using connectors', function () {
        var resolvers = {
            RootQuery: {
                returnString: function () { return 'woot!?'; },
            },
        };
        var jsSchema = schemaGenerator_1.makeExecutableSchema({
            typeDefs: [shorthand],
            resolvers: resolvers,
            resolverValidationOptions: {
                requireResolversForArgs: false,
                requireResolversForNonScalar: false,
                requireResolversForAllFields: false,
            },
            connectors: {
                testConnector: function () { return ({}); },
            },
        });
        var mockMap = {
            Int: function () { return 123; },
        };
        mock_1.addMockFunctionsToSchema({
            schema: jsSchema,
            mocks: mockMap,
            preserveResolvers: true,
        });
        var testQuery = "{\n      returnObject {\n        returnInt\n          returnString\n      }\n      returnString\n    }";
        var expected = {
            returnObject: {
                returnInt: 123,
                returnString: 'Hello World',
            },
            returnString: 'woot!?',
        };
        return graphql_1.graphql(jsSchema, testQuery, undefined, {}).then(function (res) {
            chai_1.expect(res.data).to.deep.equal(expected);
        });
    });
    it('let you mock with preserving resolvers, also when using both connectors and logger', function () {
        var resolvers = {
            RootQuery: {
                returnString: function () { return 'woot!?'; },
            },
        };
        var jsSchema = schemaGenerator_1.makeExecutableSchema({
            typeDefs: [shorthand],
            resolvers: resolvers,
            resolverValidationOptions: {
                requireResolversForArgs: false,
                requireResolversForNonScalar: false,
                requireResolversForAllFields: false,
            },
            logger: console,
            connectors: {
                testConnector: function () { return ({}); },
            },
        });
        var mockMap = {
            Int: function () { return 123; },
        };
        mock_1.addMockFunctionsToSchema({
            schema: jsSchema,
            mocks: mockMap,
            preserveResolvers: true,
        });
        var testQuery = "{\n      returnObject {\n        returnInt\n          returnString\n      }\n      returnString\n    }";
        var expected = {
            returnObject: {
                returnInt: 123,
                returnString: 'Hello World',
            },
            returnString: 'woot!?',
        };
        return graphql_1.graphql(jsSchema, testQuery, undefined, {}).then(function (res) {
            chai_1.expect(res.data).to.deep.equal(expected);
        });
    });
    it('let you resolve null with mocking and preserving resolvers', function () {
        var jsSchema = schemaGenerator_1.buildSchemaFromTypeDefinitions(shorthand);
        var resolvers = {
            RootQuery: {
                returnString: function () { return null; },
            },
        };
        schemaGenerator_1.addResolveFunctionsToSchema(jsSchema, resolvers);
        var mockMap = {
            Int: function () { return 666; },
        };
        mock_1.addMockFunctionsToSchema({
            schema: jsSchema,
            mocks: mockMap,
            preserveResolvers: true,
        });
        var testQuery = "{\n      returnObject {\n        returnInt\n        returnString\n      }\n      returnString\n    }";
        var expected = {
            returnObject: {
                returnInt: 666,
                returnString: 'Hello World',
            },
            returnString: null,
        };
        return graphql_1.graphql(jsSchema, testQuery, undefined, {}).then(function (res) {
            chai_1.expect(res.data).to.deep.equal(expected);
        });
    });
    it('lets you mock root query fields', function () {
        var jsSchema = schemaGenerator_1.buildSchemaFromTypeDefinitions(shorthand);
        var mockMap = {
            RootQuery: function () { return ({ returnStringArgument: function (o, a) { return a['s']; } }); },
        };
        mock_1.addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
        var testQuery = "{\n      returnStringArgument(s: \"adieu\")\n    }";
        var expected = {
            returnStringArgument: 'adieu',
        };
        return graphql_1.graphql(jsSchema, testQuery).then(function (res) {
            chai_1.expect(res.data).to.deep.equal(expected);
        });
    });
    it('lets you mock root mutation fields', function () {
        var jsSchema = schemaGenerator_1.buildSchemaFromTypeDefinitions(shorthand);
        var mockMap = {
            RootMutation: function () { return ({ returnStringArgument: function (o, a) { return a['s']; } }); },
        };
        mock_1.addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
        var testQuery = "mutation {\n      returnStringArgument(s: \"adieu\")\n    }";
        var expected = {
            returnStringArgument: 'adieu',
        };
        return graphql_1.graphql(jsSchema, testQuery).then(function (res) {
            chai_1.expect(res.data).to.deep.equal(expected);
        });
    });
    it('lets you mock a list of a certain length', function () {
        var jsSchema = schemaGenerator_1.buildSchemaFromTypeDefinitions(shorthand);
        var mockMap = {
            RootQuery: function () { return ({ returnListOfInt: function () { return new mock_1.MockList(3); } }); },
            Int: function () { return 12; },
        };
        mock_1.addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
        var testQuery = "{\n      returnListOfInt\n    }";
        var expected = {
            returnListOfInt: [12, 12, 12],
        };
        return graphql_1.graphql(jsSchema, testQuery).then(function (res) {
            chai_1.expect(res.data).to.deep.equal(expected);
        });
    });
    it('lets you mock a list of a random length', function () {
        var jsSchema = schemaGenerator_1.buildSchemaFromTypeDefinitions(shorthand);
        var mockMap = {
            RootQuery: function () { return ({ returnListOfInt: function () { return new mock_1.MockList([10, 20]); } }); },
            Int: function () { return 12; },
        };
        mock_1.addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
        var testQuery = "{\n      returnListOfInt\n    }";
        return graphql_1.graphql(jsSchema, testQuery).then(function (res) {
            chai_1.expect(res.data['returnListOfInt']).to.have.length.within(10, 20);
            chai_1.expect(res.data['returnListOfInt'][0]).to.equal(12);
        });
    });
    it('lets you mock a list of specific variable length', function () {
        var jsSchema = schemaGenerator_1.buildSchemaFromTypeDefinitions(shorthand);
        var mockMap = {
            RootQuery: function () { return ({
                returnListOfIntArg: function (o, a) { return new mock_1.MockList(a['l']); },
            }); },
            Int: function () { return 12; },
        };
        mock_1.addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
        var testQuery = "{\n      l3: returnListOfIntArg(l: 3)\n      l5: returnListOfIntArg(l: 5)\n    }";
        return graphql_1.graphql(jsSchema, testQuery).then(function (res) {
            chai_1.expect(res.data['l3'].length).to.equal(3);
            chai_1.expect(res.data['l5'].length).to.equal(5);
        });
    });
    it('lets you provide a function for your MockList', function () {
        var jsSchema = schemaGenerator_1.buildSchemaFromTypeDefinitions(shorthand);
        var mockMap = {
            RootQuery: function () { return ({
                returnListOfInt: function () { return new mock_1.MockList(2, function () { return 33; }); },
            }); },
            Int: function () { return 12; },
        };
        mock_1.addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
        var testQuery = "{\n      returnListOfInt\n    }";
        var expected = {
            returnListOfInt: [33, 33],
        };
        return graphql_1.graphql(jsSchema, testQuery).then(function (res) {
            chai_1.expect(res.data).to.deep.equal(expected);
        });
    });
    it('throws an error if the second argument to MockList is not a function', function () {
        chai_1.expect(function () { return new mock_1.MockList(5, 'abc'); })
            .to.throw('Second argument to MockList must be a function or undefined');
    });
    it('lets you nest MockList in MockList', function () {
        var jsSchema = schemaGenerator_1.buildSchemaFromTypeDefinitions(shorthand);
        var mockMap = {
            RootQuery: function () { return ({
                returnListOfListOfInt: function () { return new mock_1.MockList(2, function () { return new mock_1.MockList(3); }); },
            }); },
            Int: function () { return 12; },
        };
        mock_1.addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
        var testQuery = "{\n      returnListOfListOfInt\n    }";
        var expected = {
            returnListOfListOfInt: [[12, 12, 12], [12, 12, 12]],
        };
        return graphql_1.graphql(jsSchema, testQuery).then(function (res) {
            chai_1.expect(res.data).to.deep.equal(expected);
        });
    });
    it('lets you use arguments in nested MockList', function () {
        var jsSchema = schemaGenerator_1.buildSchemaFromTypeDefinitions(shorthand);
        var mockMap = {
            RootQuery: function () { return ({
                returnListOfListOfIntArg: function () { return new mock_1.MockList(2, function (o, a) { return new mock_1.MockList(a['l']); }); },
            }); },
            Int: function () { return 12; },
        };
        mock_1.addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
        var testQuery = "{\n      returnListOfListOfIntArg(l: 1)\n    }";
        var expected = {
            returnListOfListOfIntArg: [[12], [12]],
        };
        return graphql_1.graphql(jsSchema, testQuery).then(function (res) {
            chai_1.expect(res.data).to.deep.equal(expected);
        });
    });
    it('works for a slightly more elaborate example', function () {
        var short = "\n      type Thread {\n        id: ID!\n        name: String!\n        posts(page: Int = 0, num: Int = 1): [Post]\n      }\n      type Post {\n        id: ID!\n        user: User!\n        text: String!\n      }\n\n      type User {\n        id: ID!\n        name: String\n      }\n\n      type RootQuery {\n        thread(id: ID): Thread\n        threads(page: Int = 0, num: Int = 1): [Thread]\n      }\n\n      schema {\n        query: RootQuery\n      }\n    ";
        var jsSchema = schemaGenerator_1.buildSchemaFromTypeDefinitions(short);
        var ITEMS_PER_PAGE = 2;
        // This mock map demonstrates default merging on objects and nested lists.
        // thread on root query will have id a.id, and missing properties
        // come from the Thread mock type
        // TODO: this tests too many things at once, it should really be broken up
        // it was really useful to have this though, because it made me find many
        // unintuitive corner-cases
        var mockMap = {
            RootQuery: function () { return ({
                thread: function (o, a) { return ({ id: a['id'] }); },
                threads: function (o, a) { return new mock_1.MockList(ITEMS_PER_PAGE * a['num']); },
            }); },
            Thread: function () { return ({
                name: 'Lorem Ipsum',
                posts: function (o, a) { return (new mock_1.MockList(ITEMS_PER_PAGE * a['num'], function (oi, ai) { return ({ id: ai['num'] }); })); },
            }); },
            Post: function () { return ({
                id: '41ae7bd',
                text: 'superlongpost',
            }); },
            Int: function () { return 123; },
        };
        mock_1.addMockFunctionsToSchema({ schema: jsSchema, mocks: mockMap });
        var testQuery = "query abc{\n      thread(id: \"67\"){\n        id\n        name\n        posts(num: 2){\n          id\n          text\n        }\n      }\n    }";
        var expected = {
            thread: {
                id: '67',
                name: 'Lorem Ipsum',
                posts: [
                    { id: '2', text: 'superlongpost' },
                    { id: '2', text: 'superlongpost' },
                    { id: '2', text: 'superlongpost' },
                    { id: '2', text: 'superlongpost' },
                ],
            },
        };
        return graphql_1.graphql(jsSchema, testQuery).then(function (res) {
            chai_1.expect(res.data).to.deep.equal(expected);
        });
    });
    // TODO add a test that checks that even when merging defaults, lists invoke
    // the function for every object, not just once per list.
    // TODO test that you can call mock server with a graphql-js schema
});
//# sourceMappingURL=testMocking.js.map