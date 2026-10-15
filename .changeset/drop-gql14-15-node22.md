---
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

Drop GraphQL v14/v15 support and require Node.js >= 22.18.

- `graphql` peer range is now `^16.0.0 || ^17.0.0`.
- `engines.node` is now `>=22.18.0` (Node `fs.glob` + Babel 8).
- Dev tooling and `@graphql-tools/graphql-tag-pluck` move to Babel 8 (`@babel/core` / parser / traverse / types).
- The standalone `cross-inspect` package is discontinued. Use `inspect` from `@graphql-tools/utils` instead (Node `util.inspect` via `process.getBuiltinModule`, with a small `JSON.stringify` / `String` fallback).

### Removed `@graphql-tools/utils` exports

| Removed | Use instead |
| --- | --- |
| `getArgumentValues` | `import { getArgumentValues } from 'graphql'` |
| `coerceInputs` / `graphqlJSCompat` | graphql@16+ APIs (`getArgumentValues`, etc.) |
| `createDeferred` / `createDeferredPromise` | `const { promise, resolve, reject } = Promise.withResolvers()` |
| `createGraphQLError` | `new GraphQLError(message, options)` from `graphql` |
| `mapMaybePromise` | `handleMaybePromise` from `@whatwg-node/promise-helpers` |
| `isPromise` / `fakePromise` / `mapAsyncIterator` / `MaybePromise` | `@whatwg-node/promise-helpers` |
| `registerAbortSignalListener` / `getAbortPromise` | `AbortSignal` APIs (`throwIfAborted`, `addEventListener('abort', …, { once: true })`, `AbortSignal.any`, …) |
| `withCancel` / `getAsyncIterableWithCancel` / `getAsyncIteratorWithCancel` | Handle cancellation on the async iterator’s `return()` (or your transport abort path) |
| `debugTimerStart` / `debugTimerEnd` | Your own timing / `console.time` if needed |
| `PromiseWithResolvers` (type) | Built-in `PromiseWithResolvers<T>` / return type of `Promise.withResolvers()` |

`inspect` and the WeakMap `memoize1`…`memoize2of5` helpers remain on `@graphql-tools/utils` (inspect is no longer re-exported from `cross-inspect`).

### File matching (`globby` → `fs.glob`)

Loaders and `@graphql-tools/load-files` now use Node’s `fs.glob` through:

```ts
import { matchFiles, matchFilesSync } from '@graphql-tools/load-files';
```

Directory symlinks are followed for recursive (`**`) patterns:

- On Node.js ≥26.1 (and ≥24.16 where backported), `fs.glob` `followSymlinks` is used.
- On older engines, symlink directories are discovered only under each pattern’s literal prefix (not the whole `cwd`) and patterns are re-rooted.
- Non-recursive / literal patterns skip the symlink walk entirely.

`@graphql-tools/executor` hot-path caches (`collectSubfields`, argument coercion, `@stream` detection) use `memoize2` / `memoize3` from utils. `collectSubFields` in utils stays unmemoized so the executor can own a single memoize3 layer.

### Errors and other cleanup

- Prefer `new GraphQLError(message, options)` from `graphql`. Experimental schema `coordinate` support remains on `locatedError` / `relocatedError` / `getSchemaCoordinate`.
- Removed GraphQL <16 compatibility branches (error construction, validation rule name suffixes, `URL.canParse` fallback).
- Promise helpers should be imported from `@whatwg-node/promise-helpers` (`handleMaybePromise`, `isPromise`, `fakePromise`, `mapAsyncIterator`, `MaybePromise`) rather than re-exported from utils.
