# @graphql-tools/load-files

## 8.0.2

### Patch Changes

- Updated dependencies [[`34b740b`](https://github.com/ardatan/graphql-tools/commit/34b740ba11ef58458fd077b12953d9de81221b11)]:
  - @graphql-tools/utils@13.0.2

## 8.0.1

### Patch Changes

- Updated dependencies [[`15efe55`](https://github.com/ardatan/graphql-tools/commit/15efe550f6b8d5c2073dc4ef812031397ddf3506)]:
  - @graphql-tools/utils@13.0.1

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
    - Added dependency [`@graphql-tools/utils@^12.1.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/12.1.0) (to `dependencies`)
    - Removed dependency [`globby@11.1.0` ↗︎](https://www.npmjs.com/package/globby/v/11.1.0) (from `dependencies`)
    - Updated dependency [`graphql@^16.0.0 || ^17.0.0` ↗︎](https://www.npmjs.com/package/graphql/v/16.0.0) (from `^14.0.0 || ^15.0.0 || ^16.0.0 || ^17.0.0`, in `peerDependencies`)
- Updated dependencies [[`1d70c62`](https://github.com/ardatan/graphql-tools/commit/1d70c6262952b14d774b3871eee91c450baf89a8), [`1d70c62`](https://github.com/ardatan/graphql-tools/commit/1d70c6262952b14d774b3871eee91c450baf89a8)]:
  - @graphql-tools/utils@13.0.0

## 7.0.1

### Patch Changes

- [#6846](https://github.com/ardatan/graphql-tools/pull/6846)
  [`72dc6a5`](https://github.com/ardatan/graphql-tools/commit/72dc6a527a14dc04f4590e88c6af7dfb63fa6663)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`unixify@^1.0.0` ↗︎](https://www.npmjs.com/package/unixify/v/1.0.0) (from
    `1.0.0`, in `dependencies`)

## 7.0.0

### Major Changes

- [#5274](https://github.com/ardatan/graphql-tools/pull/5274)
  [`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955)
  Thanks [@ardatan](https://github.com/ardatan)! - Drop Node 14 support. Require Node.js `>= 16`

## 6.6.1

### Patch Changes

- [#4624](https://github.com/ardatan/graphql-tools/pull/4624)
  [`e3167edc`](https://github.com/ardatan/graphql-tools/commit/e3167edc98172fda88ce2306c10c7d4a23d91d67)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Fix CommonJS TypeScript resolution with
  `moduleResolution` `node16` or `nodenext`

## 6.6.0

### Minor Changes

- d76a299c: Support TypeScript module resolution.

## 6.5.4

### Patch Changes

- 041c5ba1: Use caret range for the tslib dependency

## 6.5.3

### Patch Changes

- 525e3910: fix(load-files): use createRequire in case of ESM

## 6.5.2

### Patch Changes

- 4bfb3428: enhance: use ^ for tslib dependency

## 6.5.1

### Patch Changes

- 1043219f: fix implicit dependencies

## 6.5.0

### Minor Changes

- eb80821d: enhance(load-files): return DocumentNode if it is an SDL

## 6.4.0

### Minor Changes

- c5b0719c: feat: GraphQL v16 support

## 6.3.2

### Patch Changes

- 7c6e0083: Remove duplicate code

## 6.3.1

### Patch Changes

- 61889f28: fix(load-files): respect ignoredExtensions even if there is a specific file glob

## 6.3.0

### Minor Changes

- efe8b8a9: feat(load-files): ability to provide a custom extractExports

## 6.2.7

### Patch Changes

- a2e7ff77: Allow extensions and ignoredExtensions options to have a trailing dot

## 6.2.6

### Patch Changes

- 5c7a20db: fix(load-files): fix ignored file bug when filename finishes with extension

## 6.2.5

### Patch Changes

- eacf0dc3: Replace fs-extra with native methods

## 6.2.4

### Patch Changes

- 533d6d53: Bump all packages to allow adjustments
