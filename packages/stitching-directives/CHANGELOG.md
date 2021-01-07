# @graphql-tools/stitching-directives

## 1.1.2

### Patch Changes

- 6e50d9fc: enhance(stitching-directives): use keyField

  When using simple keys, i.e. when using the keyField argument to `@merge`, the keyField can be added implicitly to the types's key. In most cases, therefore, `@key` should not be required at all.

- Updated dependencies [6e50d9fc]
  - @graphql-tools/utils@7.2.4

## 1.1.1

### Patch Changes

- 394c4775: fix(stitching-directives): fix abstract types

## 1.1.0

### Minor Changes

- c3996f60: enhance(utils): support code-first schemas by allowing directives to be read from extensions

### Patch Changes

- c3996f60: fix(stitchingDirectives): complete support for code first schemas
- c3996f60: fix(stitchingDirectives): fix name clash

  export all stitching directives as `allDirectives` instead of `stitchingDirectives as the main package function is`stitchingDirectives`

- Updated dependencies [c3996f60]
- Updated dependencies [c3996f60]
- Updated dependencies [c3996f60]
- Updated dependencies [c3996f60]
  - @graphql-tools/utils@7.2.0

## 1.0.0

### Major Changes

- 21da6904: fix release

### Patch Changes

- Updated dependencies [21da6904]
  - @graphql-tools/utils@7.1.2

## 0.0.1

### Patch Changes

- b48a91b1: add ability to specify merge config within subschemas using directives
- Updated dependencies [b48a91b1]
  - @graphql-tools/utils@7.1.1
