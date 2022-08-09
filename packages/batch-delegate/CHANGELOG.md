# @graphql-tools/batch-delegate

## 8.3.2

### Patch Changes

- [#4624](https://github.com/ardatan/graphql-tools/pull/4624) [`e3167edc`](https://github.com/ardatan/graphql-tools/commit/e3167edc98172fda88ce2306c10c7d4a23d91d67) Thanks [@n1ru4l](https://github.com/n1ru4l)! - Fix CommonJS TypeScript resolution with `moduleResolution` `node16` or `nodenext`

- Updated dependencies [[`e3167edc`](https://github.com/ardatan/graphql-tools/commit/e3167edc98172fda88ce2306c10c7d4a23d91d67), [`d8dc67aa`](https://github.com/ardatan/graphql-tools/commit/d8dc67aa6cb05bf10f5f16e90690e5ccc87b3426)]:
  - @graphql-tools/delegate@9.0.0
  - @graphql-tools/utils@8.9.1

## 8.3.1

### Patch Changes

- Updated dependencies [2a3b45e3]
  - @graphql-tools/utils@8.9.0
  - @graphql-tools/delegate@8.8.1

## 8.3.0

### Minor Changes

- d76a299c: Support TypeScript module resolution.

### Patch Changes

- Updated dependencies [a0abbbcd]
- Updated dependencies [d76a299c]
  - @graphql-tools/utils@8.8.0
  - @graphql-tools/delegate@8.8.0

## 8.2.21

### Patch Changes

- Updated dependencies [6df204de]
- Updated dependencies [4914970b]
  - @graphql-tools/delegate@8.7.12
  - @graphql-tools/utils@8.7.0

## 8.2.20

### Patch Changes

- 041c5ba1: Use caret range for the tslib dependency
- Updated dependencies [041c5ba1]
  - @graphql-tools/delegate@8.7.11
  - @graphql-tools/utils@8.6.13

## 8.2.19

### Patch Changes

- Updated dependencies [da7ad43b]
  - @graphql-tools/utils@8.6.12
  - @graphql-tools/delegate@8.7.10

## 8.2.18

### Patch Changes

- Updated dependencies [c0762ee3]
  - @graphql-tools/utils@8.6.11
  - @graphql-tools/delegate@8.7.9

## 8.2.17

### Patch Changes

- Updated dependencies [0fc510cb]
  - @graphql-tools/utils@8.6.10
  - @graphql-tools/delegate@8.7.8

## 8.2.16

### Patch Changes

- Updated dependencies [31a33e2b]
  - @graphql-tools/utils@8.6.9
  - @graphql-tools/delegate@8.7.7

## 8.2.15

### Patch Changes

- Updated dependencies [26e4b464]
  - @graphql-tools/delegate@8.7.6

## 8.2.14

### Patch Changes

- Updated dependencies [cb238877]
  - @graphql-tools/utils@8.6.8
  - @graphql-tools/delegate@8.7.5

## 8.2.13

### Patch Changes

- Updated dependencies [0bbb1769]
  - @graphql-tools/delegate@8.7.4
  - @graphql-tools/utils@8.6.7

## 8.2.12

### Patch Changes

- fe9402af: Bump data-loader and cross-undici-fetch
- Updated dependencies [fe9402af]
  - @graphql-tools/delegate@8.7.3

## 8.2.11

### Patch Changes

- Updated dependencies [904c0847]
  - @graphql-tools/utils@8.6.6
  - @graphql-tools/delegate@8.7.2

## 8.2.10

### Patch Changes

- @graphql-tools/delegate@8.7.1

## 8.2.9

### Patch Changes

- Updated dependencies [d8fd6b94]
  - @graphql-tools/delegate@8.7.0

## 8.2.8

### Patch Changes

- Updated dependencies [be2c02d7]
  - @graphql-tools/utils@8.6.5
  - @graphql-tools/delegate@8.6.1

## 8.2.7

### Patch Changes

- Updated dependencies [c40e801f]
- Updated dependencies [d36d530b]
  - @graphql-tools/delegate@8.6.0
  - @graphql-tools/utils@8.6.4

## 8.2.6

### Patch Changes

- 0c0c6857: fix - align versions
- Updated dependencies [0c0c6857]
  - @graphql-tools/delegate@8.5.4

## 8.2.5

### Patch Changes

- 3da3d66c: fix - align versions
- Updated dependencies [3da3d66c]
  - @graphql-tools/utils@8.6.3

## 8.2.4

### Patch Changes

- 18341363: feat(visitResult): ignore if field not present in visited object
- Updated dependencies [18341363]
  - @graphql-tools/delegate@8.5.1
  - @graphql-tools/utils@8.6.2

## 8.2.3

### Patch Changes

- 51315610: enhance: avoid using globalThis
- Updated dependencies [51315610]
  - @graphql-tools/delegate@8.4.3
  - @graphql-tools/utils@8.5.4

## 8.2.2

### Patch Changes

- 5482c99a: Support graphql-executor

  batchDelegateToSchema currently assumes that the source fieldNodes are unique for each request, but this may not be the case when using executors such as graphql-executor. graphql-executor uses memoization to deliver the identical source fieldNodes object across requests, so functions operating on these fieldNodes can be memoized. This change ensures that batches are unique to requests, as long as the context object differs, using the same strategy that stitching makes use of with batch execution (getBatchingExecutor).

## 8.2.1

### Patch Changes

- 4bfb3428: enhance: use ^ for tslib dependency
- Updated dependencies [4bfb3428]
  - @graphql-tools/delegate@8.4.1
  - @graphql-tools/utils@8.5.1

## 8.2.0

### Minor Changes

- 149afddb: fix: getting ready for GraphQL v16

### Patch Changes

- Updated dependencies [149afddb]
  - @graphql-tools/delegate@8.3.0
  - @graphql-tools/utils@8.4.0

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
  - @graphql-tools/delegate@8.2.0
  - @graphql-tools/utils@8.2.0

## 8.0.12

### Patch Changes

- c8c13ed1: enhance: remove TypeMap and small improvements
- Updated dependencies [c8c13ed1]
  - @graphql-tools/delegate@8.1.1
  - @graphql-tools/utils@8.1.2

## 8.0.11

### Patch Changes

- e50852e6: use version ranges instead of a fixed version for the graphql-tools package versions
- Updated dependencies [631b11bd]
- Updated dependencies [e50852e6]
  - @graphql-tools/delegate@8.1.0

## 8.0.10

### Patch Changes

- Updated dependencies [2c807ddb]
  - @graphql-tools/utils@8.1.1
  - @graphql-tools/delegate@8.0.10

## 8.0.9

### Patch Changes

- Updated dependencies [9a13357c]
  - @graphql-tools/delegate@8.0.9

## 8.0.8

### Patch Changes

- Updated dependencies [b9684631]
- Updated dependencies [9ede806a]
- Updated dependencies [67691b78]
  - @graphql-tools/utils@8.1.0
  - @graphql-tools/delegate@8.0.8

## 8.0.7

### Patch Changes

- Updated dependencies [d47dcf42]
  - @graphql-tools/delegate@8.0.7

## 8.0.6

### Patch Changes

- Updated dependencies [ded29f3d]
  - @graphql-tools/delegate@8.0.6

## 8.0.5

### Patch Changes

- Updated dependencies [7fdef335]
  - @graphql-tools/delegate@8.0.5

## 8.0.4

### Patch Changes

- Updated dependencies [04830049]
  - @graphql-tools/utils@8.0.2
  - @graphql-tools/delegate@8.0.4

## 8.0.3

### Patch Changes

- Updated dependencies [b823dbaf]
  - @graphql-tools/utils@8.0.1
  - @graphql-tools/delegate@8.0.3

## 8.0.2

### Patch Changes

- Updated dependencies [d93945fa]
  - @graphql-tools/delegate@8.0.2

## 8.0.1

### Patch Changes

- c36defbe: fix(delegate): fix ESM import
- Updated dependencies [c36defbe]
  - @graphql-tools/delegate@8.0.1

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

## 7.0.2

### Patch Changes

- 161963ac: fix(batch-delegate): only batch together delegations to the same root field

  see #2638.

## 7.0.1

### Patch Changes

- 29ead57c: fix(batch-delegate): proxy batched errors
- Updated dependencies [1b730f80]
- Updated dependencies [29ead57c]
  - @graphql-tools/delegate@7.0.7

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

## 6.2.6

### Patch Changes

- 96a7555d: Fix release

  Last PATCH release actually transitively updated graphql-tools and @graphql-tools/delegate to use latest MAJOR version of dependencies.

## 6.2.5

### Patch Changes

- Updated dependencies [be1a1575]
  - @graphql-tools/delegate@7.0.0

## 6.2.4

### Patch Changes

- 533d6d53: Bump all packages to allow adjustments
- Updated dependencies [32c3c4f8]
- Updated dependencies [533d6d53]
  - @graphql-tools/delegate@6.2.4
