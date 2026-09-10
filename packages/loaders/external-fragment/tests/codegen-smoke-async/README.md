# GraphQL Code Generator async-loader smoke test

This config loads `fragment-consumer`'s query normally and loads `UserFields` and `UserEmail`
through an asynchronous custom loader. The adapter in `async-loader.cjs` uses
`ExternalFragmentLoader.load()` and merges its `Source[]` result into the single `DocumentNode`
required by Codegen.

From the repository root:

```sh
npx bob build --incremental
npx --no-install graphql-codegen \
  --config packages/loaders/external-fragment/tests/codegen-smoke-async/codegen.cjs
```

The Codegen CLI and plugins must be installed in the project where the command is run:

```sh
npm install --save-dev \
  @graphql-codegen/cli \
  @graphql-codegen/typescript \
  @graphql-codegen/typescript-operations
```

The adapter uses the local `dist/cjs` build by default. To test an installed or published package
instead, set the package override before running Codegen:

```sh
EXTERNAL_FRAGMENT_PACKAGE=@graphql-tools/external-fragment-loader \
  npx --no-install graphql-codegen \
  --config packages/loaders/external-fragment/tests/codegen-smoke-async/codegen.cjs
```

The generated file is written to the system temporary directory:

```sh
output_file="$(node -p "require('node:os').tmpdir() + '/external-fragment-codegen-smoke-async-generated.ts'")"
vi $output_file
```
