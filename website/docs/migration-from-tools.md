---
id: migration-from-tools
title: Migration to v7
sidebar_label: From tools v4 - v6
description: Migration from GraphQL Tools v4 - v6
---

## Upgrading from v6

If you are using GraphQL Tools v6, there are several breaking changes to be aware of.

#### Schema Delegation (`delegateToSchema` & `@graphql-tools/delegate`)

- The `delegateToSchema` return value has matured and been formalized as an `ExternalObject`, in which all errors are integrated into the GraphQL response, preserving their initial path. Those advanced users accessing the result directly will note the change in error handling. This also allows for the deprecation of unnecessary helper functions including `slicedError`, `getErrors`, `getErrorsByPathSegment` functions. Only external errors with missing or invalid paths must still be preserved by annotating the remote object with special properties. The new `getUnpathedErrors` function is therefore necessary for retrieving only these errors. Note also the new `annotateExternalObject` and `mergeExternalObjects` functions, as well as the renaming of `handleResult` to `resolveExternalValue`.

- The `transformRequest`/`transformResult` methods are now provided additional `delegationContext` and `transformationContext` arguments -- these were introduced in v6, but previously optional.

- The `transformSchema` method may wish to create additional delegating resolvers and so it is now provided the optional `subschemaOrSubschemaConfig`, `transforms`, and (non-executable) `transformedSchema` parameters. As in v6, the `transformSchema` is kicked off once to produce the non-executable version, and then, if a wrapping schema is being generated, proxying resolvers are created with access to the (non-executabel) initial result. In v7, the individual `transformSchema` methods also get access to the result of the first run in the form of these optional parameters so that, if necessary, they can create additional wrapping schema proxying resolvers.

- Transform types and the `applySchemaTransforms` are now relocated to the `delegate` package; `applyRequestTransforms`/`applyResultTransforms` functions have been deprecated, however, as this functionality has been replaced since v6 by the `Transformer` abstraction.

#### Remote Schemas & Wrapping (`wrapSchema`, `makeRemoteExecutableSchema`, and `@graphql-tools/wrap`)

- The format of the wrapping schema has solidified. All non-root fields are expected to use identical resolvers, either `defaultMergedResolver` or a custom equivalent, with root fields doing the hard work of proxying. Support for custom merged resolvers throught `createMergedResolver` has been deprecated, as custom merging resolvers conflicts when using stitching's type merging, where resolvers are expected to be identical across subschemas.

- The `WrapFields` transform's `wrappingResolver` option has been removed, as this complicates multiple wrapping layers, as well as planned functionality to wrap subscription root fields in potentially multiple layers, as the wrapping resolvers may be different in different layers. Modifying resolvers can still be performed by use of an additional transform such as `TransformRootFields` or `TransformObjectFields`.

- The `ExtendSchema` transform has been removed, as it is conceptually simpler just to use `stitchSchemas` with one subschema.

#### Schema Stitching (`stitchSchemas` & `@graphql-tools/stitch`)

- `stitchSchemas`'s `mergeTypes` option is now true by default! This causes the `onTypeConflict` option to be ignored by default. To use `onTypeConflict` to select a specific type instead of simply merging, simply set `mergeTypes` to false.

- Support for fragment hints has been removed in favor of selection set hints.

#### Other Utilities (`@graphql-tools/utils`)

- `filterSchema`'s `fieldFilter` will now filter *all* fields across Object, Interface, and Input types. For the previous Object-only behavior, switch to the `objectFieldFilter` option.
- Unused `fieldNodes` utility functions have been removed.
- Unused `typeContainsSelectionSet` function has been removed, and `typesContainSelectionSet` has been moved to the `stitch` package.
- Unnecessary `Operation` type has been removed in favor of `OperationTypeNode` from upstream graphql-js.
- As above, `applySchemaTransforms`/`applyRequestTransforms`/`applyResultTransforms` have been removed from the `utils` package, as they are implemented elsewhere or no longer necessary.

