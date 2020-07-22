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

* [Loader](/docs/api/interfaces/_utils_src_index_.loader)‹[LoadFromUrlOptions](/docs/api/interfaces/_loaders_url_src_index_.loadfromurloptions)›

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

*Defined in [packages/loaders/url/src/index.ts:134](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L134)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | string |
`webSocketImpl` | typeof w3cwebsocket |

**Returns:** *Subscriber*

___

###  canLoad

▸ **canLoad**(`pointer`: [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle), `options`: [LoadFromUrlOptions](/docs/api/interfaces/_loaders_url_src_index_.loadfromurloptions)): *Promise‹boolean›*

*Defined in [packages/loaders/url/src/index.ts:71](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L71)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle) |
`options` | [LoadFromUrlOptions](/docs/api/interfaces/_loaders_url_src_index_.loadfromurloptions) |

**Returns:** *Promise‹boolean›*

___

###  canLoadSync

▸ **canLoadSync**(`pointer`: [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle), `_options`: [LoadFromUrlOptions](/docs/api/interfaces/_loaders_url_src_index_.loadfromurloptions)): *boolean*

*Defined in [packages/loaders/url/src/index.ts:75](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L75)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle) |
`_options` | [LoadFromUrlOptions](/docs/api/interfaces/_loaders_url_src_index_.loadfromurloptions) |

**Returns:** *boolean*

___

###  getExecutorAndSubscriber

▸ **getExecutorAndSubscriber**(`pointer`: [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle), `options`: [LoadFromUrlOptions](/docs/api/interfaces/_loaders_url_src_index_.loadfromurloptions)): *Promise‹object›*

*Defined in [packages/loaders/url/src/index.ts:147](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L147)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle) |
`options` | [LoadFromUrlOptions](/docs/api/interfaces/_loaders_url_src_index_.loadfromurloptions) |

**Returns:** *Promise‹object›*

___

###  getSubschemaConfig

▸ **getSubschemaConfig**(`pointer`: [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle), `options`: [LoadFromUrlOptions](/docs/api/interfaces/_loaders_url_src_index_.loadfromurloptions)): *Promise‹object›*

*Defined in [packages/loaders/url/src/index.ts:214](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L214)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle) |
`options` | [LoadFromUrlOptions](/docs/api/interfaces/_loaders_url_src_index_.loadfromurloptions) |

**Returns:** *Promise‹object›*

___

###  load

▸ **load**(`pointer`: [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle), `options`: [LoadFromUrlOptions](/docs/api/interfaces/_loaders_url_src_index_.loadfromurloptions)): *Promise‹[Source](/docs/api/interfaces/_utils_src_index_.source)›*

*Defined in [packages/loaders/url/src/index.ts:223](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L223)*

**Parameters:**

Name | Type |
------ | ------ |
`pointer` | [SchemaPointerSingle](../modules/_utils_src_index_.md#schemapointersingle) |
`options` | [LoadFromUrlOptions](/docs/api/interfaces/_loaders_url_src_index_.loadfromurloptions) |

**Returns:** *Promise‹[Source](/docs/api/interfaces/_utils_src_index_.source)›*

___

###  loadSync

▸ **loadSync**(): *never*

*Defined in [packages/loaders/url/src/index.ts:234](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L234)*

**Returns:** *never*

___

###  loaderId

▸ **loaderId**(): *string*

*Implementation of [Loader](/docs/api/interfaces/_utils_src_index_.loader)*

*Defined in [packages/loaders/url/src/index.ts:67](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L67)*

**Returns:** *string*
