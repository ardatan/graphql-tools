# @graphql-tools/load

## 7.7.1

### Patch Changes

- Updated dependencies [2a3b45e3]
  - @graphql-tools/utils@8.9.0
  - @graphql-tools/schema@8.5.1

## 7.7.0

### Minor Changes

- d76a299c: Support TypeScript module resolution.

### Patch Changes

- Updated dependencies [a0abbbcd]
- Updated dependencies [d76a299c]
  - @graphql-tools/utils@8.8.0
  - @graphql-tools/schema@8.5.0

## 7.6.0

### Minor Changes

- 4914970b: `mergeSchemas` was skipping `defaultFieldResolver` and `defaultMergedResolver` by default while extracting resolvers for each given schema to reduce the overhead. But this doesn't work properly if you mix wrapped schemas and local schemas. So new `includeDefaultMergedResolver` flag is introduced in `getResolversFromSchema` to put default "proxy" resolvers in the extracted resolver map for `mergeSchemas`.

  This fixes an issue with alias issue, so nested aliased fields weren't resolved properly because of the missing `defaultMergedResolver` in the final merged schema which should come from the wrapped schema.

### Patch Changes

- 4914970b: No longer call `mergeSchemas` if a single schema is loaded.
  Previously all typeDefs and resolvers were extracted and the schema was rebuilt from scratch.
  But this is not necessary if there is only one schema loaded with `loadSchema`
- Updated dependencies [4914970b]
  - @graphql-tools/schema@8.4.0
  - @graphql-tools/utils@8.7.0

## 7.5.14

### Patch Changes

- 041c5ba1: Use caret range for the tslib dependency
- Updated dependencies [041c5ba1]
  - @graphql-tools/schema@8.3.14
  - @graphql-tools/utils@8.6.13

## 7.5.13

### Patch Changes

- Updated dependencies [da7ad43b]
  - @graphql-tools/utils@8.6.12
  - @graphql-tools/schema@8.3.13

## 7.5.12

### Patch Changes

- Updated dependencies [c0762ee3]
  - @graphql-tools/utils@8.6.11
  - @graphql-tools/schema@8.3.12

## 7.5.11

### Patch Changes

- Updated dependencies [0fc510cb]
  - @graphql-tools/utils@8.6.10
  - @graphql-tools/schema@8.3.11

## 7.5.10

### Patch Changes

- Updated dependencies [31a33e2b]
  - @graphql-tools/utils@8.6.9
  - @graphql-tools/schema@8.3.10

## 7.5.9

### Patch Changes

- Updated dependencies [cb238877]
  - @graphql-tools/utils@8.6.8
  - @graphql-tools/schema@8.3.9

## 7.5.8

### Patch Changes

- Updated dependencies [0bbb1769]
  - @graphql-tools/utils@8.6.7
  - @graphql-tools/schema@8.3.8

## 7.5.7

### Patch Changes

- Updated dependencies [904c0847]
  - @graphql-tools/utils@8.6.6
  - @graphql-tools/schema@8.3.7

## 7.5.6

### Patch Changes

- Updated dependencies [722abad7]
  - @graphql-tools/schema@8.3.6

## 7.5.5

### Patch Changes

- Updated dependencies [be2c02d7]
  - @graphql-tools/utils@8.6.5
  - @graphql-tools/schema@8.3.5

## 7.5.4

### Patch Changes

- Updated dependencies [d36d530b]
  - @graphql-tools/utils@8.6.4
  - @graphql-tools/schema@8.3.4

## 7.5.3

### Patch Changes

- 0c0c6857: fix - align versions
- Updated dependencies [0c0c6857]
  - @graphql-tools/schema@8.3.3

## 7.5.2

### Patch Changes

- 18341363: feat(visitResult): ignore if field not present in visited object
- Updated dependencies [18341363]
  - @graphql-tools/schema@8.3.2
  - @graphql-tools/utils@8.6.2

## 7.5.1

### Patch Changes

- 2e437eba: Fix type error on NON_OPERATION_KINDS when using with graphql@15
- 7c6b28e6: Changes to the documentation regarding processImport
- Updated dependencies [69b316c2]
  - @graphql-tools/utils@8.6.0

## 7.5.0

### Minor Changes

- b107413a: feat(load): support custom require for custom loaders

### Patch Changes

- Updated dependencies [7b5d72c5]
  - @graphql-tools/utils@8.5.5

## 7.4.1

### Patch Changes

- 4bfb3428: enhance: use ^ for tslib dependency
- Updated dependencies [4bfb3428]
  - @graphql-tools/schema@8.3.1
  - @graphql-tools/utils@8.5.1

## 7.4.0

### Minor Changes

- 149afddb: fix: getting ready for GraphQL v16

### Patch Changes

- Updated dependencies [149afddb]
  - @graphql-tools/schema@8.3.0
  - @graphql-tools/utils@8.4.0

## 7.3.2

### Patch Changes

