---
id: "_loaders_github_src_index_.githubloader"
title: "GithubLoader"
sidebar_label: "GithubLoader"
---

This loader loads a file from GitHub.

```js
const typeDefs = await loadTypedefs('github:githubUser/githubRepo#branchName:path/to/file.ts', {
  loaders: [new GithubLoader()],
  token: YOUR_GITHUB_TOKEN,
})
```

## Hierarchy

* **GithubLoader**

## Implements

* [Loader](/docs/api/interfaces/_utils_src_index_.loader)‹[GithubLoaderOptions](/docs/api/interfaces/_loaders_github_src_index_.githubloaderoptions)›

## Index

### Methods

* [canLoad](_loaders_github_src_index_.githubloader.md#canload)
* [canLoadSync](_loaders_github_src_index_.githubloader.md#canloadsync)
* [load](_loaders_github_src_index_.githubloader.md#load)
* [loadSync](_loaders_github_src_index_.githubloader.md#loadsync)
* [loaderId](_loaders_github_src_index_.githubloader.md#loaderid)

## Methods

###  canLoad

▸ **canLoad**(`pointer`: string): *Promise‹boolean›*

*Defined in [packages/loaders/github/src/index.ts:55](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/github/src/index.ts#L55)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | string |

**Returns:** *Promise‹boolean›*

___

###  canLoadSync

▸ **canLoadSync**(): *boolean*

*Defined in [packages/loaders/github/src/index.ts:59](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/github/src/index.ts#L59)*

**Returns:** *boolean*

___

###  load

▸ **load**(`pointer`: string, `options`: [GithubLoaderOptions](/docs/api/interfaces/_loaders_github_src_index_.githubloaderoptions)): *Promise‹[Source](/docs/api/interfaces/_utils_src_index_.source) | object›*

*Defined in [packages/loaders/github/src/index.ts:63](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/github/src/index.ts#L63)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | string |
`options` | [GithubLoaderOptions](/docs/api/interfaces/_loaders_github_src_index_.githubloaderoptions) |

**Returns:** *Promise‹[Source](/docs/api/interfaces/_utils_src_index_.source) | object›*

___

###  loadSync

▸ **loadSync**(): *never*

*Defined in [packages/loaders/github/src/index.ts:126](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/github/src/index.ts#L126)*

**Returns:** *never*

___

###  loaderId

▸ **loaderId**(): *string*

*Implementation of [Loader](/docs/api/interfaces/_utils_src_index_.loader)*

*Defined in [packages/loaders/github/src/index.ts:51](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/github/src/index.ts#L51)*

**Returns:** *string*
