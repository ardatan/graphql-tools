---
id: "_loaders_graphql_file_src_index_.graphqlfileloader"
title: "GraphQLFileLoader"
sidebar_label: "GraphQLFileLoader"
---

This loader loads documents and type definitions from `.graphql` files.

You can load a single source:

```js
const schema = await loadSchema('schema.graphql', {
  loaders: [
    new GraphQLFileLoader()
  ]
});
```

Or provide a glob pattern to load multiple sources:

```js
const schema = await loadSchema('graphql/*.graphql', {
  loaders: [
    new GraphQLFileLoader()
  ]
});
```

## Hierarchy

* **GraphQLFileLoader**

## Implements

* [Loader](../interfaces/_utils_src_index_.loader)‹[GraphQLFileLoaderOptions](../interfaces/_loaders_graphql_file_src_index_.graphqlfileloaderoptions)›

## Index

### Methods

* [canLoad](_loaders_graphql_file_src_index_.graphqlfileloader.md#canload)
* [canLoadSync](_loaders_graphql_file_src_index_.graphqlfileloader.md#canloadsync)
* [handleFileContent](_loaders_graphql_file_src_index_.graphqlfileloader.md#handlefilecontent)
* [load](_loaders_graphql_file_src_index_.graphqlfileloader.md#load)
* [loadSync](_loaders_graphql_file_src_index_.graphqlfileloader.md#loadsync)
* [loaderId](_loaders_graphql_file_src_index_.graphqlfileloader.md#loaderid)

## Methods

###  canLoad

▸ **canLoad**(`pointer`: [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle) | [DocumentPointerSingle](../modules/_utils_src_index_.md#documentpointersingle), `options`: [GraphQLFileLoaderOptions](../interfaces/_loaders_graphql_file_src_index_.graphqlfileloaderoptions)): *Promise‹boolean›*

*Defined in [packages/loaders/graphql-file/src/index.ts:60](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/graphql-file/src/index.ts#L60)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle) &#124; [DocumentPointerSingle](../modules/_utils_src_index_.md#documentpointersingle) |
`options` | [GraphQLFileLoaderOptions](../interfaces/_loaders_graphql_file_src_index_.graphqlfileloaderoptions) |

**Returns:** *Promise‹boolean›*

___

###  canLoadSync

▸ **canLoadSync**(`pointer`: [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle) | [DocumentPointerSingle](../modules/_utils_src_index_.md#documentpointersingle), `options`: [GraphQLFileLoaderOptions](../interfaces/_loaders_graphql_file_src_index_.graphqlfileloaderoptions)): *boolean*

*Defined in [packages/loaders/graphql-file/src/index.ts:74](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/graphql-file/src/index.ts#L74)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle) &#124; [DocumentPointerSingle](../modules/_utils_src_index_.md#documentpointersingle) |
`options` | [GraphQLFileLoaderOptions](../interfaces/_loaders_graphql_file_src_index_.graphqlfileloaderoptions) |

**Returns:** *boolean*

___

###  handleFileContent

▸ **handleFileContent**(`rawSDL`: string, `pointer`: string, `options`: [GraphQLFileLoaderOptions](../interfaces/_loaders_graphql_file_src_index_.graphqlfileloaderoptions)): *object | object*

*Defined in [packages/loaders/graphql-file/src/index.ts:99](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/graphql-file/src/index.ts#L99)*

**Parameters:**

Name | Type |
------ | ------ |
`rawSDL` | string |
`pointer` | string |
`options` | [GraphQLFileLoaderOptions](../interfaces/_loaders_graphql_file_src_index_.graphqlfileloaderoptions) |

**Returns:** *object | object*

___

###  load

▸ **load**(`pointer`: [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle) | [DocumentPointerSingle](../modules/_utils_src_index_.md#documentpointersingle), `options`: [GraphQLFileLoaderOptions](../interfaces/_loaders_graphql_file_src_index_.graphqlfileloaderoptions)): *Promise‹[Source](../interfaces/_utils_src_index_.source)›*

*Defined in [packages/loaders/graphql-file/src/index.ts:85](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/graphql-file/src/index.ts#L85)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle) &#124; [DocumentPointerSingle](../modules/_utils_src_index_.md#documentpointersingle) |
`options` | [GraphQLFileLoaderOptions](../interfaces/_loaders_graphql_file_src_index_.graphqlfileloaderoptions) |

**Returns:** *Promise‹[Source](../interfaces/_utils_src_index_.source)›*

___

###  loadSync

▸ **loadSync**(`pointer`: [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle) | [DocumentPointerSingle](../modules/_utils_src_index_.md#documentpointersingle), `options`: [GraphQLFileLoaderOptions](../interfaces/_loaders_graphql_file_src_index_.graphqlfileloaderoptions)): *[Source](../interfaces/_utils_src_index_.source)*

*Defined in [packages/loaders/graphql-file/src/index.ts:92](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/graphql-file/src/index.ts#L92)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle) &#124; [DocumentPointerSingle](../modules/_utils_src_index_.md#documentpointersingle) |
`options` | [GraphQLFileLoaderOptions](../interfaces/_loaders_graphql_file_src_index_.graphqlfileloaderoptions) |

**Returns:** *[Source](../interfaces/_utils_src_index_.source)*

___

###  loaderId

▸ **loaderId**(): *string*

*Implementation of [Loader](../interfaces/_utils_src_index_.loader)*

*Defined in [packages/loaders/graphql-file/src/index.ts:56](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/graphql-file/src/index.ts#L56)*

**Returns:** *string*
