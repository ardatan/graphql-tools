const { defineConfig, globalIgnores } = require('eslint/config');

const tsParser = require('@typescript-eslint/parser');

const { fixupConfigRules, fixupPluginRules } = require('@eslint/compat');

const typescriptEslint = require('@typescript-eslint/eslint-plugin');
const _import = require('eslint-plugin-import');
const globals = require('globals');
const js = require('@eslint/js');

const { FlatCompat } = require('@eslint/eslintrc');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

module.exports = defineConfig([
  {
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },

    languageOptions: {
      parser: tsParser,

      parserOptions: {
        project: './tsconfig.json',
      },

      globals: {
        ...globals.node,
        BigInt: true,
      },
    },

    extends: fixupConfigRules(
      compat.extends(
        'eslint:recommended',
        'standard',
        'prettier',
        'plugin:@typescript-eslint/recommended',
        'plugin:import/typescript',
      ),
    ),

    plugins: {
      '@typescript-eslint': fixupPluginRules(typescriptEslint),
      import: fixupPluginRules(_import),
    },

    rules: {
      'no-empty': 'off',
      'no-console': 'off',
      'no-prototype-builtins': 'off',
      'no-useless-assignment': 'off',
      'no-useless-constructor': 'off',
      'no-useless-escape': 'off',
      'no-undef': 'off',
      'no-dupe-class-members': 'off',
      'dot-notation': 'off',
      'no-use-before-define': 'off',
      // New in ESLint 10 recommended; keep existing throw patterns for now.
      'preserve-caught-error': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
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

      'import/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: ['**/*.test.ts', '**/*.spec.ts'],
        },
      ],

      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'graphql',
              importNames: ['ExecutionResult', 'ExecutionArgs', 'execute', 'subscribe'],
              message:
                'Please use `execute` and `subscribe` from `@graphql-tools/executor` instead.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/{test,tests,testing}/**/*.{ts,js}', '**/*.{spec,test}.{ts,js}'],

    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },

    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      'import/no-extraneous-dependencies': 'off',
    },
  },
  {
    files: ['packages/graphql/**'],

    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },

    rules: {
      'unicorn/filename-case': 'off',
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

    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },

    rules: {
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
      'prefer-rest-params': 'off',
      'no-throw-literal': 'off',
      'promise/param-names': 'off',
    },
  },
  {
    files: ['**/*.ts'],
    ignores: ['**/{test,tests,testing}/**/*.{ts,js}', '**/*.{spec,test}.{ts,js}'],

    rules: {
      'import/extensions': ['error', 'ignorePackages'],
    },
  },
  globalIgnores([
    '**/.bob',
    '**/dist',
    '**/node_modules',
    'packages/load/tests/loaders/schema',
    '**/website',
    '**/scripts',
    'packages/loaders/code-file/tests/test-files',
    'packages/loaders/git/tests/test-files',
  ]),
]);
