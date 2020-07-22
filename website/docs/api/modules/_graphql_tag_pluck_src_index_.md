---
id: "graphql-tag-pluck"
title: "@graphql-tools/graphql-tag-pluck"
sidebar_label: "graphql-tag-pluck"
---

### Interfaces

* [GraphQLTagPluckOptions](/docs/api/interfaces/_graphql_tag_pluck_src_index_.graphqltagpluckoptions)

### Functions

* [gqlPluckFromCodeString](_graphql_tag_pluck_src_index_.md#const-gqlpluckfromcodestring)
* [gqlPluckFromCodeStringSync](_graphql_tag_pluck_src_index_.md#const-gqlpluckfromcodestringsync)

## Functions

### `Const` gqlPluckFromCodeString

▸ **gqlPluckFromCodeString**(`filePath`: string, `code`: string, `options`: [GraphQLTagPluckOptions](/docs/api/interfaces/_graphql_tag_pluck_src_index_.graphqltagpluckoptions)): *Promise‹string›*

*Defined in [packages/graphql-tag-pluck/src/index.ts:121](https://github.com/ardatan/graphql-tools/blob/master/packages/graphql-tag-pluck/src/index.ts#L121)*

Asynchronously plucks GraphQL template literals from a single file.

Supported file extensions include: `.js`, `.jsx`, `.ts`, `.tsx`, `.flow`, `.flow.js`, `.flow.jsx`, `.vue`

**Parameters:**

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`filePath` | string | - | Path to the file containing the code. Required to detect the file type |
`code` | string | - | The contents of the file being parsed. |
`options` | [GraphQLTagPluckOptions](/docs/api/interfaces/_graphql_tag_pluck_src_index_.graphqltagpluckoptions) | {} | Additional options for determining how a file is parsed.  |

**Returns:** *Promise‹string›*

___

### `Const` gqlPluckFromCodeStringSync

▸ **gqlPluckFromCodeStringSync**(`filePath`: string, `code`: string, `options`: [GraphQLTagPluckOptions](/docs/api/interfaces/_graphql_tag_pluck_src_index_.graphqltagpluckoptions)): *string*

*Defined in [packages/graphql-tag-pluck/src/index.ts:146](https://github.com/ardatan/graphql-tools/blob/master/packages/graphql-tag-pluck/src/index.ts#L146)*

Synchronously plucks GraphQL template literals from a single file

Supported file extensions include: `.js`, `.jsx`, `.ts`, `.tsx`, `.flow`, `.flow.js`, `.flow.jsx`, `.vue`

**Parameters:**

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`filePath` | string | - | Path to the file containing the code. Required to detect the file type |
`code` | string | - | The contents of the file being parsed. |
`options` | [GraphQLTagPluckOptions](/docs/api/interfaces/_graphql_tag_pluck_src_index_.graphqltagpluckoptions) | {} | Additional options for determining how a file is parsed.  |

**Returns:** *string*
