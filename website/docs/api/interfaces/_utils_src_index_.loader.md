---
id: "_utils_src_index_.loader"
title: "Loader"
sidebar_label: "Loader"
---

## Type parameters

▪ **TPointer**

▪ **TOptions**: *[SingleFileOptions](../modules/_utils_src_index_.md#singlefileoptions)*

## Hierarchy

* **Loader**

## Implemented by

* [ApolloEngineLoader](/docs/api/classes/_loaders_apollo_engine_src_index_.apolloengineloader)
* [CodeFileLoader](/docs/api/classes/_loaders_code_file_src_index_.codefileloader)
* [GitLoader](/docs/api/classes/_loaders_git_src_index_.gitloader)
* [GithubLoader](/docs/api/classes/_loaders_github_src_index_.githubloader)
* [GraphQLFileLoader](/docs/api/classes/_loaders_graphql_file_src_index_.graphqlfileloader)
* [JsonFileLoader](/docs/api/classes/_loaders_json_file_src_index_.jsonfileloader)
* [ModuleLoader](/docs/api/classes/_loaders_module_src_index_.moduleloader)
* [PrismaLoader](/docs/api/classes/_loaders_prisma_src_index_.prismaloader)
* [UrlLoader](/docs/api/classes/_loaders_url_src_index_.urlloader)

## Index

### Methods

* [canLoad](_utils_src_index_.loader.md#canload)
* [canLoadSync](_utils_src_index_.loader.md#optional-canloadsync)
* [load](_utils_src_index_.loader.md#load)
* [loadSync](_utils_src_index_.loader.md#optional-loadsync)
* [loaderId](_utils_src_index_.loader.md#loaderid)

## Methods

###  canLoad

▸ **canLoad**(`pointer`: TPointer, `options?`: TOptions): *Promise‹boolean›*

*Defined in [packages/utils/src/loaders.ts:27](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/loaders.ts#L27)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | TPointer |
`options?` | TOptions |

**Returns:** *Promise‹boolean›*

___

### `Optional` canLoadSync

▸ **canLoadSync**(`pointer`: TPointer, `options?`: TOptions): *boolean*

*Defined in [packages/utils/src/loaders.ts:28](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/loaders.ts#L28)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | TPointer |
`options?` | TOptions |

**Returns:** *boolean*

___

###  load

▸ **load**(`pointer`: TPointer, `options?`: TOptions): *Promise‹[Source](_utils_src_index_.source) | never›*

*Defined in [packages/utils/src/loaders.ts:29](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/loaders.ts#L29)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | TPointer |
`options?` | TOptions |

**Returns:** *Promise‹[Source](_utils_src_index_.source) | never›*

___

### `Optional` loadSync

▸ **loadSync**(`pointer`: TPointer, `options?`: TOptions): *[Source](_utils_src_index_.source) | never*

*Defined in [packages/utils/src/loaders.ts:30](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/loaders.ts#L30)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | TPointer |
`options?` | TOptions |

**Returns:** *[Source](_utils_src_index_.source) | never*

___

###  loaderId

▸ **loaderId**(): *string*

*Defined in [packages/utils/src/loaders.ts:26](https://github.com/ardatan/graphql-tools/blob/master/packages/utils/src/loaders.ts#L26)*

**Returns:** *string*
