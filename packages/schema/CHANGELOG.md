# @graphql-tools/schema

## 9.0.12

### Patch Changes

- Updated dependencies [[`904fe770`](https://github.com/ardatan/graphql-tools/commit/904fe770a355ee3d79464c3bbf0375d2dcd64759)]:
  - @graphql-tools/utils@9.1.3
  - @graphql-tools/merge@8.3.14

## 9.0.11

### Patch Changes

- Updated dependencies [[`13c24883`](https://github.com/ardatan/graphql-tools/commit/13c24883004d5330f7402cb20566e37535c5729b)]:
  - @graphql-tools/utils@9.1.2
  - @graphql-tools/merge@8.3.13

## 9.0.10

### Patch Changes

- Updated dependencies [[`7411a5e7`](https://github.com/ardatan/graphql-tools/commit/7411a5e71a8138d9ccfe907b1fb01e62fcbb0cdb)]:
  - @graphql-tools/utils@9.1.1
  - @graphql-tools/merge@8.3.12

## 9.0.9

### Patch Changes

- Updated dependencies [[`c0639dd0`](https://github.com/ardatan/graphql-tools/commit/c0639dd0065db1b5bcedaabf58b11945714bab8d)]:
  - @graphql-tools/utils@9.1.0
  - @graphql-tools/merge@8.3.11

## 9.0.8

### Patch Changes

- Updated dependencies [[`d83b1960`](https://github.com/ardatan/graphql-tools/commit/d83b19605be71481ccf8effd80d5254423ea811a)]:
  - @graphql-tools/utils@9.0.1
  - @graphql-tools/merge@8.3.10

## 9.0.7

### Patch Changes

- Updated dependencies [[`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931), [`8f6d3efc`](https://github.com/ardatan/graphql-tools/commit/8f6d3efc92b25236f5a3a761ea7ba2f0a7c7f550), [`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931), [`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931), [`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931)]:
  - @graphql-tools/utils@9.0.0
  - @graphql-tools/merge@8.3.9

## 9.0.6

### Patch Changes

- Updated dependencies [[`f7daf777`](https://github.com/ardatan/graphql-tools/commit/f7daf7777cc214801886e4a45c0389bc5837d175)]:
  - @graphql-tools/utils@8.13.1
  - @graphql-tools/merge@8.3.8

## 9.0.5

### Patch Changes

- Updated dependencies [[`df5848b8`](https://github.com/ardatan/graphql-tools/commit/df5848b85102827f004f23aded7cf802cdcde00f), [`df5848b8`](https://github.com/ardatan/graphql-tools/commit/df5848b85102827f004f23aded7cf802cdcde00f), [`df5848b8`](https://github.com/ardatan/graphql-tools/commit/df5848b85102827f004f23aded7cf802cdcde00f)]:
  - @graphql-tools/utils@8.13.0
  - @graphql-tools/merge@8.3.7

## 9.0.4

### Patch Changes

- Updated dependencies [[`43c736bd`](https://github.com/ardatan/graphql-tools/commit/43c736bd1865c00898966a7ed14060496c9e6a0c)]:
  - @graphql-tools/utils@8.12.0
  - @graphql-tools/merge@8.3.6

## 9.0.3

### Patch Changes

- Updated dependencies [[`71cb4fae`](https://github.com/ardatan/graphql-tools/commit/71cb4faeb0833a228520a7bc2beed8ac7274443f), [`403ed450`](https://github.com/ardatan/graphql-tools/commit/403ed4507eff7cd509f410f7542a702da72e1a9a)]:
  - @graphql-tools/utils@8.11.0
  - @graphql-tools/merge@8.3.5

## 9.0.2

### Patch Changes

- Updated dependencies [[`4fe3d9c0`](https://github.com/ardatan/graphql-tools/commit/4fe3d9c037e9c138bd8a9b04b3977d74eba32c97)]:
  - @graphql-tools/utils@8.10.1
  - @graphql-tools/merge@8.3.4

## 9.0.1

### Patch Changes

- [#4643](https://github.com/ardatan/graphql-tools/pull/4643) [`2609d71f`](https://github.com/ardatan/graphql-tools/commit/2609d71f7c3a0ef2b381c51d9ce60b0de49f9b27) Thanks [@ardatan](https://github.com/ardatan)! - Revert the breaking change introduced in `@graphql-tools/merge`

- Updated dependencies [[`2609d71f`](https://github.com/ardatan/graphql-tools/commit/2609d71f7c3a0ef2b381c51d9ce60b0de49f9b27)]:
  - @graphql-tools/utils@8.10.0
  - @graphql-tools/merge@8.3.3

## 9.0.0

### Major Changes

- [#4463](https://github.com/ardatan/graphql-tools/pull/4463) [`8cc8721f`](https://github.com/ardatan/graphql-tools/commit/8cc8721fbbff3c978fd67d162df833d6973c1860) Thanks [@ardatan](https://github.com/ardatan)! - Thanks @mattkrick and @borisno2!

  ## Breaking changes

  `addResolversToSchema`;

  If you are using the legacy parameters like below, you should update them to the new usage. Other than that, there is no functional change;

  ```ts
  // From
  addResolversToSchema(schema, resolvers, resolverValidationOptions);

  // To
  addResolversToSchema({
    schema,
    resolvers,
    resolverValidationOptions,
  });
  ```

  `mergeSchemas`;

  The provided `resolver` overrides the resolvers in the `schema` with the same name;

  The `hello` resolver in the `schema` would be overridden by the `hello` resolver in the `resolvers`. Before it was opposite which is not expected.

  ```ts
  const schema = makeExecutableSchema({
    typeDefs: `
      type Query {
        hello: String
      }
    `,
    resolvers: {
      Query: {
        hello: () => 'Hello world!',
      },
    },
  });

  mergeSchemas({
    schemas: [schema],
    resolvers: {
      Query: {
        hello: () => 'New hello world',
      },
    },
  });
  ```

  `makeExecutableSchema` no longer takes `parseOptions` and you can pass those options directly;

  ```ts
  makeExecutableSchema({
    typeDefs: ``,
    parseOptions: {
      assumeValid: true,
    },
  });

  // After
  makeExecutableSchema({
    typeDefs: ``,
    assumeValid: true,
  });
  ```

  `makeExecutableSchema` no longer does pruning and it doesn't take `pruningOptions` anymore.
  You can use `pruneSchema` from `@graphql-tools/utils` if you need.

  `extractExtensionsFromSchema` moved from `@graphql-tools/merge` to `@graphql-tools/schema`.
  And `travelSchemaPossibleExtensions` has been dropped in favor of `mapSchema`.

### Patch Changes

- [#4624](https://github.com/ardatan/graphql-tools/pull/4624) [`e3167edc`](https://github.com/ardatan/graphql-tools/commit/e3167edc98172fda88ce2306c10c7d4a23d91d67) Thanks [@n1ru4l](https://github.com/n1ru4l)! - Fix CommonJS TypeScript resolution with `moduleResolution` `node16` or `nodenext`

- Updated dependencies [[`e3167edc`](https://github.com/ardatan/graphql-tools/commit/e3167edc98172fda88ce2306c10c7d4a23d91d67)]:
  - @graphql-tools/merge@8.3.2
  - @graphql-tools/utils@8.9.1

## 8.5.1

### Patch Changes

- Updated dependencies [2a3b45e3]
  - @graphql-tools/utils@8.9.0
  - @graphql-tools/merge@8.3.1

## 8.5.0

### Minor Changes

- d76a299c: Support TypeScript module resolution.

### Patch Changes

- Updated dependencies [a0abbbcd]
- Updated dependencies [d76a299c]
  - @graphql-tools/utils@8.8.0
  - @graphql-tools/merge@8.3.0

## 8.4.0

### Minor Changes

- 4914970b: `mergeSchemas` was skipping `defaultFieldResolver` and `defaultMergedResolver` by default while extracting resolvers for each given schema to reduce the overhead. But this doesn't work properly if you mix wrapped schemas and local schemas. So new `includeDefaultMergedResolver` flag is introduced in `getResolversFromSchema` to put default "proxy" resolvers in the extracted resolver map for `mergeSchemas`.

  This fixes an issue with alias issue, so nested aliased fields weren't resolved properly because of the missing `defaultMergedResolver` in the final merged schema which should come from the wrapped schema.

### Patch Changes

- Updated dependencies [4914970b]
  - @graphql-tools/utils@8.7.0
  - @graphql-tools/merge@8.2.15

## 8.3.14

### Patch Changes

- 041c5ba1: Use caret range for the tslib dependency
- Updated dependencies [041c5ba1]
  - @graphql-tools/merge@8.2.14
  - @graphql-tools/utils@8.6.13

## 8.3.13

### Patch Changes

- Updated dependencies [da7ad43b]
  - @graphql-tools/utils@8.6.12
  - @graphql-tools/merge@8.2.13

## 8.3.12

### Patch Changes

- Updated dependencies [c0762ee3]
  - @graphql-tools/utils@8.6.11
  - @graphql-tools/merge@8.2.12

## 8.3.11

### Patch Changes

- Updated dependencies [0fc510cb]
  - @graphql-tools/utils@8.6.10
  - @graphql-tools/merge@8.2.11

## 8.3.10

### Patch Changes

- Updated dependencies [31a33e2b]
  - @graphql-tools/utils@8.6.9
  - @graphql-tools/merge@8.2.10

## 8.3.9

### Patch Changes

- Updated dependencies [cb238877]
  - @graphql-tools/utils@8.6.8
  - @graphql-tools/merge@8.2.9

## 8.3.8

### Patch Changes

- Updated dependencies [0bbb1769]
  - @graphql-tools/utils@8.6.7
  - @graphql-tools/merge@8.2.8

## 8.3.7

### Patch Changes

- Updated dependencies [904c0847]
  - @graphql-tools/utils@8.6.6
  - @graphql-tools/merge@8.2.7

## 8.3.6

### Patch Changes

- 722abad7: Fix `addResolversToSchema` bug where type or field processing would be aborted prematurely.

  In previous versions, if `requireResolversToMatchSchema` was set to `ignore`, although no error would be thrown for an unexpected resolver type, type processing would still be aborted early. This fix changes the behavior to correctly continue resolver type processing with the next provided type.

  In previous versions, if a resolver field began with double underscores, it would correctly be used for legacy behavior to directly set a type property, but field processing would be aborted early. This fix changes the behavior to correctly continue type processing with the next field.

## 8.3.5

### Patch Changes

- Updated dependencies [be2c02d7]
  - @graphql-tools/utils@8.6.5
  - @graphql-tools/merge@8.2.6

## 8.3.4

### Patch Changes

- Updated dependencies [d36d530b]
  - @graphql-tools/utils@8.6.4
  - @graphql-tools/merge@8.2.5

## 8.3.3

### Patch Changes

- 0c0c6857: fix - align versions
- Updated dependencies [0c0c6857]
  - @graphql-tools/merge@8.2.4

## 8.3.2

### Patch Changes

- 18341363: feat(visitResult): ignore if field not present in visited object
- Updated dependencies [18341363]
  - @graphql-tools/merge@8.2.3
  - @graphql-tools/utils@8.6.2

## 8.3.1

### Patch Changes

- 4bfb3428: enhance: use ^ for tslib dependency
- Updated dependencies [4bfb3428]
  - @graphql-tools/merge@8.2.1
  - @graphql-tools/utils@8.5.1

## 8.3.0

### Minor Changes

- 149afddb: fix: getting ready for GraphQL v16

### Patch Changes

- Updated dependencies [149afddb]
  - @graphql-tools/merge@8.2.0
  - @graphql-tools/utils@8.4.0

## 8.2.0

### Minor Changes

- c5b0719c: feat: GraphQL v16 support

### Patch Changes

- Updated dependencies [c5b0719c]
- Updated dependencies [c5b0719c]
- Updated dependencies [c5b0719c]
- Updated dependencies [c5b0719c]
- Updated dependencies [c5b0719c]
  - @graphql-tools/utils@8.2.0
  - @graphql-tools/merge@8.1.0

## 8.1.2

### Patch Changes

- e50852e6: use version ranges instead of a fixed version for the graphql-tools package versions
- Updated dependencies [e50852e6]
  - @graphql-tools/merge@8.0.2

## 8.1.1

### Patch Changes

- Updated dependencies [2c807ddb]
  - @graphql-tools/utils@8.1.1
  - @graphql-tools/merge@8.0.1

## 8.1.0

### Minor Changes

- 67691b78: - `schemaExtensions` option has been added to `mergeSchemas`, `makeExecutableSchema` and `stitchSchemas` configurations

  Breaking Changes;

  - Move `mergeSchemas` and `MergeSchemasConfig` from `@graphql-tools/merge` to `@graphql-tools/schema` package to prevent circular dependency between them.
  - `mergeSchemasAsync` has been removed.
  - Move `NamedDefinitionNode`, `resetComments`, `collectComment`, `pushComment` and `printComment` from `@graphql-tools/merge` to `@graphql-tools/utils`.

### Patch Changes

- Updated dependencies [b9684631]
- Updated dependencies [a5fb77a4]
- Updated dependencies [9ede806a]
- Updated dependencies [67691b78]
  - @graphql-tools/utils@8.1.0
  - @graphql-tools/merge@8.0.0

## 8.0.3

### Patch Changes

- Updated dependencies [4992b472]
  - @graphql-tools/merge@7.0.0

## 8.0.2

### Patch Changes

- Updated dependencies [04830049]
  - @graphql-tools/utils@8.0.2
  - @graphql-tools/merge@6.2.17

## 8.0.1

### Patch Changes

- Updated dependencies [b823dbaf]
  - @graphql-tools/utils@8.0.1
  - @graphql-tools/merge@6.2.16

## 8.0.0

### Major Changes

- 7d3e3006: BREAKING CHANGE
  - Legacy Schema Directives and Directive Resolvers have been removed
  - - You can check the new method for both;
  - - - https://www.graphql-tools.com/docs/schema-directives
- 7d3e3006: BREAKING CHANGE
  - Remove `logger` and `addErrorLoggingToSchema`
  - - You can implement logging and debugging mechanism outside the resolvers using some kind of plugin system based library like [Envelop](https://www.envelop.dev/docs/core#uselogger)
- 7d3e3006: BREAKING CHANGE
  - Remove schema level resolvers feature and `addSchemaLevelResolver`
  - - You can wrap your resolvers by using [Resolvers Composition](https://www.graphql-tools.com/docs/resolvers-composition)
- 7d3e3006: BREAKING CHANGE
  - No longer exports `buildSchemaFromTypeDefinitions`, use `buildSchema` from `graphql-js` instead
  - Remove `allowUndefinedResolve` option in `makeExecutableSchema` because GraphQL Schema itself does this checking

### Patch Changes

- 7d3e3006: enhance(schema): use merge package to handle typeDefs and resolvers merging
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

## 7.1.5

### Patch Changes

- 22a9f3da: fix(deps): follow package conventions on when to pin

## 7.1.4

### Patch Changes

- 61da3e82: use value-or-promise to streamline working with sync values or async promises

## 7.1.3

### Patch Changes

- c8e26b8c: fix(schema): ignore resolvers if they are not in schema

## 7.1.2

### Patch Changes

- 21da6904: fix release
- Updated dependencies [21da6904]
  - @graphql-tools/utils@7.1.2

## 7.1.1

### Patch Changes

- b48a91b1: add ability to specify merge config within subschemas using directives
- Updated dependencies [b48a91b1]
  - @graphql-tools/utils@7.1.1

## 7.1.0

### Minor Changes

- 4f5a4efe: enhance(schema): add some options to improve schema creation performance

### Patch Changes

- 65ed780a: enhance(schema): do not visit resolvers if no validation is selected
- b79e3a6b: enhance(schema): do not visit abstract types if requireResolversForResolveType not present
- Updated dependencies [4f5a4efe]
  - @graphql-tools/utils@7.1.0

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

## 6.2.4

### Patch Changes

- 533d6d53: Bump all packages to allow adjustments
- Updated dependencies [32c3c4f8]
- Updated dependencies [533d6d53]
  - @graphql-tools/utils@6.2.4
