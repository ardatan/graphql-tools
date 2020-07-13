---
id: "_merge_src_index_.config"
title: "Config"
sidebar_label: "Config"
---

## Hierarchy

* **Config**

  ↳ [MergeSchemasConfig](_merge_src_index_.mergeschemasconfig)

## Index

### Properties

* [commentDescriptions](_merge_src_index_.config.md#optional-commentdescriptions)
* [convertExtensions](_merge_src_index_.config.md#optional-convertextensions)
* [exclusions](_merge_src_index_.config.md#optional-exclusions)
* [forceSchemaDefinition](_merge_src_index_.config.md#optional-forceschemadefinition)
* [reverseDirectives](_merge_src_index_.config.md#optional-reversedirectives)
* [sort](_merge_src_index_.config.md#optional-sort)
* [throwOnConflict](_merge_src_index_.config.md#optional-throwonconflict)
* [useSchemaDefinition](_merge_src_index_.config.md#optional-useschemadefinition)

## Properties

### `Optional` commentDescriptions

• **commentDescriptions**? : *boolean*

*Defined in [packages/merge/src/typedefs-mergers/merge-typedefs.ts:38](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L38)*

Descriptions are defined as preceding string literals, however an older
experimental version of the SDL supported preceding comments as
descriptions. Set to true to enable this deprecated behavior.
This option is provided to ease adoption and will be removed in v16.

Default: false

___

### `Optional` convertExtensions

• **convertExtensions**? : *boolean*

*Defined in [packages/merge/src/typedefs-mergers/merge-typedefs.ts:59](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L59)*

___

### `Optional` exclusions

• **exclusions**? : *string[]*

*Defined in [packages/merge/src/typedefs-mergers/merge-typedefs.ts:57](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L57)*

___

### `Optional` forceSchemaDefinition

• **forceSchemaDefinition**? : *boolean*

*Defined in [packages/merge/src/typedefs-mergers/merge-typedefs.ts:23](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L23)*

Creates schema definition, even when no types are available
Produces: `schema { query: Query }`

Default: false

___

### `Optional` reverseDirectives

• **reverseDirectives**? : *boolean*

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

### `Optional` sort

• **sort**? : *boolean | CompareFn‹string›*

*Defined in [packages/merge/src/typedefs-mergers/merge-typedefs.ts:58](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L58)*

___

### `Optional` throwOnConflict

• **throwOnConflict**? : *boolean*

*Defined in [packages/merge/src/typedefs-mergers/merge-typedefs.ts:29](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L29)*

Throws an error on a merge conflict

Default: false

___

### `Optional` useSchemaDefinition

• **useSchemaDefinition**? : *boolean*

*Defined in [packages/merge/src/typedefs-mergers/merge-typedefs.ts:16](https://github.com/ardatan/graphql-tools/blob/master/packages/merge/src/typedefs-mergers/merge-typedefs.ts#L16)*

Produces `schema { query: ..., mutation: ..., subscription: ... }`

Default: true