- 8079d43a: Fix loadSchema no longer accepting options.schemas

## 7.3.1

### Patch Changes

- 652c21d7: #3327 - Transitive schema definition dependencies are now included in building out the full dependency structure.
- Updated dependencies [da157d62]
  - @graphql-tools/utils@8.2.3

## 7.3.0

### Minor Changes

- 5225cc71: feat(load): sort the final schema if "sort" option is provided

### Patch Changes

- 9a005161: fix(merge): convertExtensions should convert extensions to regular definitions not other way around

## 7.2.0

### Minor Changes

- c5b0719c: feat: GraphQL v16 support

### Patch Changes

- Updated dependencies [c5b0719c]
- Updated dependencies [c5b0719c]
- Updated dependencies [c5b0719c]
- Updated dependencies [c5b0719c]
- Updated dependencies [c5b0719c]
  - @graphql-tools/utils@8.2.0
  - @graphql-tools/schema@8.2.0

## 7.1.9

### Patch Changes

- c8c13ed1: enhance: remove TypeMap and small improvements
- c8c13ed1: enhance(load): handle multiple errors correctly
- Updated dependencies [c8c13ed1]
  - @graphql-tools/utils@8.1.2

## 7.1.8

### Patch Changes

- 98fa4a51: fix loading of custom loaders regression that caused custom loaders to fail

## 7.1.7

### Patch Changes

- e50852e6: use version ranges instead of a fixed version for the graphql-tools package versions
- Updated dependencies [e50852e6]
  - @graphql-tools/schema@8.1.2

## 7.1.6

### Patch Changes

- Updated dependencies [2c807ddb]
  - @graphql-tools/utils@8.1.1
  - @graphql-tools/schema@8.1.1

## 7.1.5

### Patch Changes

- Updated dependencies [b9684631]
- Updated dependencies [9ede806a]
- Updated dependencies [67691b78]
  - @graphql-tools/utils@8.1.0
  - @graphql-tools/schema@8.1.0

## 7.1.4

### Patch Changes

- fdc26730: fix(load): handle cache correctly

## 7.1.3

### Patch Changes

- 78dc790d: fix(load): fix loader cache

## 7.1.2

### Patch Changes

- Updated dependencies [4992b472]
  - @graphql-tools/merge@7.0.0

## 7.1.1

### Patch Changes

- Updated dependencies [04830049]
  - @graphql-tools/utils@8.0.2
  - @graphql-tools/merge@6.2.17

## 7.1.0

### Minor Changes

- 1680874b: enhance(load): includeSources flag now adds extended sources as well

## 7.0.1

### Patch Changes

- Updated dependencies [b823dbaf]
  - @graphql-tools/utils@8.0.1
  - @graphql-tools/merge@6.2.16

## 7.0.0

### Major Changes

- af9a78de: BREAKING CHANGE

  - Now each loader handles glob patterns internally and returns an array of `Source` object instead of single `Source`

  - GraphQL Tag Pluck now respects code locations and returns graphql-js `Source` objects for each found code block

  - Thanks to the one above, `CodeFileLoader` now returns different `Source` objects for each found SDL code block.

### Patch Changes

- c5342de7: Loader.canLoad and Loader.canLoadSync can only handle file paths not glob patterns
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
- Updated dependencies [a31f9593]
- Updated dependencies [7d3e3006]
  - @graphql-tools/utils@8.0.0
  - @graphql-tools/merge@6.2.15

## 6.2.8

### Patch Changes

- 68946667: fix(merge): fix handling schema definitions with convertExtensions flag
- Updated dependencies [68946667]
  - @graphql-tools/merge@6.2.12

## 6.2.7

### Patch Changes

- 219ed392: enhance(load/module-loader/merge): use getDocumentNodeFromSchema instead of parse and printSchemaWithDirectives together
- Updated dependencies [219ed392]
- Updated dependencies [219ed392]
- Updated dependencies [219ed392]
- Updated dependencies [219ed392]
  - @graphql-tools/utils@7.5.0
  - @graphql-tools/merge@6.2.9

## 6.2.6

### Patch Changes

- 8f331aaa: enhance(load/module-loader/merge): use getDocumentNodeFromSchema instead of parse and printSchemaWithDirectives together
- Updated dependencies [8f331aaa]
- Updated dependencies [8f331aaa]
- Updated dependencies [8f331aaa]
  - @graphql-tools/utils@7.4.0
  - @graphql-tools/merge@6.2.8

## 6.2.5

### Patch Changes

- Updated dependencies [be1a1575]
  - @graphql-tools/utils@7.0.0
  - @graphql-tools/merge@6.2.5

## 6.2.4

### Patch Changes

- 533d6d53: Bump all packages to allow adjustments
- Updated dependencies [32c3c4f8]
- Updated dependencies [32c3c4f8]
- Updated dependencies [533d6d53]
  - @graphql-tools/merge@6.2.4
  - @graphql-tools/utils@6.2.4
