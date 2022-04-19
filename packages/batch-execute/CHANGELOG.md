# @graphql-tools/batch-execute

## 8.4.6

### Patch Changes

- Updated dependencies [31a33e2b]
  - @graphql-tools/utils@8.6.9

## 8.4.5

### Patch Changes

- Updated dependencies [cb238877]
  - @graphql-tools/utils@8.6.8

## 8.4.4

### Patch Changes

- Updated dependencies [0bbb1769]
  - @graphql-tools/utils@8.6.7

## 8.4.3

### Patch Changes

- fe9402af: Bump data-loader and cross-undici-fetch

## 8.4.2

### Patch Changes

- Updated dependencies [904c0847]
  - @graphql-tools/utils@8.6.6

## 8.4.1

### Patch Changes

- Updated dependencies [be2c02d7]
  - @graphql-tools/utils@8.6.5

## 8.4.0

### Minor Changes

- c40e801f: feat: forward gateway operation's name to subschema executors

### Patch Changes

- Updated dependencies [d36d530b]
  - @graphql-tools/utils@8.6.4

## 8.3.3

### Patch Changes

- 0c0c6857: fix - align versions

## 8.3.2

### Patch Changes

- 18341363: feat(visitResult): ignore if field not present in visited object
- Updated dependencies [18341363]
  - @graphql-tools/utils@8.6.2

## 8.3.1

### Patch Changes

- 4bfb3428: enhance: use ^ for tslib dependency
- Updated dependencies [4bfb3428]
  - @graphql-tools/utils@8.5.1

## 8.3.0

### Minor Changes

- ad04dc79: enhance: make operationType optional

### Patch Changes

- Updated dependencies [ad04dc79]
  - @graphql-tools/utils@8.5.0

## 8.2.0

### Minor Changes

- 149afddb: fix: getting ready for GraphQL v16

### Patch Changes

- Updated dependencies [149afddb]
  - @graphql-tools/utils@8.4.0

## 8.1.1

### Patch Changes

- 014937db: batch-execute enhancements:
  - fixes bugs with batched fragment definitions
  - unpathed errors are now returned for all batch results
  - the "graphqlTools" prefix is simplified down to just "\_"
  - new tests and documentation
- Updated dependencies [014937db]
  - @graphql-tools/utils@8.2.4

## 8.1.0

### Minor Changes

- c5b0719c: feat: GraphQL v16 support
- c5b0719c: enhance(utils): move memoize functions to utils

### Patch Changes

- Updated dependencies [c5b0719c]
- Updated dependencies [c5b0719c]
- Updated dependencies [c5b0719c]
- Updated dependencies [c5b0719c]
- Updated dependencies [c5b0719c]
  - @graphql-tools/utils@8.2.0

## 8.0.5

### Patch Changes

- 631b11bd: refactor(delegationPlanner): introduce static version of our piecemeal planner

  ...which, although undocumented, can be accessed within the StitchingInfo object saved in a stitched schema's extensions.

  Also improves memoization technique slightly across the board.

- e50852e6: use version ranges instead of a fixed version for the graphql-tools package versions

## 8.0.4

### Patch Changes

- Updated dependencies [2c807ddb]
  - @graphql-tools/utils@8.1.1

## 8.0.3

### Patch Changes

- Updated dependencies [b9684631]
- Updated dependencies [9ede806a]
- Updated dependencies [67691b78]
  - @graphql-tools/utils@8.1.0

## 8.0.2

### Patch Changes

- Updated dependencies [04830049]
  - @graphql-tools/utils@8.0.2

## 8.0.1

### Patch Changes

- Updated dependencies [b823dbaf]
  - @graphql-tools/utils@8.0.1

## 8.0.0

### Major Changes

- dae6dc7b: refactor: ExecutionParams type replaced by Request type

  rootValue property is now a part of the Request type.

  When delegating with delegateToSchema, rootValue can be set multiple ways:

  - when using a custom executor, the custom executor can utilize a rootValue in whichever custom way it specifies.
  - when using the default executor (execute/subscribe from graphql-js):
    -- rootValue can be passed to delegateToSchema via a named option
    -- rootValue can be included within a subschemaConfig
    -- otherwise, rootValue is inferred from the originating schema

  When using wrapSchema/stitchSchemas, a subschemaConfig can specify the createProxyingResolver function which can pass whatever rootValue it wants to delegateToSchema as above.

