# @graphql-tools/prisma-loader

## 7.1.6

### Patch Changes

- @graphql-tools/url-loader@7.9.7

## 7.1.5

### Patch Changes

- Updated dependencies [be2c02d7]
  - @graphql-tools/utils@8.6.5
  - @graphql-tools/url-loader@7.9.6

## 7.1.4

### Patch Changes

- Updated dependencies [d36d530b]
  - @graphql-tools/utils@8.6.4
  - @graphql-tools/url-loader@7.9.5

## 7.1.3

### Patch Changes

- 0c0c6857: fix - align versions
- Updated dependencies [0c0c6857]
  - @graphql-tools/url-loader@7.9.4

## 7.1.2

### Patch Changes

- 18341363: feat(visitResult): ignore if field not present in visited object
- Updated dependencies [18341363]
  - @graphql-tools/url-loader@7.7.2
  - @graphql-tools/utils@8.6.2

## 7.1.1

### Patch Changes

- 4bfb3428: enhance: use ^ for tslib dependency
- Updated dependencies [981eef80]
- Updated dependencies [4bfb3428]
  - @graphql-tools/url-loader@7.4.2
  - @graphql-tools/utils@8.5.1

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
  - @graphql-tools/url-loader@7.1.0

## 7.0.6

### Patch Changes

- e50852e6: use version ranges instead of a fixed version for the graphql-tools package versions
- Updated dependencies [e50852e6]
  - @graphql-tools/url-loader@7.0.11

## 7.0.5

### Patch Changes

- Updated dependencies [2c807ddb]
  - @graphql-tools/utils@8.1.1
  - @graphql-tools/url-loader@7.0.10

## 7.0.4

### Patch Changes

- Updated dependencies [b9684631]
- Updated dependencies [9ede806a]
- Updated dependencies [67691b78]
  - @graphql-tools/utils@8.1.0
  - @graphql-tools/url-loader@7.0.8

## 7.0.3

### Patch Changes

- Updated dependencies [04830049]
  - @graphql-tools/utils@8.0.2
  - @graphql-tools/url-loader@7.0.4

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
