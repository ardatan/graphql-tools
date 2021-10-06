# @graphql-tools/graphql-file-loader

## 7.2.0

### Minor Changes

- 00d06c2c: feat(loader): provide `noSilentErrors` option to allow raising errors during loader resolution

### Patch Changes

- Updated dependencies [1e90f094]
  - @graphql-tools/import@6.5.0

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
  - @graphql-tools/import@6.4.0

## 7.0.6

### Patch Changes

- c8c13ed1: enhance(load): handle multiple errors correctly
- Updated dependencies [c8c13ed1]
  - @graphql-tools/utils@8.1.2

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

- c5342de7: Loader.canLoad and Loader.canLoadSync can only handle file paths not glob patterns

### Patch Changes

- 63e048fd: fix(file-loader): location path must be normalized
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

## 6.2.7

### Patch Changes

- 5ec2e354: enhance(graphql-file-loader): do not merge in the loader and handle duplicates inside import
- Updated dependencies [5ec2e354]
  - @graphql-tools/import@6.2.6

## 6.2.6

### Patch Changes

- eacf0dc3: Replace fs-extra with native methods
- Updated dependencies [eacf0dc3]
  - @graphql-tools/import@6.2.5

## 6.2.5

### Patch Changes

- Updated dependencies [be1a1575]
  - @graphql-tools/utils@7.0.0

## 6.2.4

### Patch Changes

- 533d6d53: Bump all packages to allow adjustments
- Updated dependencies [32c3c4f8]
- Updated dependencies [32c3c4f8]
- Updated dependencies [533d6d53]
  - @graphql-tools/import@6.2.4
  - @graphql-tools/utils@6.2.4