- c42e811d: BREAKING CHANGES;

  - Rename `Request` to `ExecutionRequest`
  - Add required `operationType: OperationTypeNode` field in `ExecutionRequest`
  - Add `context` in `createRequest` and `createRequestInfo` instead of `delegateToSchema`

  > It doesn't rely on info.operation.operationType to allow the user to call an operation from different root type.
  > And it doesn't call getOperationAST again and again to get operation type from the document/operation because we have it in Request and ExecutionParams
  > https://github.com/ardatan/graphql-tools/pull/3166/files#diff-d4824895ea613dcc1f710c3ac82e952fe0ca12391b671f70d9f2d90d5656fdceR38

  Improvements;

  - Memoize `defaultExecutor` for a single `GraphQLSchema` so allow `getBatchingExecutor` to memoize `batchingExecutor` correctly.
  - And there is no different `defaultExecutor` is created for `subscription` and other operation types. Only one executor is used.

  > Batch executor is memoized by `executor` reference but `createDefaultExecutor` didn't memoize the default executor so this memoization wasn't working correctly on `batch-execute` side.
  > https://github.com/ardatan/graphql-tools/blob/remove-info-executor/packages/batch-execute/src/getBatchingExecutor.ts#L9

- c0ca3190: BREAKING CHANGE
  - Remove Subscriber and use only Executor
  - - Now `Executor` can receive `AsyncIterable` and subscriptions will also be handled by `Executor`. This is a future-proof change for defer, stream and live queries

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

## 7.1.2

### Patch Changes

- 22a9f3da: fix(deps): follow package conventions on when to pin

## 7.1.1

### Patch Changes

- 61da3e82: use value-or-promise to streamline working with sync values or async promises

## 7.1.0

### Minor Changes

- 58fd4b28: feat(types): add TContext to stitchSchemas and executor

### Patch Changes

- Updated dependencies [58fd4b28]
- Updated dependencies [43da6b59]
  - @graphql-tools/utils@7.7.0

## 7.0.0

### Major Changes

