# @graphql-tools/github-loader

## 7.2.12

### Patch Changes

- fe9402af: Bump data-loader and cross-undici-fetch

## 7.2.11

### Patch Changes

- Updated dependencies [904c0847]
  - @graphql-tools/utils@8.6.6
  - @graphql-tools/graphql-tag-pluck@7.2.3

## 7.2.10

### Patch Changes

- Updated dependencies [cdecc1b5]
  - @graphql-tools/graphql-tag-pluck@7.2.2

## 7.2.9

### Patch Changes

- Updated dependencies [4e6fe1c1]
  - @graphql-tools/graphql-tag-pluck@7.2.1

## 7.2.8

### Patch Changes

- Updated dependencies [eb657d9c]
  - @graphql-tools/graphql-tag-pluck@7.2.0

## 7.2.7

### Patch Changes

- Updated dependencies [be2c02d7]
  - @graphql-tools/utils@8.6.5
  - @graphql-tools/graphql-tag-pluck@7.1.9

## 7.2.6

### Patch Changes

- Updated dependencies [d36d530b]
  - @graphql-tools/utils@8.6.4
  - @graphql-tools/graphql-tag-pluck@7.1.8

## 7.2.5

### Patch Changes

- 0c0c6857: fix - align versions
- Updated dependencies [0c0c6857]
  - @graphql-tools/graphql-tag-pluck@7.1.7

## 7.2.4

### Patch Changes

- 18341363: feat(visitResult): ignore if field not present in visited object
- Updated dependencies [18341363]
  - @graphql-tools/graphql-tag-pluck@7.1.6
  - @graphql-tools/utils@8.6.2

## 7.2.3

### Patch Changes

- 6e15b992: fix(github-loader): use named export instead of default one

## 7.2.2

### Patch Changes

- d57c56d2: bump cross-undici-fetch

## 7.2.1

### Patch Changes

- ef9c3853: fix: bump Node <v16.5 compatible version

## 7.2.0

### Minor Changes

- 41d9a996: enhance: use undici instead of node-fetch if available
- 41d9a996: feat(github-loader): support sync mode

## 7.1.1

### Patch Changes

- 4bfb3428: enhance: use ^ for tslib dependency
- Updated dependencies [4bfb3428]
  - @graphql-tools/graphql-tag-pluck@7.1.3
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
  - @graphql-tools/graphql-tag-pluck@7.1.0

## 7.0.5

### Patch Changes

- e50852e6: use version ranges instead of a fixed version for the graphql-tools package versions
- Updated dependencies [e50852e6]
  - @graphql-tools/graphql-tag-pluck@7.0.5

## 7.0.4

### Patch Changes

- Updated dependencies [2c807ddb]
  - @graphql-tools/utils@8.1.1
  - @graphql-tools/graphql-tag-pluck@7.0.4

## 7.0.3

### Patch Changes

- Updated dependencies [b9684631]
- Updated dependencies [9ede806a]
- Updated dependencies [67691b78]
  - @graphql-tools/utils@8.1.0
  - @graphql-tools/graphql-tag-pluck@7.0.3

## 7.0.2

### Patch Changes

- Updated dependencies [04830049]
  - @graphql-tools/utils@8.0.2
  - @graphql-tools/graphql-tag-pluck@7.0.2

## 7.0.1

### Patch Changes

- Updated dependencies [b823dbaf]
  - @graphql-tools/utils@8.0.1
  - @graphql-tools/graphql-tag-pluck@7.0.1

## 7.0.0

### Major Changes

- af9a78de: BREAKING CHANGE

  - Now each loader handles glob patterns internally and returns an array of `Source` object instead of single `Source`

  - GraphQL Tag Pluck now respects code locations and returns graphql-js `Source` objects for each found code block

  - Thanks to the one above, `CodeFileLoader` now returns different `Source` objects for each found SDL code block.

### Minor Changes

- a31f9593: feat(github-loader): handle SDL correctly on loader level

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
- Updated dependencies [f1d7b3c2]
- Updated dependencies [7d3e3006]
- Updated dependencies [74581cf3]
- Updated dependencies [c0ca3190]
- Updated dependencies [34c31de0]
- Updated dependencies [982c8f53]
- Updated dependencies [7d3e3006]
- Updated dependencies [7d3e3006]
  - @graphql-tools/utils@8.0.0
  - @graphql-tools/graphql-tag-pluck@7.0.0

## 6.2.5

### Patch Changes

- Updated dependencies [be1a1575]
  - @graphql-tools/utils@7.0.0
  - @graphql-tools/graphql-tag-pluck@6.2.6

## 6.2.4

### Patch Changes

- 533d6d53: Bump all packages to allow adjustments
- Updated dependencies [32c3c4f8]
- Updated dependencies [533d6d53]
  - @graphql-tools/utils@6.2.4
  - @graphql-tools/graphql-tag-pluck@6.2.4
