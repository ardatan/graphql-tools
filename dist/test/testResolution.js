"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var __1 = require("..");
var graphql_1 = require("graphql");
var graphql_subscriptions_1 = require("graphql-subscriptions");
describe('Resolve', function () {
    describe('addSchemaLevelResolveFunction', function () {
        var pubsub = new graphql_subscriptions_1.PubSub();
        var typeDefs = "\n      type RootQuery {\n        printRoot: String!\n        printRootAgain: String!\n      }\n\n      type RootMutation {\n        printRoot: String!\n      }\n\n      type RootSubscription {\n        printRoot: String!\n      }\n\n      schema {\n        query: RootQuery\n        mutation: RootMutation\n        subscription: RootSubscription\n      }\n    ";
        var printRoot = function (root) { return root.toString(); };
        var resolvers = {
            RootQuery: {
                printRoot: printRoot,
                printRootAgain: printRoot,
            },
            RootMutation: {
                printRoot: printRoot,
            },
            RootSubscription: {
                printRoot: printRoot,
            },
        };
        var schema = __1.makeExecutableSchema({ typeDefs: typeDefs, resolvers: resolvers });
        var schemaLevelResolveFunctionCalls = 0;
        __1.addSchemaLevelResolveFunction(schema, function (root) {
            schemaLevelResolveFunctionCalls += 1;
            return root;
        });
        var subcriptionManager = new graphql_subscriptions_1.SubscriptionManager({
            schema: schema,
            pubsub: pubsub,
            setupFunctions: {
                printRoot: function () { return ({
                    printRoot: {
                        filter: function () { return true; },
                    },
                }); },
            },
        });
        it('should run the schema level resolver once in a same query', function () {
            schemaLevelResolveFunctionCalls = 0;
            var root = 'queryRoot';
            return graphql_1.graphql(schema, "\n        query TestOnce {\n          printRoot\n          printRootAgain\n        }\n      ", root).then(function (_a) {
                var data = _a.data;
                chai_1.assert.deepEqual(data, {
                    printRoot: root,
                    printRootAgain: root,
                });
                chai_1.assert.equal(schemaLevelResolveFunctionCalls, 1);
            });
        });
        it('should isolate roots from the different operation types', function (done) {
            schemaLevelResolveFunctionCalls = 0;
            var queryRoot = 'queryRoot';
            var mutationRoot = 'mutationRoot';
            var subscriptionRoot = 'subscriptionRoot';
            var subscriptionRoot2 = 'subscriptionRoot2';
            var subsCbkCalls = 0;
            var firstSubsTriggered = new Promise(function (resolveFirst) {
                subcriptionManager.subscribe({
                    query: "\n            subscription TestSubscription {\n              printRoot\n            }\n          ",
                    operationName: 'TestSubscription',
                    callback: function (err, _a) {
                        var subsData = _a.data;
                        subsCbkCalls++;
                        if (err) {
                            done(err);
                        }
                        try {
                            if (subsCbkCalls === 1) {
                                chai_1.assert.equal(schemaLevelResolveFunctionCalls, 1);
                                chai_1.assert.deepEqual(subsData, { printRoot: subscriptionRoot });
                                return resolveFirst();
                            }
                            else if (subsCbkCalls === 2) {
                                chai_1.assert.equal(schemaLevelResolveFunctionCalls, 4);
                                chai_1.assert.deepEqual(subsData, { printRoot: subscriptionRoot2 });
                                return done();
                            }
                        }
                        catch (e) {
                            return done(e);
                        }
                        done(new Error('Too many subscription fired'));
                    },
                });
            });
            pubsub.publish('printRoot', subscriptionRoot);
            firstSubsTriggered.then(function () {
                return graphql_1.graphql(schema, "\n          query TestQuery {\n            printRoot\n          }\n        ", queryRoot);
            })
                .then(function (_a) {
                var data = _a.data;
                chai_1.assert.equal(schemaLevelResolveFunctionCalls, 2);
                chai_1.assert.deepEqual(data, { printRoot: queryRoot });
                return graphql_1.graphql(schema, "\n          mutation TestMutation {\n            printRoot\n          }\n        ", mutationRoot);
            })
                .then(function (_a) {
                var mutationData = _a.data;
                chai_1.assert.equal(schemaLevelResolveFunctionCalls, 3);
                chai_1.assert.deepEqual(mutationData, { printRoot: mutationRoot });
                pubsub.publish('printRoot', subscriptionRoot2);
            })
                .catch(done);
        });
    });
});
//# sourceMappingURL=testResolution.js.map