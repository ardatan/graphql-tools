const Benchmark = require('benchmark');

const runStitchingGateway = require('./stitch');
const runApolloGateway = require('./gateway');

const { join } = require('path');
const { readFileSync } = require('fs');
const { parse, execute, getOperationAST } = require('graphql');

const suite = new Benchmark.Suite();

const testQuery = readFileSync(join(__dirname, './TestQuery.graphql'), 'utf8');
const testQueryAST = parse(testQuery);
const testQueryOperation = getOperationAST(testQueryAST);

const { InMemoryLRUCache } = require('apollo-server-caching');
const apolloCache = new InMemoryLRUCache();
const schemaHash = {};
const metrics = {};
const rootValue = {};
const variableValues = {};
const contextValue = {};

async function runBenchmarks() {
  const [stitchedSchema, { schema: apolloGatewaySchema, executor: apolloGatewayExecutor, stop: stopApolloGateway }] =
    await Promise.all([runStitchingGateway(), runApolloGateway()]);

  suite
    .add('Apollo Gateway', async function () {
      return apolloGatewayExecutor({
        document: testQueryAST,
        request: {
          query: testQuery,
          operationName: undefined,
          variables: variableValues,
        },
        operationName: undefined,
        cache: apolloCache,
        context: contextValue,
        queryHash: testQuery,
        logger: console,
        metrics,
        source: testQuery,
        operation: testQueryOperation,
        schema: apolloGatewaySchema,
        schemaHash,
      });
    })
    .add('Schema Stitching', function () {
      return execute({
        schema: stitchedSchema,
        document: testQueryAST,
        rootValue,
        contextValue,
        variableValues,
      });
    })
    .on('cycle', function (event) {
      console.log(String(event.target));
    })
    .on('complete', function () {
      console.log('Fastest is ' + this.filter('fastest').map('name'));
      stopApolloGateway();
    })
    // run async
    .run({ async: true });
}

runBenchmarks().catch(e => {
  console.error(e);
  process.exit();
});
