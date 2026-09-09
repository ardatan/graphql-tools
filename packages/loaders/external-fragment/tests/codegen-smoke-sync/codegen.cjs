const os = require('node:os');
const path = require('node:path');

const exampleDir = __dirname;
const fixturesDir = path.resolve(exampleDir, '../test-external');
const packageDir = path.join(fixturesDir, 'package-a');

// Use the local built package by default. Set EXTERNAL_FRAGMENT_LOADER to the
// package name when testing an installed/published version instead.
const loader =
  process.env.EXTERNAL_FRAGMENT_LOADER || path.resolve(exampleDir, '../../dist/cjs/index.js');

const queryFile = path.join(packageDir, 'src/query.graphql');
const externalFragmentsPointer = path.join(exampleDir, 'external-fragments.graphql');

module.exports = {
  schema: path.join(exampleDir, 'schema.graphql'),
  documents: {
    // Load the operation itself with the normal GraphQL file loader.
    [queryFile]: {},

    // This pointer is handled by the synchronous custom loader. The pointer
    // value is not used by the loader; packageDir identifies the root.
    [externalFragmentsPointer]: {
      loader,
      packageDir,
      externalPackagesDirs: [fixturesDir],
      extensions: ['graphql'],
    },
  },
  generates: {
    [path.join(os.tmpdir(), 'external-fragment-codegen-smoke-sync-generated.ts')]: {
      plugins: ['typescript', 'typescript-operations'],
    },
  },
};
