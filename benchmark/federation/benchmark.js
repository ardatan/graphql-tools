const Benchmark = require('benchmark');

const runStitchingGateway = require('./stitch');
const runApolloGateway = require('./gateway');

const { join } = require('path');
const { readFileSync } = require('fs');
const { parse, execute, getOperationAST } = require('graphql');

const suite = new Benchmark.Suite();

const testQuery = readFileSync(join(__dirname, './TestQuery.graphql'), 'utf8');
const testQueryAST = parse(testQuery);

async function runBenchmarks() {
  const [stitchedSchema, { schema: apolloGatewaySchema, executor: apolloGatewayExecutor, stop: stopApolloGateway }] =
    await Promise.all([runStitchingGateway(), runApolloGateway()]);

  return new Promise((resolve, reject) => {
    suite
      .add('Apollo Gateway', async function () {
        const result = await apolloGatewayExecutor({
          document: testQueryAST,
          request: {
            query: testQuery,
          },
          cache: {
            get: async () => undefined,
            set: async () => {},
            delete: async () => true,
          },
          schema: apolloGatewaySchema,
        });
        if (result?.errors?.length) {
          console.log(`Apollo Gateway failed`);
          throw new AggregateError(result.errors, `Apollo Gateway failed`);
        }
      })
      .add('Schema Stitching', async function () {
        const result = await execute({
          schema: stitchedSchema,
          document: testQueryAST,
        });
        if (result?.errors?.length) {
          console.log(`Schema Stitching failed`);
          throw new AggregateError(result.errors, `Schema Stitching failed`);
        }
      })
      .on('error', function (error) {
        stopApolloGateway();
        reject(error);
      })
      .on('cycle', function (event) {
        console.log(String(event.target));
      })
      .on('complete', function () {
        console.log('Fastest is ' + this.filter('fastest').map('name'));
        stopApolloGateway();
        resolve();
      })
      // run async
      .run({ async: true, delay: 15, queue: true });
  });
}

runBenchmarks().catch(e => {
  console.error(e);
  process.exit();
});
