# @graphql-tools/prisma-loader

## 7.0.2

### Patch Changes

- 118b3ca5: fix imports for ESM

## 7.0.1

### Patch Changes

- Updated dependencies [b823dbaf]
  - @graphql-tools/utils@8.0.1
  - @graphql-tools/url-loader@7.0.3

## 7.0.0

### Major Changes

- 1c039fd3: BREAKING CHANGE

  - Now each loader handles glob patterns internally and returns an array of `Source` object instead of single `Source`

  - GraphQL Tag Pluck now respects code locations and returns graphql-js `Source` objects for each found code block

  - Thanks to the one above, `CodeFileLoader` now returns different `Source` objects for each found SDL code block.

## 6.3.1

### Patch Changes

- Updated dependencies [af9a78de]
- Updated dependencies [9c26b847]
- Updated dependencies [7d3e3006]
- Updated dependencies [614c08cc]
- Updated dependencies [7d3e3006]
- Updated dependencies [dae6dc7b]
- Updated dependencies [a31f9593]
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
- Updated dependencies [fd81e800]
- Updated dependencies [7d3e3006]
- Updated dependencies [7d3e3006]
  - @graphql-tools/url-loader@7.0.0
  - @graphql-tools/utils@8.0.0

## 6.3.0

### Minor Changes

- de05971c: Use native Promise instead of Bluebird

### Patch Changes

- Updated dependencies [50bc2178]
  - @graphql-tools/url-loader@6.8.2

## 6.2.7

### Patch Changes

- eacf0dc3: Replace fs-extra with native methods

## 6.2.6

### Patch Changes

- 07548058: Don't initialize env vars with an empty object, so it can fall back on process.env

## 6.2.5

### Patch Changes

- Updated dependencies [be1a1575]
  - @graphql-tools/utils@7.0.0
  - @graphql-tools/url-loader@6.3.1

## 6.2.4

### Patch Changes

- 533d6d53: Bump all packages to allow adjustments
- Updated dependencies [32c3c4f8]
- Updated dependencies [533d6d53]
  - @graphql-tools/utils@6.2.4
  - @graphql-tools/url-loader@6.2.4
