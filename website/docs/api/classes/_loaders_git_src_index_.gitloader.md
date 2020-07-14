---
id: "_loaders_git_src_index_.gitloader"
title: "GitLoader"
sidebar_label: "GitLoader"
---

This loader loads a file from git.

```js
const typeDefs = await loadTypedefs('git:someBranch:some/path/to/file.js', {
  loaders: [new GitLoader()],
})
```

## Hierarchy

* **GitLoader**

## Implements

* [Loader](../interfaces/_utils_src_index_.loader)

## Index

### Methods

* [canLoad](_loaders_git_src_index_.gitloader.md#canload)
* [canLoadSync](_loaders_git_src_index_.gitloader.md#canloadsync)
* [load](_loaders_git_src_index_.gitloader.md#load)
* [loadSync](_loaders_git_src_index_.gitloader.md#loadsync)
* [loaderId](_loaders_git_src_index_.gitloader.md#loaderid)

## Methods

###  canLoad

▸ **canLoad**(`pointer`: string): *Promise‹boolean›*

*Defined in [packages/loaders/git/src/index.ts:56](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/git/src/index.ts#L56)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | string |

**Returns:** *Promise‹boolean›*

___

###  canLoadSync

▸ **canLoadSync**(`pointer`: string): *boolean*

*Defined in [packages/loaders/git/src/index.ts:60](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/git/src/index.ts#L60)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | string |

**Returns:** *boolean*

___

###  load

▸ **load**(`pointer`: string, `options`: [GitLoaderOptions](../modules/_loaders_git_src_index_.md#gitloaderoptions)): *Promise‹[Source](../interfaces/_utils_src_index_.source) | object›*

*Defined in [packages/loaders/git/src/index.ts:64](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/git/src/index.ts#L64)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | string |
`options` | [GitLoaderOptions](../modules/_loaders_git_src_index_.md#gitloaderoptions) |

**Returns:** *Promise‹[Source](../interfaces/_utils_src_index_.source) | object›*

___

###  loadSync

▸ **loadSync**(`pointer`: string, `options`: [GitLoaderOptions](../modules/_loaders_git_src_index_.md#gitloaderoptions)): *[Source](../interfaces/_utils_src_index_.source) | object*

*Defined in [packages/loaders/git/src/index.ts:78](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/git/src/index.ts#L78)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | string |
`options` | [GitLoaderOptions](../modules/_loaders_git_src_index_.md#gitloaderoptions) |

**Returns:** *[Source](../interfaces/_utils_src_index_.source) | object*

___

###  loaderId

▸ **loaderId**(): *string*

*Implementation of [Loader](../interfaces/_utils_src_index_.loader)*

*Defined in [packages/loaders/git/src/index.ts:52](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/git/src/index.ts#L52)*

**Returns:** *string*
