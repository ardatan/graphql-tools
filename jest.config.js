/* eslint-disable no-implicit-coercion */
/* eslint-disable import/no-commonjs */
/* eslint-disable import/unambiguous */
const CI = !!process.env.CI;

module.exports = {
  transform: { '^.+\\.tsx?$': 'ts-jest' },
  testEnvironment: 'node',
  rootDir: process.cwd(),
  globals: {
    'ts-jest': {
      diagnostics: false,
      tsConfig: 'tsconfig.json'
    }
  },
  restoreMocks: true,
  reporters: ['default'],
  modulePathIgnorePatterns: ['dist'],
  collectCoverage: CI,
  collectCoverageFrom: ['src', '!src/test']
};
