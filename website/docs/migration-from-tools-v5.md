---
id: migration-from-tools-v5
title: Migration from v4 & v5
description: Migration from GraphQL Tools v4 & v5
---

If you're using old versions of GraphQL Tools, it is easy to migrate from those versions to v6 and later. But you need to install specific packages according to your needs instead of single large `graphql-tools` package because we switched to monorepo.

#### Schema Generation and Decoration API (`@graphql-tools/schema`)

Majority of schema modification functions has been renamed and they now return new schemas without editing the original schema, rather than modifying the original schema in place. The return value of the function has the new schema:
- `makeExecutableSchema`
- `addResolveFunctionsToSchema` => `addResolversToSchema`
- `attachDirectiveResolvers`
- `addSchemaLevelResolveFunctions` => `addSchemaLevelResolver`
- `addCatchUndefinedToSchema`
- `addErrorLoggingToSchema`
- `addMockFunctionsToSchema` => `addMocksToSchema`
- `addConnectorsToContext` has been deprecated, attaching context manually is clearer
 - - See [#140](https://github.com/ardatan/graphql-tools/issues/140)

> Schema modification functions operating on fields now similarly take a schema as a parameter and return a new schema, rather than modifying the passed in typeMap (and requiring manual schema healing)
 - - `appendObjectFields`
 - - `removeObjectFields`

> Abstract types that use resolveType properties to return an actual type rather than a type name may be unstable when using graphql-tools, as these types are hidden from the type map and cannot be recreated. These resolveType resolvers should be relatively easy to rewrite to use the name of a known `GraphQLObject` type included within the schema’s type map. This may limit the use of `graphql-tools` for advanced schemas that rely on dynamic abstract types, but greatly simplifies the code base.

#### Remote Schema & Wrapping (`makeRemoteExecutableSchema` and `@graphql-tools/wrap`)

- Remote schema wrapping is now accomplished by using executors and subscribers rather than fetchers and links. Functions that convert links to executors/subscribers are included with @graphql-tools/links. See https://github.com/ardatan/graphql-tools/blob/move-graphql-toolkit/website/docs/remote-schemas.md.

- `Transform`<*>`Field Transforms` now all take a `fieldTransformer` with altered `FieldTransformer` type.
A FieldTransformer receives a field config as an argument rather than a field, so that library users are spared having to call fieldToFieldConfig. A `FieldTransformer` can return an array of type `[string, GraphQLFieldConfig<any, any>]` instead of an object `{ name: string, field: GraphQLFieldConfig<any, any> }` if it wishes to rename the field, the tuple is less verbose and the object is misnamed, it should be { newName, newFieldConfig } anyway.

#### Schema Stitching (`stitchSchemas` & `@graphql-tools/stitch`)

- stitching has been renamed (`mergeSchemas` => `stitchSchemas`)
- use selectionSet hints instead of fragment hints within the resolver map
- Allows inheritance from interfaces
resolvers passed to stitchSchemas match type of resolvers passed to makeExecutableSchema (and can no longer be functions). Stitching metadata stored within “mergeInfo” may still be accessed within each resolver as info.mergeInfo
- Custom proxying resolvers now take an options object instead of individual parameters, a breaking change from v5, when the custom proxying resolvers were introduced

#### Schema Delegation (`delegateToSchema` & `@graphql-tools/delegate`)

`delegateToSchema` is not available in `mergeInfo` anymore. You need to import that `delegateToSchema` function from this package instead.

- `info.mergeInfo.delegate` & `info.mergeInfo.delegateToSchema` => `delegateToSchema`

Instead of `mergeInfo` in `GraphQLResolveInfo`, we have `stitchingInfo` in `GraphQLSchema`s extensions.

#### Some other utils (`@graphql-tools/utils`)

- Polyfills for graphql versions earlier than 14.2 have been removed, including `toConfig`
- `fieldToFieldConfig` and `inputFieldToInputFieldConfig` functionality is now exported separately, although library users should ideally not have to use them.
