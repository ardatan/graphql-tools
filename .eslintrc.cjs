module.exports = {
  reportUnusedDisableDirectives: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
  },
  extends: ['eslint:recommended', 'standard', 'prettier', 'plugin:@typescript-eslint/recommended'],
  plugins: ['@typescript-eslint'],
  rules: {
    'no-empty': 'off',
    'no-console': 'off',
    'no-prototype-builtins': 'off',
    'no-useless-constructor': 'off',
    'no-useless-escape': 'off',
    'no-undef': 'off',
    'no-dupe-class-members': 'off',
    'dot-notation': 'off',
    'no-use-before-define': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-use-before-define': 'off',
    '@typescript-eslint/no-namespace': 'off',
    '@typescript-eslint/no-empty-interface': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/ban-ts-ignore': 'off',
    '@typescript-eslint/return-await': 'error',
    '@typescript-eslint/naming-convention': 'off',
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    'default-param-last': 'off',
    'import/no-extraneous-dependencies': ['error', { devDependencies: ['**/*.test.ts', '**/*.spec.ts'] }],
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: 'graphql',
            importNames: ['ExecutionResult', 'ExecutionArgs', 'execute', 'subscribe'],
            message: 'Please use `execute` and `subscribe` from `@graphql-tools/executro` instead.',
          },
        ],
      },
    ],
  },
  env: {
    es6: true,
    node: true,
  },
  overrides: [
    {
      files: ['**/{test,tests,testing}/**/*.{ts,js}', '*.{spec,test}.{ts,js}'],
      env: {
        jest: true,
      },
      rules: {
        '@typescript-eslint/no-unused-vars': 'off',
        'import/no-extraneous-dependencies': 'off',
      },
    },
    {
      files: ['packages/graphql/**'],
      env: {
        jest: true,
      },
      rules: {
        'unicorn/filename-case': 'off', // we keep the same file names as GraphQL.js
        // TODO: Enable us incrementally
        'no-use-before-define': 'off',
        '@typescript-eslint/prefer-as-const': 'off',
        '@typescript-eslint/ban-ts-comment': 'off',
        '@typescript-eslint/no-inferrable-types': 'off',
        'unicorn/no-lonely-if': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        'prefer-rest-params': 'off',
        'no-throw-literal': 'off',
        'promise/param-names': 'off',
        eqeqeq: 'off',
      },
    },
    {
      files: ['packages/executor/**'],
      env: {
        jest: true,
      },
      rules: {
        // TODO: Enable us incrementally
        '@typescript-eslint/ban-ts-comment': 'off',
        '@typescript-eslint/no-inferrable-types': 'off',
        'prefer-rest-params': 'off',
        'no-throw-literal': 'off',
        'promise/param-names': 'off',
      },
    },
  ],
  ignorePatterns: [
    'dist',
    'node_modules',
    'packages/load/tests/loaders/schema',
    'website',
    'scripts',
    'packages/loaders/code-file/tests/test-files',
    'packages/loaders/git/tests/test-files',
  ],
  globals: {
    BigInt: true,
  },
};
