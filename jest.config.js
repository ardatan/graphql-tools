const { resolve } = require('path');
const { pathsToModuleNameMapper } = require('ts-jest');
const CI = !!process.env.CI;

const ROOT_DIR = __dirname;
const TSCONFIG = resolve(ROOT_DIR, 'tsconfig.json');
const tsconfig = require(TSCONFIG);

const ESM_PACKAGES = ['graphql', 'graphql-upload', 'fs-capacitor'];

module.exports = {
  testEnvironment: 'node',
  rootDir: ROOT_DIR,
  restoreMocks: true,
  reporters: ['default'],
  modulePathIgnorePatterns: ['dist', 'test-assets', 'test-files', 'fixtures', '.bob'],
  moduleNameMapper: pathsToModuleNameMapper(tsconfig.compilerOptions.paths, { prefix: `${ROOT_DIR}/` }),
  collectCoverage: false,
  cacheDirectory: resolve(ROOT_DIR, `${CI ? '' : 'node_modules/'}.cache/jest`),
  transform: {
    '^.+\\.mjs?$': 'babel-jest',
    '^.+\\.ts?$': 'babel-jest',
    '^.+\\.js$': 'babel-jest',
  },
  transformIgnorePatterns: [`node_modules/(?!(${ESM_PACKAGES.join('|')})/)`],
  resolver: 'bob-the-bundler/jest-resolver.js',
};
