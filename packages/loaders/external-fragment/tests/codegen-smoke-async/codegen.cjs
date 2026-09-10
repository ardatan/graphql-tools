const os = require('node:os');
const path = require('node:path');

const exampleDir = __dirname;
const fixturesDir = path.resolve(exampleDir, '../fixtures');
const packageDir = path.join(fixturesDir, 'fragment-consumer');
const loader = path.resolve(exampleDir, 'async-loader.cjs');

const queryFile = path.join(packageDir, 'src/query.graphql');
const externalFragmentsPointer = path.join(exampleDir, 'external-fragments.graphql');

module.exports = {
  schema: path.join(exampleDir, 'schema.graphql'),
  documents: {
    // Load the operation itself with the normal GraphQL file loader.
    [queryFile]: {},

    // This pointer is handled by the asynchronous custom loader adapter.
    [externalFragmentsPointer]: {
      loader,
      packageDir,
      externalPackagesDirs: [fixturesDir],
      extensions: ['graphql'],
    },
  },
  generates: {
    [path.join(os.tmpdir(), 'external-fragment-codegen-smoke-async-generated.ts')]: {
      plugins: ['typescript', 'typescript-operations'],
    },
  },
};
