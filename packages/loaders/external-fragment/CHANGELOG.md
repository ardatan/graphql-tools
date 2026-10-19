# @graphql-tools/external-fragment-loader

## 1.0.0

### Major Changes

- [#8515](https://github.com/ardatan/graphql-tools/pull/8515) [`1d70c62`](https://github.com/ardatan/graphql-tools/commit/1d70c6262952b14d774b3871eee91c450baf89a8) Thanks [@ardatan](https://github.com/ardatan)! - Drop GraphQL v14/v15 support and require Node.js >= 22.18.
  
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

### Patch Changes

- [#8515](https://github.com/ardatan/graphql-tools/pull/8515) [`1d70c62`](https://github.com/ardatan/graphql-tools/commit/1d70c6262952b14d774b3871eee91c450baf89a8) Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
    - Added dependency [`@graphql-tools/load-files@^7.0.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/load-files/v/7.0.1) (to `dependencies`)
    - Removed dependency [`globby@^11.0.3` ↗︎](https://www.npmjs.com/package/globby/v/11.0.3) (from `dependencies`)
    - Updated dependency [`graphql@^16.0.0 || ^17.0.0` ↗︎](https://www.npmjs.com/package/graphql/v/16.0.0) (from `^14.0.0 || ^15.0.0 || ^16.0.0 || ^17.0.0`, in `peerDependencies`)
- Updated dependencies [[`1d70c62`](https://github.com/ardatan/graphql-tools/commit/1d70c6262952b14d774b3871eee91c450baf89a8), [`1d70c62`](https://github.com/ardatan/graphql-tools/commit/1d70c6262952b14d774b3871eee91c450baf89a8), [`1d70c62`](https://github.com/ardatan/graphql-tools/commit/1d70c6262952b14d774b3871eee91c450baf89a8), [`1d70c62`](https://github.com/ardatan/graphql-tools/commit/1d70c6262952b14d774b3871eee91c450baf89a8), [`a2ef423`](https://github.com/ardatan/graphql-tools/commit/a2ef423a6b3130c7e63cbec863bb2b88494ac07f)]:
  - @graphql-tools/graphql-tag-pluck@9.0.0
  - @graphql-tools/load-files@8.0.0
  - @graphql-tools/utils@13.0.0

## 0.0.1

### Patch Changes

- [#8373](https://github.com/ardatan/graphql-tools/pull/8373) [`4d2537a`](https://github.com/ardatan/graphql-tools/commit/4d2537aa625e0f64d3dccdf590757490618a826d) Thanks [@ikusakov2](https://github.com/ikusakov2)! - Add the external fragment loader package with GraphQL Code Generator custom-loader support.
- Updated dependencies [[`82457d1`](https://github.com/ardatan/graphql-tools/commit/82457d1f5ba4b4fa7ec475e9cc3713a0b2b139e8), [`98673c3`](https://github.com/ardatan/graphql-tools/commit/98673c3531ce0a1b5f5f89e99b3554da5581418d), [`a75d725`](https://github.com/ardatan/graphql-tools/commit/a75d72530f07f6162b45a5627964188cac4cea8b), [`82457d1`](https://github.com/ardatan/graphql-tools/commit/82457d1f5ba4b4fa7ec475e9cc3713a0b2b139e8)]:
  - @graphql-tools/graphql-tag-pluck@8.3.41
  - @graphql-tools/utils@12.1.0
