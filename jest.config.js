const { resolve } = require('path');
const { pathsToModuleNameMapper } = require('ts-jest');
const CI = !!process.env.CI;

const ROOT_DIR = __dirname;
const TSCONFIG = resolve(ROOT_DIR, 'tsconfig.json');
const tsconfig = require(TSCONFIG);

const ESM_PACKAGES = ['graphql', 'graphql-upload', 'fs-capacitor'];

const modulePathIgnorePatterns = ['dist', 'test-assets', 'test-files', 'fixtures', '.bob'];

// Higher versions have only ESM support so we're good if import fails in CJS here
try {
  const { versionInfo } = require('graphql');

  if (versionInfo.major < 16) {
    modulePathIgnorePatterns.push('federation');
  }
} catch (e) {}

const externalToolsPackages = [
  '@graphql-tools/batch-delegate',
  '@graphql-tools/batch-execute',
  '@graphql-tools/delegate',
  '@graphql-tools/stitch',
  '@graphql-tools/wrap',
  '@graphql-tools/executor-common',
  '@graphql-tools/executor-http',
  '@graphql-tools/executor-graphql-ws',
];

const externalModulesMapper = {};

externalToolsPackages.forEach(mod => {
  externalModulesMapper[`^${mod}$`] = require.resolve(mod);
});

module.exports = {
  displayName: process.env.LEAK_TEST ? 'Leak Test' : 'Unit Test',
  testEnvironment: 'node',
  rootDir: ROOT_DIR,
  prettierPath: null, // disable prettier for inline snapshots
  restoreMocks: true,
  reporters: ['default'],
  modulePathIgnorePatterns,
  moduleNameMapper: {
    ...externalModulesMapper,
    ...pathsToModuleNameMapper(tsconfig.compilerOptions.paths, {
      prefix: `${ROOT_DIR}/`,
    }),
    ...externalModulesMapper,
  },
  collectCoverage: false,
  cacheDirectory: resolve(ROOT_DIR, `${CI ? '' : 'node_modules/'}.cache/jest`),
  transform: {
    '^.+\\.mjs?$': 'babel-jest',
    '^.+\\.ts?$': 'babel-jest',
    '^.+\\.js$': 'babel-jest',
  },
  transformIgnorePatterns: [`node_modules/(?!(${ESM_PACKAGES.join('|')})/)`],
  resolver: 'bob-the-bundler/jest-resolver',
};
