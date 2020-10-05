---
id: migration-from-tools-v5
title: Migration from v4 & v5
sidebar_label: From v4 & v5
description: Migration from GraphQL Tools v4 & v5
---

If you're using GraphQL Tools v4 and v5, it is straightforward to migrate to v6.

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

#### Remote Schema & Wrapping (`makeRemoteExecutableSchema` and `@graphql-tools/wrap`)

- Remote schema wrapping is now accomplished by using executors and subscribers rather than fetchers and links. Functions that convert links to executors/subscribers are included with @graphql-tools/links. [See the docs](/docs/remote-schemas).

- `Transform`<*>`Field Transforms` now all take a `fieldTransformer` with altered `FieldTransformer` type.
A FieldTransformer receives a field config as an argument rather than a field, so that library users are spared having to call fieldToFieldConfig. A `FieldTransformer` can return an array of type `[string, GraphQLFieldConfig<any, any>]` instead of an object `{ name: string, field: GraphQLFieldConfig<any, any> }` if it wishes to rename the field, the tuple is less verbose -- and the object is misnamed, it should be `{ newName, newFieldConfig }`.

#### Schema Stitching (`stitchSchemas` & `@graphql-tools/stitch`)

- Stitching has been renamed (`mergeSchemas` => `stitchSchemas`)
- Fragment hints have been deprecated in favor of selectionSet hints.
- `resolvers` parameter passed to stitchSchemas match type signature of resolvers passed to makeExecutableSchema (and can no longer be functions). Stitching metadata stored within “mergeInfo” may still be accessed within each resolver under `info.schema.extensions.stitchingInfo`.
- Custom proxying resolvers take an options object instead of individual parameters, a breaking change from v5, when the custom proxying resolvers were introduced.

#### Schema Delegation (`delegateToSchema` & `@graphql-tools/delegate`)

- As above, instead of `mergeInfo` in `GraphQLResolveInfo`, we have `stitchingInfo` in `GraphQLSchema`s extensions.
- `delegateToSchema` is not available in `mergeInfo` or `stitchingInfo` anymore. You should simply import that `delegateToSchema` function from this package instead.

#### Some other utils (`@graphql-tools/utils`)

- Polyfills for graphql versions earlier than 14.2 have been removed, including `toConfig`
- `fieldToFieldConfig` and `inputFieldToInputFieldConfig` functionality is now exported separately, although library users should ideally not have to use them.