## Upgrading from v4/v5

If you are using GraphQL Tools v4/v5, additioanl changes are necessary.

#### Monorepo design

You can still import functions directly from `graphql-tools`, but we encourage you to instead import functions from specific packages under the new mono repo design: `@graphql-tools/schema`, `@graphql-tools/merge`, etc.

#### Schema Generation and Decoration API (`@graphql-tools/schema`)

Majority of schema modification functions now return new, altered schemas rather than modifying the original schema in place. Note that several functions have been renamed as `ResolveFunctions` and `MockFunctions` have been shortened to `Resolvers` and `Mocks` throughout the code base and documentation:
- `makeExecutableSchema`
- `addResolveFunctionsToSchema` => `addResolversToSchema`
- `attachDirectiveResolvers`
- `addSchemaLevelResolveFunctions` => `addSchemaLevelResolver`
- `addCatchUndefinedToSchema`
- `addErrorLoggingToSchema`
- `addMockFunctionsToSchema` => `addMocksToSchema`

Schema modification functions operating on fields now similarly take a schema as a parameter and return a new schema, rather than modifying the passed in typeMap (and requiring manual schema healing).
 - `appendObjectFields`
 - `removeObjectFields`

The `addConnectorsToContext` has been deprecated in favor of manually attaching connectors to context, see [#140](https://github.com/ardatan/graphql-tools/issues/140).

Abstract types that use resolveType properties to return an actual type rather than a type name may be unstable when using `graphql-tools`, as these types are hidden from the type map and cannot be recreated. These resolveType resolvers should be relatively easy to rewrite to use the name of a known `GraphQLObject` type included within the schema’s type map. This will soon be the recommended approach in upstream `graphql-js` as well, see [#2279](https://github.com/graphql/graphql-js/pull/2779#issuecomment-684947685).

#### Remote Schemas & Wrapping (`wrapSchema`, `makeRemoteExecutableSchema`, and `@graphql-tools/wrap`)

- Remote schema wrapping is now accomplished by using executors and subscribers rather than fetchers and links. Functions that convert links to executors/subscribers are included with @graphql-tools/links. [See the docs](/docs/remote-schemas).

- `Transform`<*>`Field Transforms` now all take a `fieldTransformer` with altered `FieldTransformer` type.
A FieldTransformer receives a field config as an argument rather than a field, so that library users are spared having to call fieldToFieldConfig. A `FieldTransformer` can return an array of type `[string, GraphQLFieldConfig<any, any>]` instead of an object `{ name: string, field: GraphQLFieldConfig<any, any> }` if it wishes to rename the field, the tuple is less verbose -- and the object is misnamed, it should be `{ newName, newFieldConfig }`.

#### Schema Stitching (`stitchSchemas` & `@graphql-tools/stitch`)

- Stitching has been renamed (`mergeSchemas` => `stitchSchemas`)
- `resolvers` parameter passed to stitchSchemas match type signature of resolvers passed to makeExecutableSchema (and can no longer be functions). Stitching metadata stored within “mergeInfo” may still be accessed within each resolver under `info.schema.extensions.stitchingInfo`.
- Custom proxying resolvers take an options object instead of individual parameters, a breaking change from v5, when the custom proxying resolvers were introduced.

#### Schema Delegation (`delegateToSchema` & `@graphql-tools/delegate`)

- As above, `mergeInfo` in `GraphQLResolveInfo` has been replaced by `stitchingInfo` in `GraphQLSchema`s extensions.
- `delegateToSchema` is not available in `mergeInfo` or `stitchingInfo` anymore. Simply import the `delegateToSchema` function from the `delegate` package instead.

#### Other Utilities (`@graphql-tools/utils`)

- Polyfills for graphql versions earlier than 14.2 have been removed, including `toConfig`
- `fieldToFieldConfig` and `inputFieldToInputFieldConfig` functionality is now exported separately, although library users should ideally not have to use them.
