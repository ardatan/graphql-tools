# @graphql-tools/webpack-loader-runtime

## 7.0.1

### Patch Changes

- [#8383](https://github.com/ardatan/graphql-tools/pull/8383) [`04e8159`](https://github.com/ardatan/graphql-tools/commit/04e8159dd3ea33f2a0df543efd59d581476f9cf7) Thanks [@ardatan](https://github.com/ardatan)! - With `esModule: true`, `#import` of another `.graphql` file now uses `require(...).default`, matching the loader's `export default`. `unique()` also treats a missing `definitions` array as empty so unused imports do not throw.

## 7.0.0

### Major Changes

- [#5274](https://github.com/ardatan/graphql-tools/pull/5274) [`944a68e8`](https://github.com/ardatan/graphql-tools/commit/944a68e8becf9c86b4c97fd17c372d98a285b955) Thanks [@ardatan](https://github.com/ardatan)! - Drop Node 14 support. Require Node.js `>= 16`

## 6.4.1

### Patch Changes

- [#4624](https://github.com/ardatan/graphql-tools/pull/4624) [`e3167edc`](https://github.com/ardatan/graphql-tools/commit/e3167edc98172fda88ce2306c10c7d4a23d91d67) Thanks [@n1ru4l](https://github.com/n1ru4l)! - Fix CommonJS TypeScript resolution with `moduleResolution` `node16` or `nodenext`

## 6.4.0

### Minor Changes

- d76a299c: Support TypeScript module resolution.

## 6.3.1

### Patch Changes

- 4bfb3428: enhance: use ^ for tslib dependency

## 6.3.0

### Minor Changes

- c5b0719c: feat: GraphQL v16 support

## 6.2.4

### Patch Changes

- 533d6d53: Bump all packages to allow adjustments
