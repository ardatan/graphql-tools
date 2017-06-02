"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var graphql_1 = require("graphql");
var Logger_1 = require("../Logger");
var schemaGenerator_1 = require("../schemaGenerator");
require("mocha");
describe('Logger', function () {
    it('logs the errors', function (done) {
        var shorthand = "\n      type RootQuery {\n        just_a_field: Int\n      }\n      type RootMutation {\n        species(name: String): String\n        stuff: String\n      }\n      schema {\n        query: RootQuery\n        mutation: RootMutation\n      }\n    ";
        var resolve = {
            RootMutation: {
                species: function () {
                    throw new Error('oops!');
                },
                stuff: function () {
                    throw new Error('oh noes!');
                },
            },
        };
        var logger = new Logger_1.Logger();
        var jsSchema = schemaGenerator_1.makeExecutableSchema({
            typeDefs: shorthand,
            resolvers: resolve,
            logger: logger,
        });
        // calling the mutation here so the erros will be ordered.
        var testQuery = 'mutation { species, stuff }';
        var expected0 = 'Error in resolver RootMutation.species\noops!';
        var expected1 = 'Error in resolver RootMutation.stuff\noh noes!';
        graphql_1.graphql(jsSchema, testQuery).then(function () {
            chai_1.assert.equal(logger.errors.length, 2);
            chai_1.assert.equal(logger.errors[0].message, expected0);
            chai_1.assert.equal(logger.errors[1].message, expected1);
            done();
        });
    });
    it('also forwards the errors when you tell it to', function (done) {
        var shorthand = "\n      type RootQuery {\n        species(name: String): String\n      }\n      schema {\n        query: RootQuery\n      }\n    ";
        var resolve = {
            RootQuery: {
                species: function () {
                    throw new Error('oops!');
                },
            },
        };
        var loggedErr = null;
        var logger = new Logger_1.Logger('LoggyMcLogface', function (e) { loggedErr = e; });
        var jsSchema = schemaGenerator_1.makeExecutableSchema({
            typeDefs: shorthand,
            resolvers: resolve,
            logger: logger,
        });
        var testQuery = '{ species }';
        graphql_1.graphql(jsSchema, testQuery).then(function () {
            chai_1.assert.equal(loggedErr, logger.errors[0]);
            done();
        });
    });
    it('prints the errors when you want it to', function (done) {
        var shorthand = "\n      type RootQuery {\n        species(name: String): String\n      }\n      schema {\n        query: RootQuery\n      }\n    ";
        var resolve = {
            RootQuery: {
                species: function (root, _a) {
                    var name = _a.name;
                    if (name) {
                        throw new Error(name);
                    }
                    throw new Error('oops!');
                },
            },
        };
        var logger = new Logger_1.Logger();
        var jsSchema = schemaGenerator_1.makeExecutableSchema({
            typeDefs: shorthand,
            resolvers: resolve,
            logger: logger,
        });
        var testQuery = '{ q: species, p: species(name: "Peter") }';
        graphql_1.graphql(jsSchema, testQuery).then(function () {
            var allErrors = logger.printAllErrors();
            chai_1.assert.match(allErrors, /oops/);
            chai_1.assert.match(allErrors, /Peter/);
            done();
        });
    });
    it('logs any Promise reject errors', function (done) {
        var shorthand = "\n      type RootQuery {\n        just_a_field: Int\n      }\n      type RootMutation {\n        species(name: String): String\n        stuff: String\n      }\n      schema {\n        query: RootQuery\n        mutation: RootMutation\n      }\n    ";
        var resolve = {
            RootMutation: {
                species: function () {
                    return new Promise(function (_, reject) {
                        reject(new Error('oops!'));
                    });
                },
                stuff: function () {
                    return new Promise(function (_, reject) {
                        reject(new Error('oh noes!'));
                    });
                },
            },
        };
        var logger = new Logger_1.Logger();
        var jsSchema = schemaGenerator_1.makeExecutableSchema({
            typeDefs: shorthand,
            resolvers: resolve,
            logger: logger,
        });
        var testQuery = 'mutation { species, stuff }';
        var expected0 = 'Error in resolver RootMutation.species\noops!';
        var expected1 = 'Error in resolver RootMutation.stuff\noh noes!';
        graphql_1.graphql(jsSchema, testQuery).then(function () {
            chai_1.assert.equal(logger.errors.length, 2);
            chai_1.assert.equal(logger.errors[0].message, expected0);
            chai_1.assert.equal(logger.errors[1].message, expected1);
            done();
        });
    });
    it('all Promise rejects will log an Error', function (done) {
        var shorthand = "\n      type RootQuery {\n        species(name: String): String\n      }\n      schema {\n        query: RootQuery\n      }\n    ";
        var resolve = {
            RootQuery: {
                species: function () {
                    return new Promise(function (_, reject) {
                        reject('oops!');
                    });
                },
            },
        };
        var loggedErr = null;
        var logger = new Logger_1.Logger('LoggyMcLogface', function (e) { loggedErr = e; });
        var jsSchema = schemaGenerator_1.makeExecutableSchema({
            typeDefs: shorthand,
            resolvers: resolve,
            logger: logger,
        });
        var testQuery = '{ species }';
        graphql_1.graphql(jsSchema, testQuery).then(function () {
            chai_1.assert.equal(loggedErr, logger.errors[0]);
            done();
        });
    });
});
//# sourceMappingURL=testLogger.js.map