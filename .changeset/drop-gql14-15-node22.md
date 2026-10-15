---
'cross-inspect': major
'graphql-tools': major
'@graphql-tools/apollo-engine-loader': major
'@graphql-tools/code-file-loader': major
'@graphql-tools/documents': major
'@graphql-tools/executor': major
'@graphql-tools/executor-apollo-link': major
'@graphql-tools/executor-envelop': major
'@graphql-tools/executor-legacy-ws': major
'@graphql-tools/executor-urql-exchange': major
'@graphql-tools/executor-yoga': major
'@graphql-tools/external-fragment-loader': major
'@graphql-tools/github-loader': major
'@graphql-tools/git-loader': major
'@graphql-tools/graphql-file-loader': major
'@graphql-tools/graphql-tag-pluck': major
'@graphql-tools/import': major
'@graphql-tools/jest-transform': major
'@graphql-tools/json-file-loader': major
'@graphql-tools/links': major
'@graphql-tools/load': major
'@graphql-tools/load-files': major
'@graphql-tools/merge': major
'@graphql-tools/mock': major
'@graphql-tools/module-loader': major
'@graphql-tools/node-require': major
'@graphql-tools/optimize': major
'@graphql-tools/relay-operation-optimizer': major
'@graphql-tools/resolvers-composition': major
'@graphql-tools/schema': major
'@graphql-tools/url-loader': major
'@graphql-tools/utils': major
'@graphql-tools/webpack-loader': major
'@graphql-tools/webpack-loader-runtime': major
---

Drop GraphQL v14/v15 and require Node.js >= 22.

- Peer dependency on `graphql` is now `^16.0.0 || ^17.0.0`.
- Engines require `node: >=22.0.0`.
- Remove the local `getArgumentValues` / `coerceInputs` / `graphqlJSCompat` forks; use `graphql`'s `getArgumentValues`.
- Remove `createDeferred` / `createDeferredPromise` re-exports; use `Promise.withResolvers()` instead.
- Replace `globby` with Node's built-in `fs.glob`. File matching lives on `@graphql-tools/load-files` as `matchFiles` / `matchFilesSync` (no longer exported from `@graphql-tools/utils`).
- Memoization: call sites in this monorepo use the `memoizee` package directly (`memoizee` + `normalizer` for multi-arg identity caching, `memoizee/weak.js` for single-arg). The custom WeakMap implementations are gone. Compatibility exports `memoize1` / `memoize2` / `memoize3` / `memoize5` / `memoize2of4` remain as thin `memoizee` wrappers for gateway packages; prefer importing `memoizee` directly in new code. Unused `memoize4` / `memoize2of5` exports are removed.
- Prefer `new GraphQLError(message, options)` for ordinary errors. `createGraphQLError` remains only for the experimental `coordinate` field and GraphQLError-like `originalError` coercion.
- Remove other legacy GraphQL <16 branches (error construction, document validation rule names, `URL.canParse` fallback).
