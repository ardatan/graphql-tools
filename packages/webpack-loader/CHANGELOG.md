# @graphql-tools/webpack-loader

## 8.0.1

### Patch Changes

- [#8572](https://github.com/ardatan/graphql-tools/pull/8572) [`8bbb097`](https://github.com/ardatan/graphql-tools/commit/8bbb09716917acdf94218841db829b91dbb16cac) Thanks [@ardatan](https://github.com/ardatan)! - Document all webpack-loader options in the README and JSDoc.

## 8.0.0

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
  - Removed GraphQL versions older than 16 compatibility branches (error construction, validation rule name suffixes, `URL.canParse` fallback).
  - Promise helpers should be imported from `@whatwg-node/promise-helpers` (`handleMaybePromise`, `isPromise`, `fakePromise`, `mapAsyncIterator`, `MaybePromise`) rather than re-exported from utils.

### Patch Changes

- [#8515](https://github.com/ardatan/graphql-tools/pull/8515) [`1d70c62`](https://github.com/ardatan/graphql-tools/commit/1d70c6262952b14d774b3871eee91c450baf89a8) Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
    - Updated dependency [`graphql@^16.0.0 || ^17.0.0` ↗︎](https://www.npmjs.com/package/graphql/v/16.0.0) (from `^14.0.0 || ^15.0.0 || ^16.0.0 || ^17.0.0`, in `peerDependencies`)
- Updated dependencies [[`1d70c62`](https://github.com/ardatan/graphql-tools/commit/1d70c6262952b14d774b3871eee91c450baf89a8), [`1d70c62`](https://github.com/ardatan/graphql-tools/commit/1d70c6262952b14d774b3871eee91c450baf89a8), [`1d70c62`](https://github.com/ardatan/graphql-tools/commit/1d70c6262952b14d774b3871eee91c450baf89a8)]:
  - @graphql-tools/optimize@3.0.0
  - @graphql-tools/webpack-loader-runtime@8.0.0

## 7.0.1

### Patch Changes

- [#8383](https://github.com/ardatan/graphql-tools/pull/8383) [`04e8159`](https://github.com/ardatan/graphql-tools/commit/04e8159dd3ea33f2a0df543efd59d581476f9cf7) Thanks [@ardatan](https://github.com/ardatan)! - With `esModule: true`, `#import` of another `.graphql` file now uses `require(...).default`, matching the loader's `export default`. `unique()` also treats a missing `definitions` array as empty so unused imports do not throw.
- Updated dependencies [[`57e316d`](https://github.com/ardatan/graphql-tools/commit/57e316d1ee21668761d6b8ad7692e494db8ffab4), [`04e8159`](https://github.com/ardatan/graphql-tools/commit/04e8159dd3ea33f2a0df543efd59d581476f9cf7)]:
  - @graphql-tools/optimize@2.0.1
  - @graphql-tools/webpack-loader-runtime@7.0.1

## 7.0.0

### Major Changes

- [#5274](https://github.com/ardatan/graphql-tools/pull/5274) [`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955) Thanks [@ardatan](https://github.com/ardatan)! - Drop Node 14 support. Require Node.js `>= 16`

### Patch Changes

- Updated dependencies [[`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955)]:
  - @graphql-tools/optimize@2.0.0
  - @graphql-tools/webpack-loader-runtime@7.0.0

## 6.7.2

### Patch Changes

- Updated dependencies [[`c6817c59`](https://github.com/ardatan/graphql-tools/commit/c6817c596314795165f531feca408f78d29e9f6d)]:
  - @graphql-tools/optimize@1.4.0

## 6.7.1

### Patch Changes

- [#4624](https://github.com/ardatan/graphql-tools/pull/4624) [`e3167edc`](https://github.com/ardatan/graphql-tools/commit/e3167edc98172fda88ce2306c10c7d4a23d91d67) Thanks [@n1ru4l](https://github.com/n1ru4l)! - Fix CommonJS TypeScript resolution with `moduleResolution` `node16` or `nodenext`

- Updated dependencies [[`e3167edc`](https://github.com/ardatan/graphql-tools/commit/e3167edc98172fda88ce2306c10c7d4a23d91d67)]:
  - @graphql-tools/optimize@1.3.1
  - @graphql-tools/webpack-loader-runtime@6.4.1

## 6.7.0

### Minor Changes

- d76a299c: Support TypeScript module resolution.

### Patch Changes

- Updated dependencies [d76a299c]
  - @graphql-tools/optimize@1.3.0
  - @graphql-tools/webpack-loader-runtime@6.4.0

## 6.6.3

### Patch Changes

- 041c5ba1: Use caret range for the tslib dependency
- Updated dependencies [041c5ba1]
  - @graphql-tools/optimize@1.2.1

## 6.6.2

### Patch Changes

- 0c0c6857: fix - align versions

## 6.6.1

### Patch Changes

- 4bfb3428: enhance: use ^ for tslib dependency
- Updated dependencies [4bfb3428]
  - @graphql-tools/optimize@1.1.1
  - @graphql-tools/webpack-loader-runtime@6.3.1

## 6.6.0

### Minor Changes

- c5b0719c: feat: GraphQL v16 support

### Patch Changes

- Updated dependencies [c5b0719c]
  - @graphql-tools/optimize@1.1.0
  - @graphql-tools/webpack-loader-runtime@6.3.0

## 6.5.1

### Patch Changes

- e50852e6: use version ranges instead of a fixed version for the graphql-tools package versions

## 6.5.0

### Minor Changes

- 5a4d198b: feat(webpack-loader): export Options

## 6.4.0

### Minor Changes

- b35f5edf: Introduce replaceKinds option to replace kinds as strings with Kind of graphql-js

## 6.3.1

### Patch Changes

- Updated dependencies [fb14cd28]
  - @graphql-tools/optimize@1.0.1

## 6.3.0

### Minor Changes

- bd1ba4bd: Added support for additional optimizations: "noEmptyNodes" (for removing empty `arguments`, `directives` and `variableDefinitions` from GraphQL operations)

### Patch Changes

- Updated dependencies [bd1ba4bd]
  - @graphql-tools/optimize@1.0.0

## 6.2.4

### Patch Changes

- 533d6d53: Bump all packages to allow adjustments
- Updated dependencies [533d6d53]
  - @graphql-tools/webpack-loader-runtime@6.2.4
