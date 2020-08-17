---
id: "_loaders_prisma_src_index_.prismaloader"
title: "PrismaLoader"
sidebar_label: "PrismaLoader"
---

This loader loads a schema from a `prisma.yml` file

## Hierarchy

* [UrlLoader](_loaders_url_src_index_.urlloader.md)

  ↳ **PrismaLoader**

## Implements

* [Loader](../interfaces/_utils_src_index_.loader.md)‹[LoadFromUrlOptions](../interfaces/_loaders_url_src_index_.loadfromurloptions.md)›

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

*Inherited from [UrlLoader](_loaders_url_src_index_.urlloader.md).[buildAsyncExecutor](_loaders_url_src_index_.urlloader.md#buildasyncexecutor)*

*Defined in [packages/loaders/url/src/index.ts:79](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L79)*

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

*Inherited from [UrlLoader](_loaders_url_src_index_.urlloader.md).[buildSubscriber](_loaders_url_src_index_.urlloader.md#buildsubscriber)*

*Defined in [packages/loaders/url/src/index.ts:136](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L136)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | string |
`webSocketImpl` | typeof w3cwebsocket |

**Returns:** *Subscriber*

___

###  canLoad

▸ **canLoad**(`prismaConfigFilePath`: string, `options`: [PrismaLoaderOptions](../interfaces/_loaders_prisma_src_index_.prismaloaderoptions.md)): *Promise‹boolean›*

*Overrides [UrlLoader](_loaders_url_src_index_.urlloader.md).[canLoad](_loaders_url_src_index_.urlloader.md#canload)*

*Defined in [packages/loaders/prisma/src/index.ts:25](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/prisma/src/index.ts#L25)*

**Parameters:**

Name | Type |
------ | ------ |
`prismaConfigFilePath` | string |
`options` | [PrismaLoaderOptions](../interfaces/_loaders_prisma_src_index_.prismaloaderoptions.md) |

**Returns:** *Promise‹boolean›*

___

###  canLoadSync

▸ **canLoadSync**(`pointer`: [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle), `_options`: [LoadFromUrlOptions](../interfaces/_loaders_url_src_index_.loadfromurloptions.md)): *boolean*

*Inherited from [UrlLoader](_loaders_url_src_index_.urlloader.md).[canLoadSync](_loaders_url_src_index_.urlloader.md#canloadsync)*

*Defined in [packages/loaders/url/src/index.ts:75](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L75)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle) |
`_options` | [LoadFromUrlOptions](../interfaces/_loaders_url_src_index_.loadfromurloptions.md) |

**Returns:** *boolean*

___

###  getExecutorAndSubscriber

▸ **getExecutorAndSubscriber**(`pointer`: [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle), `options`: [LoadFromUrlOptions](../interfaces/_loaders_url_src_index_.loadfromurloptions.md)): *Promise‹object›*

*Inherited from [UrlLoader](_loaders_url_src_index_.urlloader.md).[getExecutorAndSubscriber](_loaders_url_src_index_.urlloader.md#getexecutorandsubscriber)*

*Defined in [packages/loaders/url/src/index.ts:149](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L149)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle) |
`options` | [LoadFromUrlOptions](../interfaces/_loaders_url_src_index_.loadfromurloptions.md) |

**Returns:** *Promise‹object›*

___

###  getSubschemaConfig

▸ **getSubschemaConfig**(`pointer`: [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle), `options`: [LoadFromUrlOptions](../interfaces/_loaders_url_src_index_.loadfromurloptions.md)): *Promise‹object›*

*Inherited from [UrlLoader](_loaders_url_src_index_.urlloader.md).[getSubschemaConfig](_loaders_url_src_index_.urlloader.md#getsubschemaconfig)*

*Defined in [packages/loaders/url/src/index.ts:216](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L216)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle) |
`options` | [LoadFromUrlOptions](../interfaces/_loaders_url_src_index_.loadfromurloptions.md) |

**Returns:** *Promise‹object›*

___

###  load

▸ **load**(`prismaConfigFilePath`: string, `options`: [PrismaLoaderOptions](../interfaces/_loaders_prisma_src_index_.prismaloaderoptions.md)): *Promise‹[Source](../interfaces/_utils_src_index_.source.md)›*

*Overrides [UrlLoader](_loaders_url_src_index_.urlloader.md).[load](_loaders_url_src_index_.urlloader.md#load)*

*Defined in [packages/loaders/prisma/src/index.ts:33](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/prisma/src/index.ts#L33)*

**Parameters:**

Name | Type |
------ | ------ |
`prismaConfigFilePath` | string |
`options` | [PrismaLoaderOptions](../interfaces/_loaders_prisma_src_index_.prismaloaderoptions.md) |

**Returns:** *Promise‹[Source](../interfaces/_utils_src_index_.source.md)›*

___

###  loadSync

▸ **loadSync**(): *never*

*Inherited from [UrlLoader](_loaders_url_src_index_.urlloader.md).[loadSync](_loaders_url_src_index_.urlloader.md#loadsync)*

*Defined in [packages/loaders/url/src/index.ts:236](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L236)*

**Returns:** *never*

___

###  loaderId

▸ **loaderId**(): *string*

*Implementation of [Loader](../interfaces/_utils_src_index_.loader.md)*

*Overrides [UrlLoader](_loaders_url_src_index_.urlloader.md).[loaderId](_loaders_url_src_index_.urlloader.md#loaderid)*

*Defined in [packages/loaders/prisma/src/index.ts:21](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/prisma/src/index.ts#L21)*

**Returns:** *string*
