# @graphql-tools/jest-transform

## 3.0.0

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
    - Updated dependency [`graphql@^16.0.0 || ^17.0.0` ↗︎](https://www.npmjs.com/package/graphql/v/16.0.0) (from `^14.0.0 || ^15.0.0 || ^16.0.0 || ^17.0.0`, in `peerDependencies`)
- Updated dependencies [[`1d70c62`](https://github.com/ardatan/graphql-tools/commit/1d70c6262952b14d774b3871eee91c450baf89a8), [`1d70c62`](https://github.com/ardatan/graphql-tools/commit/1d70c6262952b14d774b3871eee91c450baf89a8)]:
  - @graphql-tools/webpack-loader@8.0.0

## 2.0.2

### Patch Changes

- Updated dependencies [[`04e8159`](https://github.com/ardatan/graphql-tools/commit/04e8159dd3ea33f2a0df543efd59d581476f9cf7)]:
  - @graphql-tools/webpack-loader@7.0.1

## 2.0.1

### Patch Changes

- [#7243](https://github.com/ardatan/graphql-tools/pull/7243)
  [`7dcd7a2`](https://github.com/ardatan/graphql-tools/commit/7dcd7a2053c4cc0cf825030b04ba8c3b56f3588d)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@jest/transform@^30.0.0` ↗︎](https://www.npmjs.com/package/@jest/transform/v/30.0.0) (from
    `^29.0.0`, in `dependencies`)
  - Updated dependency
    [`@jest/types@^30.0.0` ↗︎](https://www.npmjs.com/package/@jest/types/v/30.0.0) (from `^29.0.0`,
    in `dependencies`)

- [#7246](https://github.com/ardatan/graphql-tools/pull/7246)
  [`76aa1b1`](https://github.com/ardatan/graphql-tools/commit/76aa1b191f6bfef7507ac326cbfcfe5cbb822922)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@jest/transform@^30.0.0` ↗︎](https://www.npmjs.com/package/@jest/transform/v/30.0.0) (from
    `^29.0.0`, in `dependencies`)
  - Updated dependency
    [`@jest/types@^30.0.0` ↗︎](https://www.npmjs.com/package/@jest/types/v/30.0.0) (from `^29.0.0`,
    in `dependencies`)

## 2.0.0

### Major Changes

- [#5274](https://github.com/ardatan/graphql-tools/pull/5274)
  [`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955)
  Thanks [@ardatan](https://github.com/ardatan)! - Drop Node 14 support. Require Node.js `>= 16`

### Patch Changes

- Updated dependencies
  [[`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955)]:
  - @graphql-tools/webpack-loader@7.0.0

## 1.2.3

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/webpack-loader@6.7.2

## 1.2.2

### Patch Changes

- [#4671](https://github.com/ardatan/graphql-tools/pull/4671)
  [`96c9e4df`](https://github.com/ardatan/graphql-tools/commit/96c9e4dff2866776661b992b9e481c4eabfcf2a0)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@jest/transform@^29.0.0` ↗︎](https://www.npmjs.com/package/@jest/transform/v/null) (from
    `^28.0.0`, in `dependencies`)
  - Updated dependency [`@jest/types@^29.0.0` ↗︎](https://www.npmjs.com/package/@jest/types/v/null)
    (from `^28.0.0`, in `dependencies`)

## 1.2.1

### Patch Changes

- [#4624](https://github.com/ardatan/graphql-tools/pull/4624)
  [`e3167edc`](https://github.com/ardatan/graphql-tools/commit/e3167edc98172fda88ce2306c10c7d4a23d91d67)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Fix CommonJS TypeScript resolution with
  `moduleResolution` `node16` or `nodenext`

- Updated dependencies
  [[`e3167edc`](https://github.com/ardatan/graphql-tools/commit/e3167edc98172fda88ce2306c10c7d4a23d91d67)]:
  - @graphql-tools/webpack-loader@6.7.1

## 1.2.0

### Minor Changes

- d76a299c: Support TypeScript module resolution.

### Patch Changes

- Updated dependencies [d76a299c]
  - @graphql-tools/webpack-loader@6.7.0

## 1.1.5

### Patch Changes

- 041c5ba1: Use caret range for the tslib dependency
- Updated dependencies [041c5ba1]
  - @graphql-tools/webpack-loader@6.6.3

## 1.1.4

### Patch Changes

- bf89eae0: fix(jest-transform): add default export for Jest 28 support

## 1.1.3

### Patch Changes

- fc7fe4a4: Jest 18 support

## 1.1.2

### Patch Changes

- 0c0c6857: fix - align versions
- Updated dependencies [0c0c6857]
  - @graphql-tools/webpack-loader@6.6.2

## 1.1.1

### Patch Changes

- 4bfb3428: enhance: use ^ for tslib dependency
- Updated dependencies [4bfb3428]
  - @graphql-tools/webpack-loader@6.6.1

## 1.1.0

### Minor Changes

- c5b0719c: feat: GraphQL v16 support

### Patch Changes

- Updated dependencies [c5b0719c]
  - @graphql-tools/webpack-loader@6.6.0

## 1.0.0

### Major Changes

- 5a4d198b: new jest transform

### Patch Changes

- Updated dependencies [5a4d198b]
  - @graphql-tools/webpack-loader@6.5.0
