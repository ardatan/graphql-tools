# @graphql-tools/merge

## 8.1.0

### Minor Changes

- c5b0719c: feat: GraphQL v16 support

### Patch Changes

- Updated dependencies [c5b0719c]
- Updated dependencies [c5b0719c]
- Updated dependencies [c5b0719c]
- Updated dependencies [c5b0719c]
- Updated dependencies [c5b0719c]
  - @graphql-tools/utils@8.2.0

## 8.0.3

### Patch Changes

- c8c13ed1: enhance: remove TypeMap and small improvements
- Updated dependencies [c8c13ed1]
  - @graphql-tools/utils@8.1.2

## 8.0.2

### Patch Changes

- e50852e6: use version ranges instead of a fixed version for the graphql-tools package versions

## 8.0.1

### Patch Changes

- Updated dependencies [2c807ddb]
  - @graphql-tools/utils@8.1.1

## 8.0.0

### Major Changes

- 67691b78: - `schemaExtensions` option has been added to `mergeSchemas`, `makeExecutableSchema` and `stitchSchemas` configurations

  Breaking Changes;

  - Move `mergeSchemas` and `MergeSchemasConfig` from `@graphql-tools/merge` to `@graphql-tools/schema` package to prevent circular dependency between them.
  - `mergeSchemasAsync` has been removed.
  - Move `NamedDefinitionNode`, `resetComments`, `collectComment`, `pushComment` and `printComment` from `@graphql-tools/merge` to `@graphql-tools/utils`.

### Patch Changes

- a5fb77a4: fix(merge): ignore comments while merging directives #3031
- Updated dependencies [b9684631]
- Updated dependencies [9ede806a]
- Updated dependencies [67691b78]
  - @graphql-tools/utils@8.1.0

## 7.0.0

### Major Changes

- 4992b472: BREAKING: change type signature and generic parameters of `mergeResolvers`

### Patch Changes

- @graphql-tools/schema@8.0.3

## 6.2.17

### Patch Changes

- Updated dependencies [04830049]
  - @graphql-tools/utils@8.0.2
  - @graphql-tools/schema@8.0.2

## 6.2.16

### Patch Changes

- Updated dependencies [b823dbaf]
  - @graphql-tools/utils@8.0.1
  - @graphql-tools/schema@8.0.1

## 6.2.15

### Patch Changes

- a31f9593: fix(merge): handle schema definitions correctly
- Updated dependencies [af9a78de]
- Updated dependencies [9c26b847]
- Updated dependencies [7d3e3006]
- Updated dependencies [7d3e3006]
- Updated dependencies [dae6dc7b]
- Updated dependencies [6877b913]
- Updated dependencies [7d3e3006]
- Updated dependencies [c42e811d]
- Updated dependencies [7d3e3006]
- Updated dependencies [8c8d4fc0]
- Updated dependencies [7d3e3006]
- Updated dependencies [7d3e3006]
- Updated dependencies [7d3e3006]
- Updated dependencies [74581cf3]
- Updated dependencies [c0ca3190]
- Updated dependencies [7d3e3006]
- Updated dependencies [982c8f53]
- Updated dependencies [7d3e3006]
- Updated dependencies [7d3e3006]
- Updated dependencies [7d3e3006]
  - @graphql-tools/utils@8.0.0
  - @graphql-tools/schema@8.0.0

## 6.2.14

### Patch Changes

- eae28793: fix(merge): handle undefined interfaces array on ObjectTypeDefinitionNode #2629

## 6.2.13

### Patch Changes

- 60a9c9a5: fix(merge): handle arrays correctly

## 6.2.12

### Patch Changes

- 68946667: fix(merge): fix handling schema definitions with convertExtensions flag

## 6.2.11

### Patch Changes

- 43da6b59: enhance(merge): reduce number of iterations
- Updated dependencies [58fd4b28]
- Updated dependencies [43da6b59]
  - @graphql-tools/utils@7.7.0

## 6.2.10

### Patch Changes

- 0194118f: Introduces a suite of stitched schema validations that enforce the integrity of merged schemas. This includes validations for:

  - Strict and safe null consistency (the later of which allows safe transitions in nullability).
  - Named type consistency with the option to whitelist proxiable scalar mappings.
  - Argument and input field name consistency.
  - Enum value consistency when used as an input value.

  Validations may be adjusted by setting `validationLevel` to `off|warn|error` globally or scoped for specific types and fields. In this initial v7 release, all validations are introduced at the `warn` threshold for backwards compatibility. Most of these validations will become automatic errors in v8. To enable validation errors now, set `validationLevel: 'error'`. Full configuration options look like this:

  ```js
  const gatewaySchema = stitchSchemas({
    subschemas: [...],
    typeMergingOptions: {
      validationSettings: {
        validationLevel: 'error',
        strictNullComparison: false, // << gateway "String" may proxy subschema "String!"
        proxiableScalars: {
          ID: ['String'], // << gateway "ID" may proxy subschema "String"
        }
      },
      validationScopes: {
        // scope to specific element paths
        'User.id': {
          validationLevel: 'warn',
          strictNullComparison: true,
        },
      }
    },
  });
  ```

## 6.2.9

### Patch Changes

- 219ed392: enhance(load/module-loader/merge): use getDocumentNodeFromSchema instead of parse and printSchemaWithDirectives together
- Updated dependencies [219ed392]
- Updated dependencies [219ed392]
- Updated dependencies [219ed392]
  - @graphql-tools/utils@7.5.0

## 6.2.8

### Patch Changes

- 8f331aaa: enhance(load/module-loader/merge): use getDocumentNodeFromSchema instead of parse and printSchemaWithDirectives together
- Updated dependencies [8f331aaa]
- Updated dependencies [8f331aaa]
  - @graphql-tools/utils@7.4.0

## 6.2.7

### Patch Changes

- d9b82a2e: fix(merge/stitch) consistent enum value merge
- d9b82a2e: enhance(stitch) canonical merged type and field definitions. Use the @canonical directive to promote preferred type and field descriptions into the combined gateway schema.

## 6.2.6

### Patch Changes

- 878c36b6: enhance(stitch): use mergeScalar from merge

## 6.2.5

### Patch Changes

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

- Updated dependencies [be1a1575]
  - @graphql-tools/schema@7.0.0
  - @graphql-tools/utils@7.0.0

## 6.2.4

### Patch Changes

- 32c3c4f8: Fix duplication of scalar directives in merge
- 32c3c4f8: Support scalar extensions by merging directives
- 533d6d53: Bump all packages to allow adjustments
- Updated dependencies [32c3c4f8]
- Updated dependencies [533d6d53]
  - @graphql-tools/utils@6.2.4
  - @graphql-tools/schema@6.2.4
