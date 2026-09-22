# GraphQL Code Generator async-resolver smoke test

This config loads `fragment-consumer`'s query normally and loads `UserFields` and `UserEmail`
through the package's default loader with `async: true`. Codegen uses its asynchronous document
loading path, so the loader can use the asynchronous resolver without a custom adapter.

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

The config uses the local `dist/cjs` build by default. To test an installed or published package
instead, set the loader override before running Codegen:

```sh
EXTERNAL_FRAGMENT_LOADER=@graphql-tools/external-fragment-loader \
  npx --no-install graphql-codegen \
  --config packages/loaders/external-fragment/tests/codegen-smoke-async/codegen.cjs
```

The generated file is written to the system temporary directory:

```sh
output_file="$(node -p "require('node:os').tmpdir() + '/external-fragment-codegen-smoke-async-generated.ts'")"
vi $output_file
```
