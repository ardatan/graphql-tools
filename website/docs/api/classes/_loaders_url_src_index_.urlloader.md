---
id: "_loaders_url_src_index_.urlloader"
title: "UrlLoader"
sidebar_label: "UrlLoader"
---

This loader loads a schema from a URL. The loaded schema is a fully-executable,
remote schema since it's created using [@graphql-tools/wrap](remote-schemas).

```
const schema = await loadSchema('http://localhost:3000/graphql', {
  loaders: [
    new UrlLoader(),
  ]
});
```

## Hierarchy

* **UrlLoader**

  ↳ [PrismaLoader](_loaders_prisma_src_index_.prismaloader)

## Implements

* [Loader](../interfaces/_utils_src_index_.loader)‹[LoadFromUrlOptions](../interfaces/_loaders_url_src_index_.loadfromurloptions)›

## Index

### Methods

* [buildAsyncExecutor](_loaders_url_src_index_.urlloader.md#buildasyncexecutor)
* [buildSubscriber](_loaders_url_src_index_.urlloader.md#buildsubscriber)
* [canLoad](_loaders_url_src_index_.urlloader.md#canload)
* [canLoadSync](_loaders_url_src_index_.urlloader.md#canloadsync)
* [getExecutorAndSubscriber](_loaders_url_src_index_.urlloader.md#getexecutorandsubscriber)
* [getSubschemaConfig](_loaders_url_src_index_.urlloader.md#getsubschemaconfig)
* [load](_loaders_url_src_index_.urlloader.md#load)
* [loadSync](_loaders_url_src_index_.urlloader.md#loadsync)
* [loaderId](_loaders_url_src_index_.urlloader.md#loaderid)

## Methods

###  buildAsyncExecutor

▸ **buildAsyncExecutor**(`__namedParameters`: object): *AsyncExecutor*

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

*Defined in [packages/loaders/url/src/index.ts:117](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L117)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | string |
`webSocketImpl` | typeof w3cwebsocket |

**Returns:** *Subscriber*

___

###  canLoad

▸ **canLoad**(`pointer`: [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle), `options`: [LoadFromUrlOptions](../interfaces/_loaders_url_src_index_.loadfromurloptions)): *Promise‹boolean›*

*Defined in [packages/loaders/url/src/index.ts:70](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L70)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle) |
`options` | [LoadFromUrlOptions](../interfaces/_loaders_url_src_index_.loadfromurloptions) |

**Returns:** *Promise‹boolean›*

___

###  canLoadSync

▸ **canLoadSync**(`pointer`: [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle), `_options`: [LoadFromUrlOptions](../interfaces/_loaders_url_src_index_.loadfromurloptions)): *boolean*

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

*Defined in [packages/loaders/url/src/index.ts:197](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L197)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle) |
`options` | [LoadFromUrlOptions](../interfaces/_loaders_url_src_index_.loadfromurloptions) |

**Returns:** *Promise‹object›*

___

###  load

▸ **load**(`pointer`: [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle), `options`: [LoadFromUrlOptions](../interfaces/_loaders_url_src_index_.loadfromurloptions)): *Promise‹[Source](../interfaces/_utils_src_index_.source)›*

*Defined in [packages/loaders/url/src/index.ts:206](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L206)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle) |
`options` | [LoadFromUrlOptions](../interfaces/_loaders_url_src_index_.loadfromurloptions) |

**Returns:** *Promise‹[Source](../interfaces/_utils_src_index_.source)›*

___

###  loadSync

▸ **loadSync**(): *never*

*Defined in [packages/loaders/url/src/index.ts:217](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L217)*

**Returns:** *never*

___

###  loaderId

▸ **loaderId**(): *string*

*Implementation of [Loader](../interfaces/_utils_src_index_.loader)*

*Defined in [packages/loaders/url/src/index.ts:66](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L66)*

**Returns:** *string*
