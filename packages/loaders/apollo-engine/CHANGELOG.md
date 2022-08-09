# @graphql-tools/apollo-engine-loader

## 7.3.7

### Patch Changes

- [#4624](https://github.com/ardatan/graphql-tools/pull/4624) [`e3167edc`](https://github.com/ardatan/graphql-tools/commit/e3167edc98172fda88ce2306c10c7d4a23d91d67) Thanks [@n1ru4l](https://github.com/n1ru4l)! - Fix CommonJS TypeScript resolution with `moduleResolution` `node16` or `nodenext`

- Updated dependencies [[`e3167edc`](https://github.com/ardatan/graphql-tools/commit/e3167edc98172fda88ce2306c10c7d4a23d91d67)]:
  - @graphql-tools/utils@8.9.1

## 7.3.6

### Patch Changes

- 3c8fb360: chore(deps): update @whatwg-node/fetch to fix vulnerability

## 7.3.5

### Patch Changes

- Updated dependencies [2a3b45e3]
  - @graphql-tools/utils@8.9.0

## 7.3.2

### Patch Changes

- eda0da95: Replace 'cross-undici-fetch' with '@whatwg-node/fetch' since the previous one is deprecated

## 7.3.1

### Patch Changes

- ead60ca3: Upgrade cross-undici-fetch to the latest that uses undici@5.5.1 as pinned dependency until the issues with 5.6.0 fixed

## 7.3.0

### Minor Changes

- d76a299c: Support TypeScript module resolution.

### Patch Changes

- Updated dependencies [a0abbbcd]
- Updated dependencies [d76a299c]
  - @graphql-tools/utils@8.8.0

## 7.2.20

### Patch Changes

- Updated dependencies [4914970b]
  - @graphql-tools/utils@8.7.0

## 7.2.19

### Patch Changes

- 041c5ba1: Use caret range for the tslib dependency
- Updated dependencies [041c5ba1]
  - @graphql-tools/utils@8.6.13

## 7.2.18

### Patch Changes

- Updated dependencies [da7ad43b]
  - @graphql-tools/utils@8.6.12

## 7.2.17

### Patch Changes

- Updated dependencies [c0762ee3]
  - @graphql-tools/utils@8.6.11

## 7.2.16

### Patch Changes

- Updated dependencies [0fc510cb]
  - @graphql-tools/utils@8.6.10

## 7.2.15

### Patch Changes

- 627565a8: Bump cross-undici-fetch

## 7.2.14

### Patch Changes

- 84ae31ea: Bump cross-undici-fetch

## 7.2.13

### Patch Changes

- 3d89a26e: Bump cross-undici-fetch for Node 14 compat

## 7.2.12

### Patch Changes

- 4b70d2be: Bump cross-undici-fetch for Node 18 compatibility

## 7.2.11

### Patch Changes

- Updated dependencies [31a33e2b]
  - @graphql-tools/utils@8.6.9

## 7.2.10

### Patch Changes

- Updated dependencies [cb238877]
  - @graphql-tools/utils@8.6.8

## 7.2.9

### Patch Changes

- Updated dependencies [0bbb1769]
  - @graphql-tools/utils@8.6.7

## 7.2.8

### Patch Changes

- fe9402af: Bump data-loader and cross-undici-fetch

## 7.2.7

### Patch Changes

- Updated dependencies [904c0847]
  - @graphql-tools/utils@8.6.6

## 7.2.6

### Patch Changes

- Updated dependencies [be2c02d7]
  - @graphql-tools/utils@8.6.5

## 7.2.5

### Patch Changes

- Updated dependencies [d36d530b]
  - @graphql-tools/utils@8.6.4

## 7.2.4

### Patch Changes

- 0c0c6857: fix - align versions

## 7.2.3

### Patch Changes

- 18341363: feat(visitResult): ignore if field not present in visited object
- Updated dependencies [18341363]
  - @graphql-tools/utils@8.6.2

## 7.2.2

### Patch Changes

- d57c56d2: bump cross-undici-fetch

## 7.2.1

### Patch Changes

- ef9c3853: fix: bump Node <v16.5 compatible version

## 7.2.0

### Minor Changes

- 41d9a996: enhance: use undici instead of node-fetch if available

## 7.1.2

### Patch Changes

- 4bfb3428: enhance: use ^ for tslib dependency
- Updated dependencies [4bfb3428]
  - @graphql-tools/utils@8.5.1

## 7.1.1

### Patch Changes

- 58262be7: enhance: show more clear error messages for aggregated error
- Updated dependencies [58262be7]
  - @graphql-tools/utils@8.3.0

## 7.1.0

### Minor Changes

- c5b0719c: feat: GraphQL v16 support

### Patch Changes

- Updated dependencies [c5b0719c]
- Updated dependencies [c5b0719c]
- Updated dependencies [c5b0719c]
- Updated dependencies [c5b0719c]
- Updated dependencies [c5b0719c]
  - @graphql-tools/utils@8.2.0

## 7.0.5

### Patch Changes

- e50852e6: use version ranges instead of a fixed version for the graphql-tools package versions

## 7.0.4

### Patch Changes

- Updated dependencies [2c807ddb]
  - @graphql-tools/utils@8.1.1

## 7.0.3

### Patch Changes

- Updated dependencies [b9684631]
- Updated dependencies [9ede806a]
- Updated dependencies [67691b78]
  - @graphql-tools/utils@8.1.0

## 7.0.2

### Patch Changes

- Updated dependencies [04830049]
  - @graphql-tools/utils@8.0.2

## 7.0.1

### Patch Changes

- Updated dependencies [b823dbaf]
  - @graphql-tools/utils@8.0.1

## 7.0.0

### Major Changes

- af9a78de: BREAKING CHANGE

  - Now each loader handles glob patterns internally and returns an array of `Source` object instead of single `Source`

  - GraphQL Tag Pluck now respects code locations and returns graphql-js `Source` objects for each found code block

  - Thanks to the one above, `CodeFileLoader` now returns different `Source` objects for each found SDL code block.

- 7d3e3006: BREAKING CHANGE
  - Now it uses the native [`AggregateError`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AggregateError) implementation. The major difference is the individual errors are kept under `errors` property instead of the object itself with `Symbol.iterator`.
  ```js
  // From;
  for (const error of aggregateError)
  // To;
  for (const error of aggregateError.errors)
  ```

### Minor Changes

- a31f9593: feat(apollo-engine): add sync support

### Patch Changes

- Updated dependencies [af9a78de]
- Updated dependencies [9c26b847]
- Updated dependencies [7d3e3006]
- Updated dependencies [7d3e3006]
- Updated dependencies [dae6dc7b]
- Updated dependencies [6877b913]
- Updated dependencies [c42e811d]
- Updated dependencies [7d3e3006]
- Updated dependencies [8c8d4fc0]
- Updated dependencies [7d3e3006]
- Updated dependencies [7d3e3006]
- Updated dependencies [74581cf3]
- Updated dependencies [c0ca3190]
- Updated dependencies [982c8f53]
- Updated dependencies [7d3e3006]
- Updated dependencies [7d3e3006]
  - @graphql-tools/utils@8.0.0

## 6.2.5

### Patch Changes

- Updated dependencies [be1a1575]
  - @graphql-tools/utils@7.0.0

## 6.2.4

### Patch Changes

- 533d6d53: Bump all packages to allow adjustments
- Updated dependencies [32c3c4f8]
- Updated dependencies [533d6d53]
  - @graphql-tools/utils@6.2.4
