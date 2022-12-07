# graphql-tools

## 8.3.14

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/schema@9.0.12

## 8.3.13

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/schema@9.0.11

## 8.3.12

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/schema@9.0.10

## 8.3.11

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/schema@9.0.9

## 8.3.10

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/schema@9.0.8

## 8.3.9

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/schema@9.0.7

## 8.3.8

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/schema@9.0.6

## 8.3.7

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/schema@9.0.5

## 8.3.6

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/schema@9.0.4

## 8.3.5

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/schema@9.0.3

## 8.3.4

### Patch Changes

- Updated dependencies []:
  - @graphql-tools/schema@9.0.2

## 8.3.3

### Patch Changes

- Updated dependencies [[`2609d71f`](https://github.com/ardatan/graphql-tools/commit/2609d71f7c3a0ef2b381c51d9ce60b0de49f9b27)]:
  - @graphql-tools/schema@9.0.1

## 8.3.2

### Patch Changes

- [#4624](https://github.com/ardatan/graphql-tools/pull/4624) [`e3167edc`](https://github.com/ardatan/graphql-tools/commit/e3167edc98172fda88ce2306c10c7d4a23d91d67) Thanks [@n1ru4l](https://github.com/n1ru4l)! - Fix CommonJS TypeScript resolution with `moduleResolution` `node16` or `nodenext`

- Updated dependencies [[`8cc8721f`](https://github.com/ardatan/graphql-tools/commit/8cc8721fbbff3c978fd67d162df833d6973c1860), [`e3167edc`](https://github.com/ardatan/graphql-tools/commit/e3167edc98172fda88ce2306c10c7d4a23d91d67)]:
  - @graphql-tools/schema@9.0.0

## 8.3.1

### Patch Changes

- @graphql-tools/schema@8.5.1

## 8.3.0

### Minor Changes

- d76a299c: Support TypeScript module resolution.

### Patch Changes

- Updated dependencies [d76a299c]
  - @graphql-tools/schema@8.5.0

## 8.2.13

### Patch Changes

- Updated dependencies [4914970b]
  - @graphql-tools/schema@8.4.0

## 8.2.12

### Patch Changes

- 041c5ba1: Use caret range for the tslib dependency
- Updated dependencies [041c5ba1]
  - @graphql-tools/schema@8.3.14

## 8.2.11

### Patch Changes

- @graphql-tools/schema@8.3.13

## 8.2.10

### Patch Changes

- @graphql-tools/schema@8.3.12

## 8.2.9

### Patch Changes

- @graphql-tools/schema@8.3.11

## 8.2.8

### Patch Changes

- @graphql-tools/schema@8.3.10

## 8.2.7

### Patch Changes

- @graphql-tools/schema@8.3.9

## 8.2.6

### Patch Changes

- @graphql-tools/schema@8.3.8

## 8.2.5

### Patch Changes

- @graphql-tools/schema@8.3.7

## 8.2.4

### Patch Changes

- Updated dependencies [722abad7]
  - @graphql-tools/schema@8.3.6

## 8.2.3

### Patch Changes

- @graphql-tools/schema@8.3.5

## 8.2.2

### Patch Changes

- @graphql-tools/schema@8.3.4

## 8.2.1

### Patch Changes

- 0c0c6857: fix - align versions
- Updated dependencies [0c0c6857]
  - @graphql-tools/schema@8.3.3

## 8.2.0

### Minor Changes

- c5b0719c: feat: GraphQL v16 support

### Patch Changes

- Updated dependencies [c5b0719c]
  - @graphql-tools/schema@8.2.0

## 8.1.0

### Minor Changes

- b39588ce: Deprecate `graphql-tools` with a more clear message;

  This package has been deprecated and now it only exports makeExecutableSchema.
  It will no longer receive updates.
  We strongly recommend you to migrate to scoped packages such as @graphql-tools/schema, @graphql-tools/utils and etc.
  Check out https://www.graphql-tools.com to learn which packages you should use instead!

## 8.0.0

### Major Changes

- 7d3e3006: BREAKING CHANGE
  - Now it only exports `makeExecutableSchema` from `@graphql-tools/schema`
  - Please migrate to scoped packages(`@graphql-tools/*`) because this npm package will no longer get updated

### Patch Changes

- Updated dependencies [7d3e3006]
- Updated dependencies [7d3e3006]
- Updated dependencies [7d3e3006]
- Updated dependencies [7d3e3006]
- Updated dependencies [7d3e3006]
  - @graphql-tools/schema@8.0.0

## 7.0.5

### Patch Changes

- 52971f4e: fix(graphql-tools): provide @apollo/client as an optional package
- Updated dependencies [eae28793]
  - @graphql-tools/merge@6.2.14

## 7.0.4

### Patch Changes

- Revert mock package to v7 to avoid breaking changes

## 7.0.3

### Patch Changes

- Updated dependencies [24926654]
- Updated dependencies [24926654]
- Updated dependencies [24926654]
  - @graphql-tools/delegate@7.0.10
  - @graphql-tools/stitch@7.3.0
  - @graphql-tools/links@7.0.4
  - @graphql-tools/mock@8.0.0

## 7.0.2

### Patch Changes

- fb14cd28: Added export from new optimize package
- Updated dependencies [fb14cd28]
  - @graphql-tools/optimize@1.0.1

## 7.0.1

### Patch Changes

- Updated dependencies [294dedda]
- Updated dependencies [294dedda]
- Updated dependencies [2b6c813e]
- Updated dependencies [8133a907]
- Updated dependencies [2b6c813e]
  - @graphql-tools/delegate@7.0.1
  - @graphql-tools/url-loader@6.3.2
  - @graphql-tools/links@7.0.0
  - @graphql-tools/utils@7.0.1

## 7.0.0

### Major Changes

- a9254491: - Resolver validation options should now be set to `error`, `warn` or `ignore` rather than `true` or `false`. In previous versions, some of the validators caused errors to be thrown, while some issued warnings. This changes brings consistency to validator behavior.

  - The `allowResolversNotInSchema` has been renamed to `requireResolversToMatchSchema`, to harmonize the naming convention of all the validators. The default setting of `requireResolversToMatchSchema` is `error`, matching the previous behavior.

  * The `delegateToSchema` return value has matured and been formalized as an `ExternalObject`, in which all errors are integrated into the GraphQL response, preserving their initial path. Those advanced users accessing the result directly will note the change in error handling. This also allows for the deprecation of unnecessary helper functions including `slicedError`, `getErrors`, `getErrorsByPathSegment` functions. Only external errors with missing or invalid paths must still be preserved by annotating the remote object with special properties. The new `getUnpathedErrors` function is therefore necessary for retrieving only these errors. Note also the new `annotateExternalObject` and `mergeExternalObjects` functions, as well as the renaming of `handleResult` to `resolveExternalValue`.

  * Transform types and the `applySchemaTransforms` are now relocated to the `delegate` package; `applyRequestTransforms`/`applyResultTransforms` functions have been deprecated, however, as this functionality has been replaced since v6 by the `Transformer` abstraction.

  * The `transformRequest`/`transformResult` methods are now provided additional `delegationContext` and `transformationContext` arguments -- these were introduced in v6, but previously optional.

  * The `transformSchema` method may wish to create additional delegating resolvers and so it is now provided the `subschemaConfig` and final (non-executable) `transformedSchema` parameters. As in v6, the `transformSchema` is kicked off once to produce the non-executable version, and then, if a wrapping schema is being generated, proxying resolvers are created with access to the (non-executable) initial result. In v7, the individual `transformSchema` methods also get access to the result of the first run, if necessary, they can create additional wrapping schema proxying resolvers.

  * `applySchemaTransforms` parameters have been updated to match and support the `transformSchema` parameters above.

  - `wrapSchema` and `generateProxyingResolvers` now only take a single options argument with named properties of type `SubschemaConfig`. The previously possible shorthand version with first argument consisting of a `GraphQLSchema` and second argument representing the transforms should be reworked as a `SubschemaConfig` object.

  - Similarly, the `ICreateProxyingResolverOptions` interface that provides the options for the `createProxyingResolver` property of `SubschemaConfig` options has been adjusted. The `schema` property previously could be set to a `GraphQLSchema` or a `SubschemaConfig` object. This property has been removed in favor of a `subschemaConfig` property that will always be a `SubschemaConfig` object. The `transforms` property has been removed; transforms should be included within the `SubschemaConfig` object.`

  - The format of the wrapping schema has solidified. All non-root fields are expected to use identical resolvers, either `defaultMergedResolver` or a custom equivalent, with root fields doing the hard work of proxying. Support for custom merged resolvers throught `createMergedResolver` has been deprecated, as custom merging resolvers conflicts when using stitching's type merging, where resolvers are expected to be identical across subschemas.

  - The `WrapFields` transform's `wrappingResolver` option has been removed, as this complicates multiple wrapping layers, as well as planned functionality to wrap subscription root fields in potentially multiple layers, as the wrapping resolvers may be different in different layers. Modifying resolvers can still be performed by use of an additional transform such as `TransformRootFields` or `TransformObjectFields`.

  - The `ExtendSchema` transform has been removed, as it is conceptually simpler just to use `stitchSchemas` with one subschema.

  - The `ReplaceFieldsWithFragment`, `AddFragmentsByField`, `AddSelectionSetsByField`, and `AddMergedTypeSelectionSets` transforms has been removed, as they are superseded by the `AddSelectionSets` and `VisitSelectionSets` transforms. The `AddSelectionSets` purposely takes parsed SDL rather than strings, to nudge end users to parse these strings at build time (when possible), rather than at runtime. Parsing of selection set strings can be performed using the `parseSelectionSet` function from `@graphql-tools/utils`.

  * `stitchSchemas`'s `mergeTypes` option is now true by default! This causes the `onTypeConflict` option to be ignored by default. To use `onTypeConflict` to select a specific type instead of simply merging, simply set `mergeTypes` to false.

  * `schemas` argument has been deprecated, use `subschemas`, `typeDefs`, or `types`, depending on what you are stitching.

  * When using batch delegation in type merging, the `argsFromKeys` function is now set only via the `argsFromKeys` property. Previously, if `argsFromKeys` was absent, it could be read from `args`.

  * Support for fragment hints has been removed in favor of selection set hints.

  * `stitchSchemas` now processes all `GraphQLSchema` and `SubschemaConfig` subschema input into new `Subschema` objects, handling schema config directives such aso`@computed` as well as generating the final transformed schema, stored as the `transformedSchema` property, if transforms are used. Signatures of the `onTypeConflict`, `fieldConfigMerger`, and `inputFieldConfigMerger` have been updated to include metadata related to the original and transformed subschemas. Note the property name change for `onTypeConflict` from `schema` to `subschema`.

  - Mocks returning objects with fields set as functions are now operating according to upstream graphql-js convention, i.e. these functions take three arguments, `args`, `context`, and `info` with `parent` available as `this` rather than as the first argument.

  * `filterSchema`'s `fieldFilter` will now filter _all_ fields across Object, Interface, and Input types. For the previous Object-only behavior, switch to the `objectFieldFilter` option.
  * Unused `fieldNodes` utility functions have been removed.
  * Unused `typeContainsSelectionSet` function has been removed, and `typesContainSelectionSet` has been moved to the `stitch` package.
  * Unnecessary `Operation` type has been removed in favor of `OperationTypeNode` from upstream graphql-js.
  * As above, `applySchemaTransforms`/`applyRequestTransforms`/`applyResultTransforms` have been removed from the `utils` package, as they are implemented elsewhere or no longer necessary.

### Patch Changes

- Updated dependencies [a9254491]
  - @graphql-tools/batch-delegate@7.0.0
  - @graphql-tools/stitch@7.0.1

## 6.2.6

### Patch Changes

- 96a7555d: Fix release

  Last PATCH release actually transitively updated graphql-tools and @graphql-tools/delegate to use latest MAJOR version of dependencies.

- Updated dependencies [96a7555d]
  - @graphql-tools/batch-delegate@6.2.6

## 6.2.5

### Patch Changes

- Updated dependencies [be1a1575]
  - @graphql-tools/batch-execute@7.0.0
  - @graphql-tools/delegate@7.0.0
  - @graphql-tools/mock@7.0.0
  - @graphql-tools/schema@7.0.0
  - @graphql-tools/stitch@7.0.0
  - @graphql-tools/utils@7.0.0
  - @graphql-tools/wrap@7.0.0
  - @graphql-tools/links@6.2.5
  - @graphql-tools/merge@6.2.5
  - @graphql-tools/batch-delegate@6.2.5
  - @graphql-tools/url-loader@6.3.1
  - @graphql-tools/graphql-tag-pluck@6.2.6
  - @graphql-tools/load@6.2.5
  - @graphql-tools/code-file-loader@6.2.5
  - @graphql-tools/git-loader@6.2.5
  - @graphql-tools/github-loader@6.2.5
  - @graphql-tools/graphql-file-loader@6.2.5
  - @graphql-tools/json-file-loader@6.2.5
  - @graphql-tools/module-loader@6.2.5
  - @graphql-tools/relay-operation-optimizer@6.2.5
  - @graphql-tools/resolvers-composition@6.2.5

## 6.2.4

### Patch Changes

- 533d6d53: Bump all packages to allow adjustments
- Updated dependencies [32c3c4f8]
- Updated dependencies [32c3c4f8]
- Updated dependencies [32c3c4f8]
- Updated dependencies [32c3c4f8]
- Updated dependencies [32c3c4f8]
- Updated dependencies [533d6d53]
  - @graphql-tools/stitch@6.2.4
  - @graphql-tools/wrap@6.2.4
  - @graphql-tools/import@6.2.4
  - @graphql-tools/merge@6.2.4
  - @graphql-tools/utils@6.2.4
  - @graphql-tools/delegate@6.2.4
  - @graphql-tools/batch-delegate@6.2.4
  - @graphql-tools/graphql-tag-pluck@6.2.4
  - @graphql-tools/links@6.2.4
  - @graphql-tools/load@6.2.4
  - @graphql-tools/code-file-loader@6.2.4
  - @graphql-tools/git-loader@6.2.4
  - @graphql-tools/github-loader@6.2.4
  - @graphql-tools/graphql-file-loader@6.2.4
  - @graphql-tools/json-file-loader@6.2.4
  - @graphql-tools/module-loader@6.2.4
  - @graphql-tools/url-loader@6.2.4
  - @graphql-tools/mock@6.2.4
  - @graphql-tools/relay-operation-optimizer@6.2.4
  - @graphql-tools/resolvers-composition@6.2.4
  - @graphql-tools/schema@6.2.4
  - @graphql-tools/load-files@6.2.4
