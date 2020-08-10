---
id: "_loaders_url_src_index_.urlloader"
title: "UrlLoader"
sidebar_label: "UrlLoader"
---

This loader loads a schema from a URL. The loaded schema is a fully-executable,
remote schema since it's created using [@graphql-tools/wrap](/docs/remote-schemas).

```
const schema = await loadSchema('http://localhost:3000/graphql', {
  loaders: [
    new UrlLoader(),
  ]
});
```

## Hierarchy

* **UrlLoader**

  ↳ [PrismaLoader](_loaders_prisma_src_index_.prismaloader.md)

## Implements

* [Loader](../interfaces/_utils_src_index_.loader.md)‹[LoadFromUrlOptions](../interfaces/_loaders_url_src_index_.loadfromurloptions.md)›

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

*Defined in [packages/loaders/url/src/index.ts:136](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L136)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | string |
`webSocketImpl` | typeof w3cwebsocket |

**Returns:** *Subscriber*

___

###  canLoad

▸ **canLoad**(`pointer`: [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle), `options`: [LoadFromUrlOptions](../interfaces/_loaders_url_src_index_.loadfromurloptions.md)): *Promise‹boolean›*

*Defined in [packages/loaders/url/src/index.ts:71](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L71)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle) |
`options` | [LoadFromUrlOptions](../interfaces/_loaders_url_src_index_.loadfromurloptions.md) |

**Returns:** *Promise‹boolean›*

___

###  canLoadSync

▸ **canLoadSync**(`pointer`: [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle), `_options`: [LoadFromUrlOptions](../interfaces/_loaders_url_src_index_.loadfromurloptions.md)): *boolean*

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

*Defined in [packages/loaders/url/src/index.ts:216](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L216)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle) |
`options` | [LoadFromUrlOptions](../interfaces/_loaders_url_src_index_.loadfromurloptions.md) |

**Returns:** *Promise‹object›*

___

###  load

▸ **load**(`pointer`: [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle), `options`: [LoadFromUrlOptions](../interfaces/_loaders_url_src_index_.loadfromurloptions.md)): *Promise‹[Source](../interfaces/_utils_src_index_.source.md)›*

*Defined in [packages/loaders/url/src/index.ts:225](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L225)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle) |
`options` | [LoadFromUrlOptions](../interfaces/_loaders_url_src_index_.loadfromurloptions.md) |

**Returns:** *Promise‹[Source](../interfaces/_utils_src_index_.source.md)›*

___

###  loadSync

▸ **loadSync**(): *never*

*Defined in [packages/loaders/url/src/index.ts:236](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L236)*

**Returns:** *never*

___

###  loaderId

▸ **loaderId**(): *string*

*Implementation of [Loader](../interfaces/_utils_src_index_.loader.md)*

*Defined in [packages/loaders/url/src/index.ts:67](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L67)*

**Returns:** *string*
