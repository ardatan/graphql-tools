---
id: "_loaders_code_file_src_index_.codefileloader"
title: "CodeFileLoader"
sidebar_label: "CodeFileLoader"
---

This loader loads GraphQL documents and type definitions from code files
using `graphql-tag-pluck`.

```js
const documents = await loadDocuments('queries/*.js', {
  loaders: [
    new CodeFileLoader()
  ]
});
```

Supported extensions include: `.ts`, `.tsx`, `.js`, `.jsx`, `.vue`

## Hierarchy

* **CodeFileLoader**

## Implements

* [Loader](/docs/api/interfaces/_utils_src_index_.loader)‹[CodeFileLoaderOptions](../modules/_loaders_code_file_src_index_.md#codefileloaderoptions)›

## Index

### Methods

* [canLoad](_loaders_code_file_src_index_.codefileloader.md#canload)
* [canLoadSync](_loaders_code_file_src_index_.codefileloader.md#canloadsync)
* [load](_loaders_code_file_src_index_.codefileloader.md#load)
* [loadSync](_loaders_code_file_src_index_.codefileloader.md#loadsync)
* [loaderId](_loaders_code_file_src_index_.codefileloader.md#loaderid)

## Methods

###  canLoad

▸ **canLoad**(`pointer`: [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle) | [DocumentPointerSingle](../modules/_utils_src_index_.md#documentpointersingle), `options`: [CodeFileLoaderOptions](../modules/_loaders_code_file_src_index_.md#codefileloaderoptions)): *Promise‹boolean›*

*Defined in [packages/loaders/code-file/src/index.ts:55](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/code-file/src/index.ts#L55)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle) &#124; [DocumentPointerSingle](../modules/_utils_src_index_.md#documentpointersingle) |
`options` | [CodeFileLoaderOptions](../modules/_loaders_code_file_src_index_.md#codefileloaderoptions) |

**Returns:** *Promise‹boolean›*

___

###  canLoadSync

▸ **canLoadSync**(`pointer`: [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle) | [DocumentPointerSingle](../modules/_utils_src_index_.md#documentpointersingle), `options`: [CodeFileLoaderOptions](../modules/_loaders_code_file_src_index_.md#codefileloaderoptions)): *boolean*

*Defined in [packages/loaders/code-file/src/index.ts:69](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/code-file/src/index.ts#L69)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle) &#124; [DocumentPointerSingle](../modules/_utils_src_index_.md#documentpointersingle) |
`options` | [CodeFileLoaderOptions](../modules/_loaders_code_file_src_index_.md#codefileloaderoptions) |

**Returns:** *boolean*

___

###  load

▸ **load**(`pointer`: [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle) | [DocumentPointerSingle](../modules/_utils_src_index_.md#documentpointersingle), `options`: [CodeFileLoaderOptions](../modules/_loaders_code_file_src_index_.md#codefileloaderoptions)): *Promise‹[Source](/docs/api/interfaces/_utils_src_index_.source)›*

*Defined in [packages/loaders/code-file/src/index.ts:80](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/code-file/src/index.ts#L80)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle) &#124; [DocumentPointerSingle](../modules/_utils_src_index_.md#documentpointersingle) |
`options` | [CodeFileLoaderOptions](../modules/_loaders_code_file_src_index_.md#codefileloaderoptions) |

**Returns:** *Promise‹[Source](/docs/api/interfaces/_utils_src_index_.source)›*

___

###  loadSync

▸ **loadSync**(`pointer`: [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle) | [DocumentPointerSingle](../modules/_utils_src_index_.md#documentpointersingle), `options`: [CodeFileLoaderOptions](../modules/_loaders_code_file_src_index_.md#codefileloaderoptions)): *[Source](/docs/api/interfaces/_utils_src_index_.source)*

*Defined in [packages/loaders/code-file/src/index.ts:123](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/code-file/src/index.ts#L123)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle) &#124; [DocumentPointerSingle](../modules/_utils_src_index_.md#documentpointersingle) |
`options` | [CodeFileLoaderOptions](../modules/_loaders_code_file_src_index_.md#codefileloaderoptions) |

**Returns:** *[Source](/docs/api/interfaces/_utils_src_index_.source)*

___

###  loaderId

▸ **loaderId**(): *string*

*Implementation of [Loader](/docs/api/interfaces/_utils_src_index_.loader)*

*Defined in [packages/loaders/code-file/src/index.ts:51](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/code-file/src/index.ts#L51)*

**Returns:** *string*