- be1a1575: ## Breaking Changes:

  #### Schema Generation and Decoration API (`@graphql-tools/schema`)

  - Resolver validation options should now be set to `error`, `warn` or `ignore` rather than `true` or `false`. In previous versions, some of the validators caused errors to be thrown, while some issued warnings. This changes brings consistency to validator behavior.

  - The `allowResolversNotInSchema` has been renamed to `requireResolversToMatchSchema`, to harmonize the naming convention of all the validators. The default setting of `requireResolversToMatchSchema` is `error`, matching the previous behavior.

  #### Schema Delegation (`delegateToSchema` & `@graphql-tools/delegate`)

  - The `delegateToSchema` return value has matured and been formalized as an `ExternalObject`, in which all errors are integrated into the GraphQL response, preserving their initial path. Those advanced users accessing the result directly will note the change in error handling. This also allows for the deprecation of unnecessary helper functions including `slicedError`, `getErrors`, `getErrorsByPathSegment` functions. Only external errors with missing or invalid paths must still be preserved by annotating the remote object with special properties. The new `getUnpathedErrors` function is therefore necessary for retrieving only these errors. Note also the new `annotateExternalObject` and `mergeExternalObjects` functions, as well as the renaming of `handleResult` to `resolveExternalValue`.

  - Transform types and the `applySchemaTransforms` are now relocated to the `delegate` package; `applyRequestTransforms`/`applyResultTransforms` functions have been deprecated, however, as this functionality has been replaced since v6 by the `Transformer` abstraction.

  - The `transformRequest`/`transformResult` methods are now provided additional `delegationContext` and `transformationContext` arguments -- these were introduced in v6, but previously optional.

  - The `transformSchema` method may wish to create additional delegating resolvers and so it is now provided the `subschemaConfig` and final (non-executable) `transformedSchema` parameters. As in v6, the `transformSchema` is kicked off once to produce the non-executable version, and then, if a wrapping schema is being generated, proxying resolvers are created with access to the (non-executable) initial result. In v7, the individual `transformSchema` methods also get access to the result of the first run, if necessary, they can create additional wrapping schema proxying resolvers.

  - `applySchemaTransforms` parameters have been updated to match and support the `transformSchema` parameters above.

  #### Remote Schemas & Wrapping (`wrapSchema`, `makeRemoteExecutableSchema`, and `@graphql-tools/wrap`)

  - `wrapSchema` and `generateProxyingResolvers` now only take a single options argument with named properties of type `SubschemaConfig`. The previously possible shorthand version with first argument consisting of a `GraphQLSchema` and second argument representing the transforms should be reworked as a `SubschemaConfig` object.

  - Similarly, the `ICreateProxyingResolverOptions` interface that provides the options for the `createProxyingResolver` property of `SubschemaConfig` options has been adjusted. The `schema` property previously could be set to a `GraphQLSchema` or a `SubschemaConfig` object. This property has been removed in favor of a `subschemaConfig` property that will always be a `SubschemaConfig` object. The `transforms` property has been removed; transforms should be included within the `SubschemaConfig` object.`

  - The format of the wrapping schema has solidified. All non-root fields are expected to use identical resolvers, either `defaultMergedResolver` or a custom equivalent, with root fields doing the hard work of proxying. Support for custom merged resolvers throught `createMergedResolver` has been deprecated, as custom merging resolvers conflicts when using stitching's type merging, where resolvers are expected to be identical across subschemas.

  - The `WrapFields` transform's `wrappingResolver` option has been removed, as this complicates multiple wrapping layers, as well as planned functionality to wrap subscription root fields in potentially multiple layers, as the wrapping resolvers may be different in different layers. Modifying resolvers can still be performed by use of an additional transform such as `TransformRootFields` or `TransformObjectFields`.

  - The `ExtendSchema` transform has been removed, as it is conceptually simpler just to use `stitchSchemas` with one subschema.

  - The `ReplaceFieldsWithFragment`, `AddFragmentsByField`, `AddSelectionSetsByField`, and `AddMergedTypeSelectionSets` transforms has been removed, as they are superseded by the `AddSelectionSets` and `VisitSelectionSets` transforms. The `AddSelectionSets` purposely takes parsed SDL rather than strings, to nudge end users to parse these strings at build time (when possible), rather than at runtime. Parsing of selection set strings can be performed using the `parseSelectionSet` function from `@graphql-tools/utils`.

  #### Schema Stitching (`stitchSchemas` & `@graphql-tools/stitch`)

  - `stitchSchemas`'s `mergeTypes` option is now true by default! This causes the `onTypeConflict` option to be ignored by default. To use `onTypeConflict` to select a specific type instead of simply merging, simply set `mergeTypes` to false.

  - `schemas` argument has been deprecated, use `subschemas`, `typeDefs`, or `types`, depending on what you are stitching.

  - When using batch delegation in type merging, the `argsFromKeys` function is now set only via the `argsFromKeys` property. Previously, if `argsFromKeys` was absent, it could be read from `args`.

  - Support for fragment hints has been removed in favor of selection set hints.

  - `stitchSchemas` now processes all `GraphQLSchema` and `SubschemaConfig` subschema input into new `Subschema` objects, handling schema config directives such aso`@computed` as well as generating the final transformed schema, stored as the `transformedSchema` property, if transforms are used. Signatures of the `onTypeConflict`, `fieldConfigMerger`, and `inputFieldConfigMerger` have been updated to include metadata related to the original and transformed subschemas. Note the property name change for `onTypeConflict` from `schema` to `subschema`.

  #### Mocking (`addMocksToSchema` and `@graphql-tools/mock`)

  - Mocks returning objects with fields set as functions are now operating according to upstream graphql-js convention, i.e. these functions take three arguments, `args`, `context`, and `info` with `parent` available as `this` rather than as the first argument.

  #### Other Utilities (`@graphql-tools/utils`)

  - `filterSchema`'s `fieldFilter` will now filter _all_ fields across Object, Interface, and Input types. For the previous Object-only behavior, switch to the `objectFieldFilter` option.
  - Unused `fieldNodes` utility functions have been removed.
  - Unused `typeContainsSelectionSet` function has been removed, and `typesContainSelectionSet` has been moved to the `stitch` package.
  - Unnecessary `Operation` type has been removed in favor of `OperationTypeNode` from upstream graphql-js.
  - As above, `applySchemaTransforms`/`applyRequestTransforms`/`applyResultTransforms` have been removed from the `utils` package, as they are implemented elsewhere or no longer necessary.

  ## Related Issues

  - proxy all the errors: #1047, #1641
  - better error handling for merges #2016, #2062
  - fix typings #1614
  - disable implicit schema pruning #1817
  - mocks not working for functions #1807

### Patch Changes

- Updated dependencies [be1a1575]
  - @graphql-tools/utils@7.0.0
