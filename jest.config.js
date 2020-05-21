const { resolve } = require('path');
const { pathsToModuleNameMapper } = require('ts-jest/utils');

const ROOT_DIR = __dirname;
const TSCONFIG = resolve(ROOT_DIR, 'tsconfig.json');
const tsconfig = require(TSCONFIG);

module.exports = {
  transform: { '^.+\\.tsx?$': 'ts-jest' },
  testEnvironment: 'node',
  rootDir: ROOT_DIR,
  globals: {
    'ts-jest': {
      diagnostics: false,
      tsConfig: TSCONFIG,
    },
  },
  restoreMocks: true,
  reporters: ['default'],
  modulePathIgnorePatterns: [
    'dist',
    'test-assets',
    'test-files',
    'fixtures'
  ],
  moduleNameMapper: pathsToModuleNameMapper(tsconfig.compilerOptions.paths, { prefix: `${ROOT_DIR}/` }),
  collectCoverage: false,
};
