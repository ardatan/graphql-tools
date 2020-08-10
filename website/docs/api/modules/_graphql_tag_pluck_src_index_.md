---
id: "_graphql_tag_pluck_src_index_"
title: "graphql-tag-pluck/src/index"
sidebar_label: "graphql-tag-pluck/src/index"
---

## Index

### Interfaces

* [GraphQLTagPluckOptions](../interfaces/_graphql_tag_pluck_src_index_.graphqltagpluckoptions.md)

### Functions

* [gqlPluckFromCodeString](_graphql_tag_pluck_src_index_.md#const-gqlpluckfromcodestring)
* [gqlPluckFromCodeStringSync](_graphql_tag_pluck_src_index_.md#const-gqlpluckfromcodestringsync)

## Functions

### `Const` gqlPluckFromCodeString

▸ **gqlPluckFromCodeString**(`filePath`: string, `code`: string, `options`: [GraphQLTagPluckOptions](../interfaces/_graphql_tag_pluck_src_index_.graphqltagpluckoptions.md)): *Promise‹string›*

*Defined in [packages/graphql-tag-pluck/src/index.ts:121](https://github.com/ardatan/graphql-tools/blob/master/packages/graphql-tag-pluck/src/index.ts#L121)*

Asynchronously plucks GraphQL template literals from a single file.

Supported file extensions include: `.js`, `.jsx`, `.ts`, `.tsx`, `.flow`, `.flow.js`, `.flow.jsx`, `.vue`

**Parameters:**

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`filePath` | string | - | Path to the file containing the code. Required to detect the file type |
`code` | string | - | The contents of the file being parsed. |
`options` | [GraphQLTagPluckOptions](../interfaces/_graphql_tag_pluck_src_index_.graphqltagpluckoptions.md) | {} | Additional options for determining how a file is parsed.  |

**Returns:** *Promise‹string›*

___

### `Const` gqlPluckFromCodeStringSync

▸ **gqlPluckFromCodeStringSync**(`filePath`: string, `code`: string, `options`: [GraphQLTagPluckOptions](../interfaces/_graphql_tag_pluck_src_index_.graphqltagpluckoptions.md)): *string*

*Defined in [packages/graphql-tag-pluck/src/index.ts:146](https://github.com/ardatan/graphql-tools/blob/master/packages/graphql-tag-pluck/src/index.ts#L146)*

Synchronously plucks GraphQL template literals from a single file

Supported file extensions include: `.js`, `.jsx`, `.ts`, `.tsx`, `.flow`, `.flow.js`, `.flow.jsx`, `.vue`

**Parameters:**

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`filePath` | string | - | Path to the file containing the code. Required to detect the file type |
`code` | string | - | The contents of the file being parsed. |
`options` | [GraphQLTagPluckOptions](../interfaces/_graphql_tag_pluck_src_index_.graphqltagpluckoptions.md) | {} | Additional options for determining how a file is parsed.  |

**Returns:** *string*
