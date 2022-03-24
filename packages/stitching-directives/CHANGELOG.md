# @graphql-tools/stitching-directives

## 2.2.7

### Patch Changes

- Updated dependencies [d8fd6b94]
  - @graphql-tools/delegate@8.7.0

## 2.2.6

### Patch Changes

- Updated dependencies [be2c02d7]
  - @graphql-tools/utils@8.6.5
  - @graphql-tools/delegate@8.6.1

## 2.2.5

### Patch Changes

- Updated dependencies [c40e801f]
- Updated dependencies [d36d530b]
  - @graphql-tools/delegate@8.6.0
  - @graphql-tools/utils@8.6.4

## 2.2.4

### Patch Changes

- 0c0c6857: fix - align versions
- Updated dependencies [0c0c6857]
  - @graphql-tools/delegate@8.5.4

## 2.2.3

### Patch Changes

- 3da3d66c: fix - align versions
- Updated dependencies [3da3d66c]
  - @graphql-tools/utils@8.6.3

## 2.2.2

### Patch Changes

- 18341363: feat(visitResult): ignore if field not present in visited object
- Updated dependencies [18341363]
  - @graphql-tools/delegate@8.5.1
  - @graphql-tools/utils@8.6.2

## 2.2.1

### Patch Changes

- 4bfb3428: enhance: use ^ for tslib dependency
- Updated dependencies [4bfb3428]
  - @graphql-tools/delegate@8.4.1
  - @graphql-tools/utils@8.5.1

## 2.2.0

### Minor Changes

- 149afddb: fix: getting ready for GraphQL v16

### Patch Changes

- Updated dependencies [149afddb]
  - @graphql-tools/delegate@8.3.0
  - @graphql-tools/utils@8.4.0

## 2.1.1

### Patch Changes

- 320122ba: fix(stitching-directives): export correct typings

## 2.1.0

### Minor Changes

- c5b0719c: feat: GraphQL v16 support

### Patch Changes

- Updated dependencies [c5b0719c]
- Updated dependencies [c5b0719c]
- Updated dependencies [c5b0719c]
- Updated dependencies [c5b0719c]
- Updated dependencies [c5b0719c]
  - @graphql-tools/delegate@8.2.0
  - @graphql-tools/utils@8.2.0

## 2.0.11

### Patch Changes

- e50852e6: use version ranges instead of a fixed version for the graphql-tools package versions
- Updated dependencies [631b11bd]
- Updated dependencies [e50852e6]
  - @graphql-tools/delegate@8.1.0

## 2.0.10

### Patch Changes

- Updated dependencies [2c807ddb]
  - @graphql-tools/utils@8.1.1
  - @graphql-tools/delegate@8.0.10

## 2.0.9

### Patch Changes

- Updated dependencies [9a13357c]
  - @graphql-tools/delegate@8.0.9

## 2.0.8

### Patch Changes

- Updated dependencies [b9684631]
- Updated dependencies [9ede806a]
- Updated dependencies [67691b78]
  - @graphql-tools/utils@8.1.0
  - @graphql-tools/delegate@8.0.8

## 2.0.7

### Patch Changes

- Updated dependencies [d47dcf42]
  - @graphql-tools/delegate@8.0.7

## 2.0.6

### Patch Changes

- Updated dependencies [ded29f3d]
  - @graphql-tools/delegate@8.0.6

## 2.0.5

### Patch Changes

- Updated dependencies [7fdef335]
  - @graphql-tools/delegate@8.0.5

## 2.0.4

### Patch Changes

- Updated dependencies [04830049]
  - @graphql-tools/utils@8.0.2
  - @graphql-tools/delegate@8.0.4

## 2.0.3

### Patch Changes

- Updated dependencies [b823dbaf]
  - @graphql-tools/utils@8.0.1
  - @graphql-tools/delegate@8.0.3

## 2.0.2

### Patch Changes

- Updated dependencies [d93945fa]
  - @graphql-tools/delegate@8.0.2

## 2.0.1

### Patch Changes

- c36defbe: fix(delegate): fix ESM import
- Updated dependencies [c36defbe]
  - @graphql-tools/delegate@8.0.1

## 2.0.0

### Major Changes

- 74581cf3: fix(getDirectives): preserve order around repeatable directives

  BREAKING CHANGE: getDirectives now always return an array of individual DirectiveAnnotation objects consisting of `name` and `args` properties.

  New useful function `getDirective` returns an array of objects representing any args for each use of a single directive (returning the empty object `{}` when a directive is used without arguments).

  Note: The `getDirective` function returns an array even when the specified directive is non-repeatable. This is because one use of this function is to throw an error if more than one directive annotation is used for a non repeatable directive!

  When specifying directives in extensions, one can use either the old or new format.

### Minor Changes

- 70cd65eb: feat(stitching-directives): move federation-to-stitching-sdl

### Patch Changes

- Updated dependencies [af9a78de]
- Updated dependencies [7d3e3006]
- Updated dependencies [9c26b847]
- Updated dependencies [7d3e3006]
- Updated dependencies [d53e3be5]
- Updated dependencies [7d3e3006]
- Updated dependencies [dae6dc7b]
- Updated dependencies [6877b913]
- Updated dependencies [c42e811d]
- Updated dependencies [7d3e3006]
- Updated dependencies [8c8d4fc0]
- Updated dependencies [7d3e3006]
- Updated dependencies [aa43054d]
- Updated dependencies [7d3e3006]
- Updated dependencies [74581cf3]
- Updated dependencies [c0ca3190]
- Updated dependencies [982c8f53]
- Updated dependencies [7d3e3006]
- Updated dependencies [7d3e3006]
  - @graphql-tools/utils@8.0.0
  - @graphql-tools/delegate@8.0.0

## 1.3.3

### Patch Changes

- 5f5436fc: Fix stitching-directives to allow using 'argsExpr' with multiple arguments

## 1.3.2

### Patch Changes

- 2c4db53d: fix(stitching-directives): allow selectionSets to include variably nested lists

## 1.3.1

### Patch Changes

- d7b4e09e: fix(stitching-directives): to allow keys to include lists

## 1.3.0

### Minor Changes

- 24926654: Deprecates the `MergeTypeConfig.computedFields` setting (with backwards-compatible warning) in favor of new computed field configuration written as:

  ```js
  merge: {
    MyType: {
      fields: {
        myComputedField: {
          selectionSet: '{ weight }',
          computed: true,
        }
      }
    }
  }
  ```

  A field-level `selectionSet` specifies field dependencies while the `computed` setting structures the field in a way that assures it is always selected with this data provided. The `selectionSet` is intentionally generic to support possible future uses. This new pattern organizes all field-level configuration (including `canonical`) into a single structure.

### Patch Changes

- Updated dependencies [24926654]
  - @graphql-tools/delegate@7.0.10

## 1.2.0

### Minor Changes

- d9b82a2e: enhance(stitch) canonical merged type and field definitions. Use the @canonical directive to promote preferred type and field descriptions into the combined gateway schema.

### Patch Changes

- Updated dependencies [d9b82a2e]
- Updated dependencies [d9b82a2e]
  - @graphql-tools/delegate@7.0.9

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
