---
id: "_merge_src_index_.mergeschemasconfig"
title: "MergeSchemasConfig"
sidebar_label: "MergeSchemasConfig"
---

Configuration object for schema merging

## Type parameters

▪ **Resolvers**: *[IResolvers](../modules/_utils_src_index_.md#iresolvers)*

## Hierarchy

* [Config](_merge_src_index_.config)

* BuildSchemaOptions

  ↳ **MergeSchemasConfig**

## Index

### Properties

* [assumeValid](_merge_src_index_.mergeschemasconfig.md#optional-assumevalid)
* [assumeValidSDL](_merge_src_index_.mergeschemasconfig.md#optional-assumevalidsdl)
* [commentDescriptions](_merge_src_index_.mergeschemasconfig.md#optional-commentdescriptions)
* [convertExtensions](_merge_src_index_.mergeschemasconfig.md#optional-convertextensions)
* [exclusions](_merge_src_index_.mergeschemasconfig.md#optional-exclusions)
* [forceSchemaDefinition](_merge_src_index_.mergeschemasconfig.md#optional-forceschemadefinition)
* [logger](_merge_src_index_.mergeschemasconfig.md#optional-logger)
* [resolverValidationOptions](_merge_src_index_.mergeschemasconfig.md#optional-resolvervalidationoptions)
* [resolvers](_merge_src_index_.mergeschemasconfig.md#optional-resolvers)
* [reverseDirectives](_merge_src_index_.mergeschemasconfig.md#optional-reversedirectives)
* [schemaDirectives](_merge_src_index_.mergeschemasconfig.md#optional-schemadirectives)
* [schemas](_merge_src_index_.mergeschemasconfig.md#schemas)
* [sort](_merge_src_index_.mergeschemasconfig.md#optional-sort)
* [throwOnConflict](_merge_src_index_.mergeschemasconfig.md#optional-throwonconflict)
* [typeDefs](_merge_src_index_.mergeschemasconfig.md#optional-typedefs)
* [useSchemaDefinition](_merge_src_index_.mergeschemasconfig.md#optional-useschemadefinition)

## Properties

### `Optional` assumeValid

• **assumeValid**? : *boolean*

*Inherited from [MergeSchemasConfig](_merge_src_index_.mergeschemasconfig).[assumeValid](_merge_src_index_.mergeschemasconfig.md#optional-assumevalid)*

Defined in node_modules/graphql/type/schema.d.ts:122

When building a schema from a GraphQL service's introspection result, it
might be safe to assume the schema is valid. Set to true to assume the
produced schema is valid.

Default: false

___

### `Optional` assumeValidSDL

• **assumeValidSDL**? : *boolean*

*Inherited from [MergeSchemasConfig](_merge_src_index_.mergeschemasconfig).[assumeValidSDL](_merge_src_index_.mergeschemasconfig.md#optional-assumevalidsdl)*

Defined in node_modules/graphql/utilities/buildASTSchema.d.ts:22

Set to true to assume the SDL is valid.

Default: false

___

### `Optional` commentDescriptions

• **commentDescriptions**? : *boolean*

*Inherited from [Config](_merge_src_index_.config).[commentDescriptions](_merge_src_index_.config.md#optional-commentdescriptions)*

*Overrides [GraphQLFileLoaderOptions](_loaders_graphql_file_src_index_.graphqlfileloaderoptions).[commentDescriptions](_loaders_graphql_file_src_index_.graphqlfileloaderoptions.md#optional-commentdescriptions)*

*Defined in [packages/merge/src/typedefs-mergers/merge-typedefs.ts:38](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L38)*

Descriptions are defined as preceding string literals, however an older
experimental version of the SDL supported preceding comments as
descriptions. Set to true to enable this deprecated behavior.
This option is provided to ease adoption and will be removed in v16.

Default: false

___

### `Optional` convertExtensions

• **convertExtensions**? : *boolean*

*Inherited from [Config](_merge_src_index_.config).[convertExtensions](_merge_src_index_.config.md#optional-convertextensions)*

*Defined in [packages/merge/src/typedefs-mergers/merge-typedefs.ts:59](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L59)*

___

### `Optional` exclusions

• **exclusions**? : *string[]*

*Inherited from [Config](_merge_src_index_.config).[exclusions](_merge_src_index_.config.md#optional-exclusions)*

*Defined in [packages/merge/src/typedefs-mergers/merge-typedefs.ts:57](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L57)*

___

### `Optional` forceSchemaDefinition

• **forceSchemaDefinition**? : *boolean*

*Inherited from [Config](_merge_src_index_.config).[forceSchemaDefinition](_merge_src_index_.config.md#optional-forceschemadefinition)*

*Defined in [packages/merge/src/typedefs-mergers/merge-typedefs.ts:23](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L23)*

Creates schema definition, even when no types are available
Produces: `schema { query: Query }`

Default: false

___

### `Optional` logger

• **logger**? : *[ILogger](_schema_src_index_.ilogger)*

*Defined in [packages/merge/src/merge-schemas.ts:41](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/merge-schemas.ts#L41)*

Custom logger instance

___

### `Optional` resolverValidationOptions

• **resolverValidationOptions**? : *[IResolverValidationOptions](_utils_src_index_.iresolvervalidationoptions)*

*Defined in [packages/merge/src/merge-schemas.ts:37](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/merge-schemas.ts#L37)*

Options to validate the resolvers being merged, if provided

___

### `Optional` resolvers

• **resolvers**? : *Resolvers | Resolvers[]*

*Defined in [packages/merge/src/merge-schemas.ts:29](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/merge-schemas.ts#L29)*

Additional resolvers to also merge

___

### `Optional` reverseDirectives

• **reverseDirectives**? : *boolean*

*Inherited from [Config](_merge_src_index_.config).[reverseDirectives](_merge_src_index_.config.md#optional-reversedirectives)*

*Defined in [packages/merge/src/typedefs-mergers/merge-typedefs.ts:56](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L56)*

Puts the next directive first.

Default: false

**`example:`** 
Given:
```graphql
 type User { a: String @foo }
 type User { a: String @bar }
```

Results:
```
 type User { a: @bar @foo }
```

___

### `Optional` schemaDirectives

• **schemaDirectives**? : *object*

*Defined in [packages/merge/src/merge-schemas.ts:33](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/merge-schemas.ts#L33)*

Schema directives to apply to the type definitions being merged, if provided

#### Type declaration:

* \[ **directiveName**: *string*\]: typeof SchemaDirectiveVisitor

___

###  schemas

• **schemas**: *GraphQLSchema[]*

*Defined in [packages/merge/src/merge-schemas.ts:21](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/merge-schemas.ts#L21)*

The schemas to be merged

___

### `Optional` sort

• **sort**? : *boolean | CompareFn‹string›*

*Inherited from [Config](_merge_src_index_.config).[sort](_merge_src_index_.config.md#optional-sort)*

*Defined in [packages/merge/src/typedefs-mergers/merge-typedefs.ts:58](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L58)*

___

### `Optional` throwOnConflict

• **throwOnConflict**? : *boolean*

*Inherited from [Config](_merge_src_index_.config).[throwOnConflict](_merge_src_index_.config.md#optional-throwonconflict)*

*Defined in [packages/merge/src/typedefs-mergers/merge-typedefs.ts:29](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L29)*

Throws an error on a merge conflict

Default: false

___

### `Optional` typeDefs

• **typeDefs**? : *string | DocumentNode[] | DocumentNode | string*

*Defined in [packages/merge/src/merge-schemas.ts:25](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/merge-schemas.ts#L25)*

Additional type definitions to also merge

___

### `Optional` useSchemaDefinition

• **useSchemaDefinition**? : *boolean*

*Inherited from [Config](_merge_src_index_.config).[useSchemaDefinition](_merge_src_index_.config.md#optional-useschemadefinition)*

*Defined in [packages/merge/src/typedefs-mergers/merge-typedefs.ts:16](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L16)*

Produces `schema { query: ..., mutation: ..., subscription: ... }`

Default: true
