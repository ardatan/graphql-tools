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

* [Loader](../interfaces/_utils_src_index_.loader.md)

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

*Defined in [packages/loaders/git/src/index.ts:54](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/git/src/index.ts#L54)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | string |

**Returns:** *Promise‹boolean›*

___

###  canLoadSync

▸ **canLoadSync**(`pointer`: string): *boolean*

*Defined in [packages/loaders/git/src/index.ts:58](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/git/src/index.ts#L58)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | string |

**Returns:** *boolean*

___

###  load

▸ **load**(`pointer`: string, `options`: [GitLoaderOptions](../modules/_loaders_git_src_index_.md#gitloaderoptions)): *Promise‹[Source](../interfaces/_utils_src_index_.source.md)›*

*Defined in [packages/loaders/git/src/index.ts:62](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/git/src/index.ts#L62)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | string |
`options` | [GitLoaderOptions](../modules/_loaders_git_src_index_.md#gitloaderoptions) |

**Returns:** *Promise‹[Source](../interfaces/_utils_src_index_.source.md)›*

___

###  loadSync

▸ **loadSync**(`pointer`: string, `options`: [GitLoaderOptions](../modules/_loaders_git_src_index_.md#gitloaderoptions)): *[Source](../interfaces/_utils_src_index_.source.md)*

*Defined in [packages/loaders/git/src/index.ts:79](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/git/src/index.ts#L79)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | string |
`options` | [GitLoaderOptions](../modules/_loaders_git_src_index_.md#gitloaderoptions) |

**Returns:** *[Source](../interfaces/_utils_src_index_.source.md)*

___

###  loaderId

▸ **loaderId**(): *string*

*Implementation of [Loader](../interfaces/_utils_src_index_.loader.md)*

*Defined in [packages/loaders/git/src/index.ts:50](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/git/src/index.ts#L50)*

**Returns:** *string*
