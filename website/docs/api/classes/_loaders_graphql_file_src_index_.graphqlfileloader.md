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

* [Loader](../interfaces/_utils_src_index_.loader.md)‹[GraphQLFileLoaderOptions](../interfaces/_loaders_graphql_file_src_index_.graphqlfileloaderoptions.md)›

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

▸ **canLoad**(`pointer`: [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle) | [DocumentPointerSingle](../modules/_utils_src_index_.md#documentpointersingle), `options`: [GraphQLFileLoaderOptions](../interfaces/_loaders_graphql_file_src_index_.graphqlfileloaderoptions.md)): *Promise‹boolean›*

*Defined in [packages/loaders/graphql-file/src/index.ts:62](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/graphql-file/src/index.ts#L62)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle) &#124; [DocumentPointerSingle](../modules/_utils_src_index_.md#documentpointersingle) |
`options` | [GraphQLFileLoaderOptions](../interfaces/_loaders_graphql_file_src_index_.graphqlfileloaderoptions.md) |

**Returns:** *Promise‹boolean›*

___

###  canLoadSync

▸ **canLoadSync**(`pointer`: [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle) | [DocumentPointerSingle](../modules/_utils_src_index_.md#documentpointersingle), `options`: [GraphQLFileLoaderOptions](../interfaces/_loaders_graphql_file_src_index_.graphqlfileloaderoptions.md)): *boolean*

*Defined in [packages/loaders/graphql-file/src/index.ts:76](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/graphql-file/src/index.ts#L76)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle) &#124; [DocumentPointerSingle](../modules/_utils_src_index_.md#documentpointersingle) |
`options` | [GraphQLFileLoaderOptions](../interfaces/_loaders_graphql_file_src_index_.graphqlfileloaderoptions.md) |

**Returns:** *boolean*

___

###  handleFileContent

▸ **handleFileContent**(`rawSDL`: string, `pointer`: string, `options`: [GraphQLFileLoaderOptions](../interfaces/_loaders_graphql_file_src_index_.graphqlfileloaderoptions.md)): *object | object*

*Defined in [packages/loaders/graphql-file/src/index.ts:100](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/graphql-file/src/index.ts#L100)*

**Parameters:**

Name | Type |
------ | ------ |
`rawSDL` | string |
`pointer` | string |
`options` | [GraphQLFileLoaderOptions](../interfaces/_loaders_graphql_file_src_index_.graphqlfileloaderoptions.md) |

**Returns:** *object | object*

___

###  load

▸ **load**(`pointer`: [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle) | [DocumentPointerSingle](../modules/_utils_src_index_.md#documentpointersingle), `options`: [GraphQLFileLoaderOptions](../interfaces/_loaders_graphql_file_src_index_.graphqlfileloaderoptions.md)): *Promise‹[Source](../interfaces/_utils_src_index_.source.md)›*

*Defined in [packages/loaders/graphql-file/src/index.ts:87](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/graphql-file/src/index.ts#L87)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle) &#124; [DocumentPointerSingle](../modules/_utils_src_index_.md#documentpointersingle) |
`options` | [GraphQLFileLoaderOptions](../interfaces/_loaders_graphql_file_src_index_.graphqlfileloaderoptions.md) |

**Returns:** *Promise‹[Source](../interfaces/_utils_src_index_.source.md)›*

___

###  loadSync

▸ **loadSync**(`pointer`: [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle) | [DocumentPointerSingle](../modules/_utils_src_index_.md#documentpointersingle), `options`: [GraphQLFileLoaderOptions](../interfaces/_loaders_graphql_file_src_index_.graphqlfileloaderoptions.md)): *[Source](../interfaces/_utils_src_index_.source.md)*

*Defined in [packages/loaders/graphql-file/src/index.ts:94](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/graphql-file/src/index.ts#L94)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle) &#124; [DocumentPointerSingle](../modules/_utils_src_index_.md#documentpointersingle) |
`options` | [GraphQLFileLoaderOptions](../interfaces/_loaders_graphql_file_src_index_.graphqlfileloaderoptions.md) |

**Returns:** *[Source](../interfaces/_utils_src_index_.source.md)*

___

###  loaderId

▸ **loaderId**(): *string*

*Implementation of [Loader](../interfaces/_utils_src_index_.loader.md)*

*Defined in [packages/loaders/graphql-file/src/index.ts:58](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/graphql-file/src/index.ts#L58)*

**Returns:** *string*
