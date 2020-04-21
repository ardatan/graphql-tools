const { resolve } = require('path');
const CI = !!process.env.CI;

module.exports = {
  transform: { '^.+\\.tsx?$': 'ts-jest' },
  testEnvironment: 'node',
  rootDir: process.cwd(),
  globals: {
    'ts-jest': {
      tsConfig: 'tsconfig.json'
    }
  },
  restoreMocks: true,
  reporters: ['default'],
  modulePathIgnorePatterns: ['dist'],
  collectCoverage: CI,
  collectCoverageFrom: ['src', '!src/test']
};
