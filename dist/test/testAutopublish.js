"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var graphql_1 = require("graphql");
var graphql_subscriptions_1 = require("graphql-subscriptions");
var schemaGenerator_1 = require("../schemaGenerator");
var autopublish_1 = require("../autopublish");
require("mocha");
var speciesMap = {
    'Tiger': { id: 0, name: 'Tiger' },
    'Cat': { id: 1, name: 'Cat' },
    'Dog': { id: 2, name: 'Dog' },
};
var speciesIndex = [
    'Tiger',
    'Cat',
    'Dog',
];
var typeDefs = "\n  type Species {\n    id: Int!\n    name: String!\n  }\n\n  type Query {\n    # either name or id required!\n    species(name: String, id: Int): Species\n  }\n  type Mutation {\n    createSpecies(name: String!): Species!\n    updateSpecies(id: Int!, newName: String!): Species\n    deleteSpecies(id: Int!): Species\n  }\n";
var resolvers = {
    Query: {
        species: function (root, _a) {
            var id = _a.id, name = _a.name;
            if (id !== undefined && name !== undefined) {
                throw new Error('Must provide either name or id argument, not both');
            }
            if (id !== undefined) {
                return speciesMap[speciesIndex[id]];
            }
            if (name !== undefined) {
                return speciesMap[name];
            }
            throw new Error('Must provide either id or name argument');
        },
    },
    Mutation: {
        createSpecies: function (root, _a) {
            var name = _a.name;
            speciesMap[name] = { id: speciesIndex.length, name: name };
            speciesIndex.push(name);
            return speciesMap[name];
        },
        updateSpecies: function (root, _a) {
            var id = _a.id, newName = _a.newName;
            var species = speciesMap[speciesIndex[id]];
            delete speciesMap[speciesIndex[id]];
            species['name'] = newName;
            speciesMap[newName] = species;
            speciesIndex[species.id] = newName;
            return species;
        },
        deleteSpecies: function (root, _a) {
            var id = _a.id;
            var species = speciesMap[speciesIndex[id]];
            delete speciesMap[speciesIndex[id]];
            speciesIndex[species.id] = null;
            return species;
        },
    },
};
var schema = schemaGenerator_1.makeExecutableSchema({ typeDefs: typeDefs, resolvers: resolvers });
var pubsub = new graphql_subscriptions_1.PubSub();
describe('self-test', function () {
    it('query works', function () {
        var query = "\n      {\n        species(name: \"Tiger\"){\n          id\n        }\n      }\n    ";
        return graphql_1.graphql(schema, query).then(function (res) {
            return chai_1.expect(res.data['species']['id']).to.equals(0);
        });
    });
    it('create mutation works', function () {
        var mutation = "\n      mutation {\n        createSpecies(name: \"Eagle\"){\n          id\n        }\n      }\n    ";
        var query = "\n      {\n        species(name: \"Eagle\"){\n          id\n          name\n        }\n      }\n    ";
        var expected = { id: 3, name: 'Eagle' };
        return graphql_1.graphql(schema, mutation).then(function (data) {
            return graphql_1.graphql(schema, query).then(function (res) {
                return chai_1.expect(res.data['species']).to.deep.equal(expected);
            });
        });
    });
    it('update mutation works', function () {
        var mutation = "\n      mutation {\n        updateSpecies(id: 1, newName: \"Meow\"){\n          id\n          name\n        }\n      }\n    ";
        var query = "\n      {\n        species(id: 1){\n          id\n          name\n        }\n      }\n    ";
        var expected = { id: 1, name: 'Meow' };
        return graphql_1.graphql(schema, mutation).then(function (data) {
            return graphql_1.graphql(schema, query).then(function (res) {
                return chai_1.expect(res.data['species']).to.deep.equal(expected);
            });
        });
    });
    it('delete mutation works', function () {
        var mutation = "\n      mutation {\n        deleteSpecies(id: 3){\n          id\n          name\n        }\n      }\n    ";
        var query = "\n      {\n        species(id: 3){\n          id\n          name\n        }\n      }\n    ";
        var expected = null;
        return graphql_1.graphql(schema, mutation).then(function (data) {
            return graphql_1.graphql(schema, query).then(function (res) {
                return chai_1.expect(res.data['species']).to.deep.equal(expected);
            });
        });
    });
});
describe('Autopublish', function () {
    it('publishes payloads to the channel on mutations', function () {
        var added = [];
        var p1 = new Promise(function (resolve, reject) {
            pubsub.subscribe('createSpecies', function (data) {
                added.push(data);
                resolve(undefined);
            });
        });
        var updated = [];
        var p2 = new Promise(function (resolve, reject) {
            pubsub.subscribe('updateSpecies', function (data) {
                updated.push(data);
                resolve(undefined);
            });
        });
        var deleted = [];
        var p3 = new Promise(function (resolve, reject) {
            pubsub.subscribe('deleteSpecies', function (data) {
                deleted.push(data);
                resolve(undefined);
            });
        });
        var ready = Promise.all([p1, p2, p3]);
        // autopublish
        autopublish_1.autopublishMutationResults(schema, pubsub);
        // run one mutation of each, then check to make sure you got em all!
        var mutation = "\n      mutation {\n        createSpecies(name: \"Rhino\"){\n          name\n        }\n        updateSpecies(id: 0, newName: \"Penguin\"){\n          name\n        }\n        deleteSpecies(id: 2){\n          name\n        }\n      }\n    ";
        var expected = {
            'added': { name: 'Rhino' },
            'updated': { name: 'Penguin' },
            'deleted': { name: 'Dog' },
        };
        return graphql_1.graphql(schema, mutation).then(function (data) {
            return ready.then(function () {
                chai_1.expect(added[0]['name']).to.deep.equal(expected['added']['name']);
                chai_1.expect(updated[0]['name']).to.deep.equal(expected['updated']['name']);
                chai_1.expect(deleted[0]['name']).to.deep.equal(expected['deleted']['name']);
            });
        });
        // if you got them all, yay!
    });
});
//# sourceMappingURL=testAutopublish.js.map