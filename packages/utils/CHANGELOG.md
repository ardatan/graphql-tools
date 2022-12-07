# @graphql-tools/utils

## 9.1.3

### Patch Changes

- [#4887](https://github.com/ardatan/graphql-tools/pull/4887) [`904fe770`](https://github.com/ardatan/graphql-tools/commit/904fe770a355ee3d79464c3bbf0375d2dcd64759) Thanks [@ardatan](https://github.com/ardatan)! - Fix leak on Node 14 and add cancellation to async iterables correctly

## 9.1.2

### Patch Changes

- [`13c24883`](https://github.com/ardatan/graphql-tools/commit/13c24883004d5330f7402cb20566e37535c5729b) Thanks [@ardatan](https://github.com/ardatan)! - Fix handling argument values in gateway request

## 9.1.1

### Patch Changes

- [#4842](https://github.com/ardatan/graphql-tools/pull/4842) [`7411a5e7`](https://github.com/ardatan/graphql-tools/commit/7411a5e71a8138d9ccfe907b1fb01e62fcbb0cdb) Thanks [@charlypoly](https://github.com/charlypoly)! - Fix validation swallowing fragments on naming conflicts

## 9.1.0

### Minor Changes

- [#4827](https://github.com/ardatan/graphql-tools/pull/4827) [`c0639dd0`](https://github.com/ardatan/graphql-tools/commit/c0639dd0065db1b5bcedaabf58b11945714bab8d) Thanks [@ardatan](https://github.com/ardatan)! - TypeError and all other GraphQLError s from argument value parsing should return 400

## 9.0.1

### Patch Changes

- [`d83b1960`](https://github.com/ardatan/graphql-tools/commit/d83b19605be71481ccf8effd80d5254423ea811a) Thanks [@ardatan](https://github.com/ardatan)! - Fix @stream support

## 9.0.0

### Major Changes

- [#4801](https://github.com/ardatan/graphql-tools/pull/4801) [`8f6d3efc`](https://github.com/ardatan/graphql-tools/commit/8f6d3efc92b25236f5a3a761ea7ba2f0a7c7f550) Thanks [@ardatan](https://github.com/ardatan)! - _BREAKING_: `checkValidationErrors` has been dropped and `validateGraphQlDocuments` now accepts `DocumentNode[]` instead and it throws the original `GraphQLError`s with the correct stack trace

- [#4796](https://github.com/ardatan/graphql-tools/pull/4796) [`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931) Thanks [@saihaj](https://github.com/saihaj)! - update `collectFields` to support collecting deffered values

### Minor Changes

- [#4796](https://github.com/ardatan/graphql-tools/pull/4796) [`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931) Thanks [@saihaj](https://github.com/saihaj)! - add `@defer` directive

- [#4796](https://github.com/ardatan/graphql-tools/pull/4796) [`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931) Thanks [@saihaj](https://github.com/saihaj)! - export collect field helpers

- [#4796](https://github.com/ardatan/graphql-tools/pull/4796) [`80836fa7`](https://github.com/ardatan/graphql-tools/commit/80836fa78af3c6e61c61fe4d3bc52831b2c58931) Thanks [@saihaj](https://github.com/saihaj)! - add `@stream` directive

## 8.13.1

### Patch Changes

- [#4795](https://github.com/ardatan/graphql-tools/pull/4795) [`f7daf777`](https://github.com/ardatan/graphql-tools/commit/f7daf7777cc214801886e4a45c0389bc5837d175) Thanks [@glasser](https://github.com/glasser)! - Fix build break in v8.13.0 in some ESM environments.

## 8.13.0

### Minor Changes

- [#4778](https://github.com/ardatan/graphql-tools/pull/4778) [`df5848b8`](https://github.com/ardatan/graphql-tools/commit/df5848b85102827f004f23aded7cf802cdcde00f) Thanks [@saihaj](https://github.com/saihaj)! - add isIterableObject, isObjectLike, isPromise, promiseReduce, hasOwnProperty

- [#4778](https://github.com/ardatan/graphql-tools/pull/4778) [`df5848b8`](https://github.com/ardatan/graphql-tools/commit/df5848b85102827f004f23aded7cf802cdcde00f) Thanks [@saihaj](https://github.com/saihaj)! - add `Path` util from `graphql/jsutils`

### Patch Changes

- [#4778](https://github.com/ardatan/graphql-tools/pull/4778) [`df5848b8`](https://github.com/ardatan/graphql-tools/commit/df5848b85102827f004f23aded7cf802cdcde00f) Thanks [@saihaj](https://github.com/saihaj)! - improve inpsect util

## 8.12.0

### Minor Changes

- [#4706](https://github.com/ardatan/graphql-tools/pull/4706) [`43c736bd`](https://github.com/ardatan/graphql-tools/commit/43c736bd1865c00898966a7ed14060496c9e6a0c) Thanks [@ardatan](https://github.com/ardatan)! - Do not throw duplicate type error name while rewiring types

## 8.11.0

### Minor Changes

- [#4661](https://github.com/ardatan/graphql-tools/pull/4661) [`403ed450`](https://github.com/ardatan/graphql-tools/commit/403ed4507eff7cd509f410f7542a702da72e1a9a) Thanks [@nicolaslt](https://github.com/nicolaslt)! - Add getArgumentsWithDirectives

### Patch Changes

- [#4694](https://github.com/ardatan/graphql-tools/pull/4694) [`71cb4fae`](https://github.com/ardatan/graphql-tools/commit/71cb4faeb0833a228520a7bc2beed8ac7274443f) Thanks [@dimatill](https://github.com/dimatill)! - Fix pruneSchema to not remove type that is used only as a directive argument type

## 8.10.1

### Patch Changes

- [#4673](https://github.com/ardatan/graphql-tools/pull/4673) [`4fe3d9c0`](https://github.com/ardatan/graphql-tools/commit/4fe3d9c037e9c138bd8a9b04b3977d74eba32c97) Thanks [@thgreasi](https://github.com/thgreasi)! - Fix typings for TypeScript 4.8

## 8.10.0

### Minor Changes

- [#4643](https://github.com/ardatan/graphql-tools/pull/4643) [`2609d71f`](https://github.com/ardatan/graphql-tools/commit/2609d71f7c3a0ef2b381c51d9ce60b0de49f9b27) Thanks [@ardatan](https://github.com/ardatan)! - Revert the breaking change introduced in `@graphql-tools/merge`

## 8.9.1

### Patch Changes

- [#4624](https://github.com/ardatan/graphql-tools/pull/4624) [`e3167edc`](https://github.com/ardatan/graphql-tools/commit/e3167edc98172fda88ce2306c10c7d4a23d91d67) Thanks [@n1ru4l](https://github.com/n1ru4l)! - Fix CommonJS TypeScript resolution with `moduleResolution` `node16` or `nodenext`

## 8.9.0

### Minor Changes

- 2a3b45e3: Allow `&` in filenames.

  Related to https://github.com/dotansimha/graphql-code-generator/issues/6174

## 8.8.0

### Minor Changes

- d76a299c: Support TypeScript module resolution.

### Patch Changes

- a0abbbcd: fix(visitResult): handle introspection fields correctly with an introspection query result

## 8.7.0

### Minor Changes

- 4914970b: `mergeSchemas` was skipping `defaultFieldResolver` and `defaultMergedResolver` by default while extracting resolvers for each given schema to reduce the overhead. But this doesn't work properly if you mix wrapped schemas and local schemas. So new `includeDefaultMergedResolver` flag is introduced in `getResolversFromSchema` to put default "proxy" resolvers in the extracted resolver map for `mergeSchemas`.

  This fixes an issue with alias issue, so nested aliased fields weren't resolved properly because of the missing `defaultMergedResolver` in the final merged schema which should come from the wrapped schema.

## 8.6.13

### Patch Changes

- 041c5ba1: Use caret range for the tslib dependency

## 8.6.12

### Patch Changes

- da7ad43b: Fix GraphQL v17 incompatibility issues and introduce `createGraphQLError` helper function for backwards compatibility.

## 8.6.11

### Patch Changes

- c0762ee3: Incoming GraphQL v17 compatibility #4468

## 8.6.10

### Patch Changes

- 0fc510cb: Interface implementations should be included when a return type is an interface.

## 8.6.9

### Patch Changes

- 31a33e2b: pruneSchema will no longer removed used input object type.

## 8.6.8

### Patch Changes

- cb238877: pruneSchema will now prune unused implementations of interfaces

## 8.6.7

### Patch Changes

- 0bbb1769: Refine generic typings using `extends X` when appropriate

  Typescript 4.7 has stricter requirements around generics
  which is explained well in the related PR:
  https://github.com/microsoft/TypeScript/pull/48366

  These changes resolve the errors that these packages will
  face when attempting to upgrade to TS 4.7 (still in beta
  at the time of writing this). Landing these changes now
  will allow other TS libraries which depend on these
  packages to experiment with TS 4.7 in the meantime.

## 8.6.6

### Patch Changes

- 904c0847: Support deprecated directive on enum values

## 8.6.5

### Patch Changes

- be2c02d7: fix(utils): use 3 as inspect recursive depth

## 8.6.4

### Patch Changes

- d36d530b: fix(utils): pass the value as-is if it cannot be parsed by the actual type

## 8.6.3

### Patch Changes

- 3da3d66c: fix - align versions

## 8.6.2

### Patch Changes

- 18341363: feat(visitResult): ignore if field not present in visited object

## 8.6.1

### Patch Changes

- 43a60f93: Improve getArgumentValues check for null values
- 20e1058b: fix pruneSchema

  Schema pruning must be done in rounds, as pruning types will automatically prune any fields that rely on them (within mapSchema), but then the empty types may also require pruning.

## 8.6.0

### Minor Changes

- 69b316c2: feat(utils): more withCancel utils

## 8.5.5

### Patch Changes

- 7b5d72c5: enhance(utils): better typing for withCancel

## 8.5.4

### Patch Changes

- 51315610: enhance: avoid using globalThis

## 8.5.3

### Patch Changes

- 960e178a: fix: isAsyncIterable should check if it is an object with iterator factory function
- 947a3fe0: enhance(utils): show error with details in inspect fn

## 8.5.2

### Patch Changes

- 233e0379: fix(utils): respect new specifiedByURL of GraphQL v16

## 8.5.1

### Patch Changes

- 4bfb3428: enhance: use ^ for tslib dependency

## 8.5.0

### Minor Changes

- ad04dc79: enhance: make operationType optional

## 8.4.0

### Minor Changes

- 149afddb: fix: getting ready for GraphQL v16

## 8.3.0

### Minor Changes

- 58262be7: feat(utils): export createDefaultRules

## 8.2.5

### Patch Changes

- 1043219f: fix implicit dependencies

## 8.2.4

### Patch Changes

- 014937db: batch-execute enhancements:
  - fixes bugs with batched fragment definitions
  - unpathed errors are now returned for all batch results
  - the "graphqlTools" prefix is simplified down to just "\_"
  - new tests and documentation

## 8.2.3

### Patch Changes

- da157d62: fix(utils): Avoid processing read-only properties on visitData method

## 8.2.2

### Patch Changes

- d4918a78: fix(commentDescriptions): handle descriptions and comments correctly during merge

## 8.2.1

### Patch Changes

- 50609df8: fix(utils): print specifiedBy directive correctly
- be6fdb88: fix(utils): bring back breaking change for fixSchemaAst

## 8.2.0

### Minor Changes

- c5b0719c: enhance(utils): copy inspect util from graphql-js
- c5b0719c: feat: GraphQL v16 support
- c5b0719c: enhance(utils): move memoize functions to utils
- c5b0719c: enhance(utils): copy collectFields from graphql-js@16 for backwards compat

### Patch Changes

- c5b0719c: enhance(utils): memoize root types utility functions

## 8.1.2

### Patch Changes

- c8c13ed1: enhance: remove TypeMap and small improvements

## 8.1.1

### Patch Changes

- 2c807ddb: enhance(buildOperationNodeForField): mutation response return a field of type Query

## 8.1.0

### Minor Changes

- b9684631: feat(validate-documents): more clear error messages with stack
- 67691b78: - `schemaExtensions` option has been added to `mergeSchemas`, `makeExecutableSchema` and `stitchSchemas` configurations

  Breaking Changes;

  - Move `mergeSchemas` and `MergeSchemasConfig` from `@graphql-tools/merge` to `@graphql-tools/schema` package to prevent circular dependency between them.
  - `mergeSchemasAsync` has been removed.
  - Move `NamedDefinitionNode`, `resetComments`, `collectComment`, `pushComment` and `printComment` from `@graphql-tools/merge` to `@graphql-tools/utils`.

### Patch Changes

- 9ede806a: enhance(utils): use inspect from graphql-js instead of node:util #3324

## 8.0.2

### Patch Changes

- 04830049: fix(utils): support old TypeScript versions

## 8.0.1

### Patch Changes

- b823dbaf: fix(utils): fix AggregateErrorConstructor type issue

## 8.0.0

### Major Changes

- af9a78de: BREAKING CHANGE

  - Now each loader handles glob patterns internally and returns an array of `Source` object instead of single `Source`

  - GraphQL Tag Pluck now respects code locations and returns graphql-js `Source` objects for each found code block

  - Thanks to the one above, `CodeFileLoader` now returns different `Source` objects for each found SDL code block.

- 7d3e3006: BREAKING CHANGE
  - Remove `fieldToFieldConfig`, `argsToFieldConfigArgument` and `argumentToArgumentConfig`
  - - You can use `.toConfig` method instead for each.
- 7d3e3006: BREAKING CHANGE
  - Legacy Schema Directives and Directive Resolvers have been removed
  - - You can check the new method for both;
  - - - https://www.graphql-tools.com/docs/schema-directives
- dae6dc7b: refactor: ExecutionParams type replaced by Request type

  rootValue property is now a part of the Request type.

  When delegating with delegateToSchema, rootValue can be set multiple ways:

  - when using a custom executor, the custom executor can utilize a rootValue in whichever custom way it specifies.
  - when using the default executor (execute/subscribe from graphql-js):
    -- rootValue can be passed to delegateToSchema via a named option
    -- rootValue can be included within a subschemaConfig
    -- otherwise, rootValue is inferred from the originating schema

  When using wrapSchema/stitchSchemas, a subschemaConfig can specify the createProxyingResolver function which can pass whatever rootValue it wants to delegateToSchema as above.

- 6877b913: BREAKING CHANGES;

  `mergeDeep` now takes an array of sources instead of set of parameters as input and it takes an additional flag to enable prototype merging
  Instead of `mergeDeep(...sources)` => `mergeDeep(sources)`

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

- 7d3e3006: BREAKING CHANGE
  - Now it uses the native [`AggregateError`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AggregateError) implementation. The major difference is the individual errors are kept under `errors` property instead of the object itself with `Symbol.iterator`.
  ```js
  // From;
  for (const error of aggregateError)
  // To;
  for (const error of aggregateError.errors)
  ```
- 8c8d4fc0: BREAKING CHANGE: remove cloneSchema
- 7d3e3006: BREAKING CHANGE
  - No longer exports `debugLog` but uses `console.log` directly only if `DEBUG` is available under `process.env`
- 7d3e3006: BREAKING CHANGE
  - No longer applies `camelCase` naming convention in `buildOperationNodeForField`
- 74581cf3: fix(getDirectives): preserve order around repeatable directives

  BREAKING CHANGE: getDirectives now always return an array of individual DirectiveAnnotation objects consisting of `name` and `args` properties.

  New useful function `getDirective` returns an array of objects representing any args for each use of a single directive (returning the empty object `{}` when a directive is used without arguments).

  Note: The `getDirective` function returns an array even when the specified directive is non-repeatable. This is because one use of this function is to throw an error if more than one directive annotation is used for a non repeatable directive!

  When specifying directives in extensions, one can use either the old or new format.

- c0ca3190: BREAKING CHANGE
  - Remove Subscriber and use only Executor
  - - Now `Executor` can receive `AsyncIterable` and subscriptions will also be handled by `Executor`. This is a future-proof change for defer, stream and live queries
- 7d3e3006: BREAKING CHANGE
  - No longer exports `SchemaVisitor`, `visitSchema` and `VisitSchemaKind`
  - - Use [`mapSchema`](https://www.graphql-tools.com/docs/schema-directives/#full-mapschema-api) instead

### Minor Changes

- 9c26b847: enhance(loaders): remove optional methods from the Loader interface
- 7d3e3006: feat(utils): Respect operationName and rootValue in ExecutionParams

### Patch Changes

- 982c8f53: enhance(utils): refactor, cleanup and remove extra work

## 7.10.0

### Minor Changes

- e632c5d1: Make executors not generic over context types

### Patch Changes

- 99f092fd: fix(getResolversFromSchema) Fix resolvers for type names starting with a single underscore.

## 7.9.1

### Patch Changes

- be23817f: enhance(utils): do not extract default resolvers

## 7.9.0

### Minor Changes

- 20d2c7bc: feat(utils): add withCancel

## 7.8.1

### Patch Changes

- dbdb78e0: fix(visitResult): don't throw on encountering \_\_typename in request (#2860)

## 7.8.0

### Minor Changes

- 03c579b1: enhance(utils): astFromDirective doesn't need schema anymore

## 7.7.3

### Patch Changes

- d2a17c70: enhance(printSchemaWithDirectives): show directives before other definitions #2752

## 7.7.2

### Patch Changes

- a4f1ee58: \_\_ is reserved for introspection

## 7.7.1

### Patch Changes

- 194ac370: fix(utils): add createSchemaDefinition again to fix breaking change

## 7.7.0

### Minor Changes

- 58fd4b28: feat(types): add TContext to stitchSchemas and executor

### Patch Changes

- 43da6b59: enhance(merge): reduce number of iterations

## 7.6.0

### Minor Changes

- 5b637e2f: Add generic pruning filter option

## 7.5.2

### Patch Changes

- de16fff4: Fix pruneSchema with unimplemented interfaces

## 7.5.1

### Patch Changes

- 33d1b9e7: Fix pruneSchema with unused interfaces

## 7.5.0

### Minor Changes

- 219ed392: enhance(utils): Extract getDocumentNodeFromSchema from printSchemaWithDirectives

### Patch Changes

- 219ed392: fix(utils): fix missing default value of input object type field
- 219ed392: fix(utils): print specifiedBy directive definitions correctly

## 7.4.0

### Minor Changes

- 8f331aaa: enhance(utils): Extract getDocumentNodeFromSchema from printSchemaWithDirectives

### Patch Changes

- 8f331aaa: fix(utils): fix missing default value of input object type field

## 7.3.0

### Minor Changes

- 6387572c: feat(utils): export astFrom\* helper functions

## 7.2.6

### Patch Changes

- e53f97b3: fix(utils): provide { done: true } from iterator when complete is called on observer in observableToAsyncIterable

## 7.2.5

### Patch Changes

- 4fc05eb7: Fixes the handling of repeatable directives in the `getDirectives` method. Previously repeatable directives were nested and duplicated. They will now return as a flat array map:

  ```graphql
  @mydir(arg: "first") @mydir(arg: "second")
  ```

  translates into:

  ```js
  {
    mydir: [{ arg: 'first' }, { arg: 'second' }];
  }
  ```

## 7.2.4

### Patch Changes

- 6e50d9fc: enhance(stitching-directives): use keyField

  When using simple keys, i.e. when using the keyField argument to `@merge`, the keyField can be added implicitly to the types's key. In most cases, therefore, `@key` should not be required at all.

## 7.2.3

### Patch Changes

- 3d1340a3: fix(printSchemaWithDirectives): typo

## 7.2.2

### Patch Changes

- 63ab0034: fix(printSchemaWithDirectives): should print directives where used, even if directives themselves are not defined within the schema.

## 7.2.1

### Patch Changes

- 270046a1: fix(TransformInputObjectFields): transform variables #2353

## 7.2.0

### Minor Changes

- c3996f60: enhance(utils): support code-first schemas by allowing directives to be read from extensions

### Patch Changes

- c3996f60: fix(stitchingDirectives): complete support for code first schemas
- c3996f60: fix(printSchemaWithDirectives): should work for code-first schemas as well
- c3996f60: enhance(utils) filter root field arguments with filterSchema

## 7.1.6

### Patch Changes

- cd5da458: fix(utils): fix crashes when return null while visitSchema

## 7.1.5

### Patch Changes

- 298cd39e: fix(url-loader): do not fail multipart request when null variable given

## 7.1.4

### Patch Changes

- 4240a959: fix(utils): fix Observable signature for observableToAsyncIterator

## 7.1.3

### Patch Changes

- 6165c827: Trow on SDL syntax errors

## 7.1.2

### Patch Changes

- 21da6904: fix release

## 7.1.1

### Patch Changes

- b48a91b1: add ability to specify merge config within subschemas using directives

## 7.1.0

### Minor Changes

- 4f5a4efe: enhance(schema): add some options to improve schema creation performance

## 7.0.2

### Patch Changes

- e3176633: fix(utils): revert to old observableToAsyncIterable return type

## 7.0.1

### Patch Changes

- 8133a907: fix(utils): Remove \$ from invalidPathRegex
- 2b6c813e: fix(utils): fix typing mismatch between linkToSubscriber and observableToAsyncIterable

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

## 6.2.4

### Patch Changes

- 32c3c4f8: Fix duplication of scalar directives in merge
- 533d6d53: Bump all packages to allow adjustments
