---
id: "_loaders_prisma_src_index_.prismaloader"
title: "PrismaLoader"
sidebar_label: "PrismaLoader"
---

This loader loads a schema from a `prisma.yml` file

## Hierarchy

* [UrlLoader](_loaders_url_src_index_.urlloader)

  ↳ **PrismaLoader**

## Implements

* [Loader](../interfaces/_utils_src_index_.loader)‹[LoadFromUrlOptions](../interfaces/_loaders_url_src_index_.loadfromurloptions)›

## Index

### Methods

* [buildAsyncExecutor](_loaders_prisma_src_index_.prismaloader.md#buildasyncexecutor)
* [buildSubscriber](_loaders_prisma_src_index_.prismaloader.md#buildsubscriber)
* [canLoad](_loaders_prisma_src_index_.prismaloader.md#canload)
* [canLoadSync](_loaders_prisma_src_index_.prismaloader.md#canloadsync)
* [getExecutorAndSubscriber](_loaders_prisma_src_index_.prismaloader.md#getexecutorandsubscriber)
* [getSubschemaConfig](_loaders_prisma_src_index_.prismaloader.md#getsubschemaconfig)
* [load](_loaders_prisma_src_index_.prismaloader.md#load)
* [loadSync](_loaders_prisma_src_index_.prismaloader.md#loadsync)
* [loaderId](_loaders_prisma_src_index_.prismaloader.md#loaderid)

## Methods

###  buildAsyncExecutor

▸ **buildAsyncExecutor**(`__namedParameters`: object): *AsyncExecutor*

*Inherited from [UrlLoader](_loaders_url_src_index_.urlloader).[buildAsyncExecutor](_loaders_url_src_index_.urlloader.md#buildasyncexecutor)*

*Defined in [packages/loaders/url/src/index.ts:78](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L78)*

**Parameters:**

▪ **__namedParameters**: *object*

Name | Type |
------ | ------ |
`defaultMethod` | "GET" &#124; "POST" |
`extraHeaders` | any |
`fetch` | fetch |
`pointer` | string |
`useGETForQueries` | boolean |

**Returns:** *AsyncExecutor*

___

###  buildSubscriber

▸ **buildSubscriber**(`pointer`: string, `webSocketImpl`: typeof w3cwebsocket): *Subscriber*

*Inherited from [UrlLoader](_loaders_url_src_index_.urlloader).[buildSubscriber](_loaders_url_src_index_.urlloader.md#buildsubscriber)*

*Defined in [packages/loaders/url/src/index.ts:117](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L117)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | string |
`webSocketImpl` | typeof w3cwebsocket |

**Returns:** *Subscriber*

___

###  canLoad

▸ **canLoad**(`prismaConfigFilePath`: string, `options`: [PrismaLoaderOptions](../interfaces/_loaders_prisma_src_index_.prismaloaderoptions)): *Promise‹boolean›*

*Overrides [UrlLoader](_loaders_url_src_index_.urlloader).[canLoad](_loaders_url_src_index_.urlloader.md#canload)*

*Defined in [packages/loaders/prisma/src/index.ts:25](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/prisma/src/index.ts#L25)*

**Parameters:**

Name | Type |
------ | ------ |
`prismaConfigFilePath` | string |
`options` | [PrismaLoaderOptions](../interfaces/_loaders_prisma_src_index_.prismaloaderoptions) |

**Returns:** *Promise‹boolean›*

___

###  canLoadSync

▸ **canLoadSync**(`pointer`: [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle), `_options`: [LoadFromUrlOptions](../interfaces/_loaders_url_src_index_.loadfromurloptions)): *boolean*

*Inherited from [UrlLoader](_loaders_url_src_index_.urlloader).[canLoadSync](_loaders_url_src_index_.urlloader.md#canloadsync)*

*Defined in [packages/loaders/url/src/index.ts:74](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L74)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle) |
`_options` | [LoadFromUrlOptions](../interfaces/_loaders_url_src_index_.loadfromurloptions) |

**Returns:** *boolean*

___

###  getExecutorAndSubscriber

▸ **getExecutorAndSubscriber**(`pointer`: [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle), `options`: [LoadFromUrlOptions](../interfaces/_loaders_url_src_index_.loadfromurloptions)): *Promise‹object›*

*Inherited from [UrlLoader](_loaders_url_src_index_.urlloader).[getExecutorAndSubscriber](_loaders_url_src_index_.urlloader.md#getexecutorandsubscriber)*

*Defined in [packages/loaders/url/src/index.ts:130](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L130)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle) |
`options` | [LoadFromUrlOptions](../interfaces/_loaders_url_src_index_.loadfromurloptions) |

**Returns:** *Promise‹object›*

___

###  getSubschemaConfig

▸ **getSubschemaConfig**(`pointer`: [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle), `options`: [LoadFromUrlOptions](../interfaces/_loaders_url_src_index_.loadfromurloptions)): *Promise‹object›*

*Inherited from [UrlLoader](_loaders_url_src_index_.urlloader).[getSubschemaConfig](_loaders_url_src_index_.urlloader.md#getsubschemaconfig)*

*Defined in [packages/loaders/url/src/index.ts:197](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L197)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle) |
`options` | [LoadFromUrlOptions](../interfaces/_loaders_url_src_index_.loadfromurloptions) |

**Returns:** *Promise‹object›*

___

###  load

▸ **load**(`prismaConfigFilePath`: string, `options`: [PrismaLoaderOptions](../interfaces/_loaders_prisma_src_index_.prismaloaderoptions)): *Promise‹[Source](../interfaces/_utils_src_index_.source)›*

*Overrides [UrlLoader](_loaders_url_src_index_.urlloader).[load](_loaders_url_src_index_.urlloader.md#load)*

*Defined in [packages/loaders/prisma/src/index.ts:33](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/prisma/src/index.ts#L33)*

**Parameters:**

Name | Type |
------ | ------ |
`prismaConfigFilePath` | string |
`options` | [PrismaLoaderOptions](../interfaces/_loaders_prisma_src_index_.prismaloaderoptions) |

**Returns:** *Promise‹[Source](../interfaces/_utils_src_index_.source)›*

___

###  loadSync

▸ **loadSync**(): *never*

*Inherited from [UrlLoader](_loaders_url_src_index_.urlloader).[loadSync](_loaders_url_src_index_.urlloader.md#loadsync)*

*Defined in [packages/loaders/url/src/index.ts:217](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L217)*

**Returns:** *never*

___

###  loaderId

▸ **loaderId**(): *string*

*Implementation of [Loader](../interfaces/_utils_src_index_.loader)*

*Overrides [UrlLoader](_loaders_url_src_index_.urlloader).[loaderId](_loaders_url_src_index_.urlloader.md#loaderid)*

*Defined in [packages/loaders/prisma/src/index.ts:21](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/prisma/src/index.ts#L21)*

**Returns:** *string*
