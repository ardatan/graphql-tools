# GraphQL Code Generator sync-loader smoke test

This config loads `package-a`'s query normally and loads `UserFields` and `UserEmail` through the
package's synchronous default custom loader.

From the repository root:

```sh
npm install --save-dev \
  @graphql-codegen/cli \
  @graphql-codegen/typescript \
  @graphql-codegen/typescript-operations
```

```sh
npx bob build --incremental
npx --no-install graphql-codegen \
  --config packages/loaders/external-fragment/tests/codegen-smoke-sync/codegen.cjs
```

The Codegen CLI and plugins must be installed in the project where the command is run:

```sh
npm install --save-dev @graphql-codegen/cli @graphql-codegen/typescript @graphql-codegen/typescript-operations
```

The config uses the local `dist/cjs` build by default. To test an installed or published package
instead, set the loader override before running Codegen:

```sh
EXTERNAL_FRAGMENT_LOADER=@graphql-tools/external-fragment-loader \
  npx --no-install graphql-codegen \
  --config packages/loaders/external-fragment/tests/codegen-smoke-sync/codegen.cjs
```

The generated file is written to the system temporary directory:

The generated file is written to the system temporary directory:

```sh
output_file="$(node -p "require('node:os').tmpdir() + '/external-fragment-codegen-smoke-sync-generated.ts'")"
vi $output_file
```
