[graphql-tools-monorepo](../README) / [loaders/prisma/src](../modules/loaders_prisma_src) /
PrismaLoader

# Class: PrismaLoader

[loaders/prisma/src](../modules/loaders_prisma_src).PrismaLoader

This loader loads a schema from a `prisma.yml` file

## Hierarchy

- [`UrlLoader`](loaders_url_src.UrlLoader)

  ↳ **`PrismaLoader`**

## Table of contents

### Constructors

- [constructor](loaders_prisma_src.PrismaLoader#constructor)

### Methods

- [buildHTTPExecutor](loaders_prisma_src.PrismaLoader#buildhttpexecutor)
- [buildSubscriptionExecutor](loaders_prisma_src.PrismaLoader#buildsubscriptionexecutor)
- [buildWSExecutor](loaders_prisma_src.PrismaLoader#buildwsexecutor)
- [buildWSLegacyExecutor](loaders_prisma_src.PrismaLoader#buildwslegacyexecutor)
- [canLoad](loaders_prisma_src.PrismaLoader#canload)
- [canLoadSync](loaders_prisma_src.PrismaLoader#canloadsync)
- [getExecutor](loaders_prisma_src.PrismaLoader#getexecutor)
- [getExecutorAsync](loaders_prisma_src.PrismaLoader#getexecutorasync)
- [getExecutorSync](loaders_prisma_src.PrismaLoader#getexecutorsync)
- [getFetch](loaders_prisma_src.PrismaLoader#getfetch)
- [getWebSocketImpl](loaders_prisma_src.PrismaLoader#getwebsocketimpl)
- [handleSDL](loaders_prisma_src.PrismaLoader#handlesdl)
- [load](loaders_prisma_src.PrismaLoader#load)
- [loadSync](loaders_prisma_src.PrismaLoader#loadsync)

## Constructors

### constructor

• **new PrismaLoader**()

#### Inherited from

[UrlLoader](loaders_url_src.UrlLoader).[constructor](loaders_url_src.UrlLoader#constructor)

## Methods

### buildHTTPExecutor

▸ **buildHTTPExecutor**(`endpoint`, `fetchFn`, `options?`):
[`SyncExecutor`](../modules/utils_src#syncexecutor)\<`any`, `ExecutionExtensions`>

#### Parameters

| Name       | Type                                                                            |
| :--------- | :------------------------------------------------------------------------------ |
| `endpoint` | `string`                                                                        |
| `fetchFn`  | [`SyncFetchFn`](../modules/executors_http_src#syncfetchfn)                      |
| `options?` | [`LoadFromUrlOptions`](/docs/api/interfaces/loaders_url_src.LoadFromUrlOptions) |

#### Returns

[`SyncExecutor`](../modules/utils_src#syncexecutor)\<`any`, `ExecutionExtensions`>

#### Inherited from

[UrlLoader](loaders_url_src.UrlLoader).[buildHTTPExecutor](loaders_url_src.UrlLoader#buildhttpexecutor)

#### Defined in

[packages/loaders/url/src/index.ts:127](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L127)

▸ **buildHTTPExecutor**(`endpoint`, `fetchFn`, `options?`):
[`AsyncExecutor`](../modules/utils_src#asyncexecutor)\<`any`, `ExecutionExtensions`>

#### Parameters

| Name       | Type                                                                            |
| :--------- | :------------------------------------------------------------------------------ |
| `endpoint` | `string`                                                                        |
| `fetchFn`  | [`AsyncFetchFn`](../modules/executors_http_src#asyncfetchfn)                    |
| `options?` | [`LoadFromUrlOptions`](/docs/api/interfaces/loaders_url_src.LoadFromUrlOptions) |

#### Returns

[`AsyncExecutor`](../modules/utils_src#asyncexecutor)\<`any`, `ExecutionExtensions`>

#### Inherited from

[UrlLoader](loaders_url_src.UrlLoader).[buildHTTPExecutor](loaders_url_src.UrlLoader#buildhttpexecutor)

#### Defined in

[packages/loaders/url/src/index.ts:133](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L133)

---

### buildSubscriptionExecutor

▸ **buildSubscriptionExecutor**(`subscriptionsEndpoint`, `fetch`, `syncImport`, `options?`):
[`SyncExecutor`](../modules/utils_src#syncexecutor)

#### Parameters

| Name                    | Type                                                                            |
| :---------------------- | :------------------------------------------------------------------------------ |
| `subscriptionsEndpoint` | `string`                                                                        |
| `fetch`                 | [`SyncFetchFn`](../modules/executors_http_src#syncfetchfn)                      |
| `syncImport`            | [`SyncImportFn`](../modules/loaders_url_src#syncimportfn)                       |
| `options?`              | [`LoadFromUrlOptions`](/docs/api/interfaces/loaders_url_src.LoadFromUrlOptions) |

#### Returns

[`SyncExecutor`](../modules/utils_src#syncexecutor)

#### Inherited from

[UrlLoader](loaders_url_src.UrlLoader).[buildSubscriptionExecutor](loaders_url_src.UrlLoader#buildsubscriptionexecutor)

#### Defined in

[packages/loaders/url/src/index.ts:247](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L247)

▸ **buildSubscriptionExecutor**(`subscriptionsEndpoint`, `fetch`, `asyncImport`, `options?`):
[`AsyncExecutor`](../modules/utils_src#asyncexecutor)

#### Parameters

| Name                    | Type                                                                            |
| :---------------------- | :------------------------------------------------------------------------------ |
| `subscriptionsEndpoint` | `string`                                                                        |
| `fetch`                 | [`AsyncFetchFn`](../modules/executors_http_src#asyncfetchfn)                    |
| `asyncImport`           | [`AsyncImportFn`](../modules/loaders_url_src#asyncimportfn)                     |
| `options?`              | [`LoadFromUrlOptions`](/docs/api/interfaces/loaders_url_src.LoadFromUrlOptions) |

#### Returns

[`AsyncExecutor`](../modules/utils_src#asyncexecutor)

#### Inherited from

[UrlLoader](loaders_url_src.UrlLoader).[buildSubscriptionExecutor](loaders_url_src.UrlLoader#buildsubscriptionexecutor)

#### Defined in

[packages/loaders/url/src/index.ts:254](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L254)

---

### buildWSExecutor

▸ **buildWSExecutor**(`subscriptionsEndpoint`, `webSocketImpl`, `connectionParams?`):
[`Executor`](../modules/utils_src#executor)

#### Parameters

| Name                    | Type                                                                   |
| :---------------------- | :--------------------------------------------------------------------- |
| `subscriptionsEndpoint` | `string`                                                               |
| `webSocketImpl`         | typeof `WebSocket`                                                     |
| `connectionParams?`     | `Record`\<`string`, `unknown`> \| () => `Record`\<`string`, `unknown`> |

#### Returns

[`Executor`](../modules/utils_src#executor)

#### Inherited from

[UrlLoader](loaders_url_src.UrlLoader).[buildWSExecutor](loaders_url_src.UrlLoader#buildwsexecutor)

#### Defined in

[packages/loaders/url/src/index.ts:156](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L156)

---

### buildWSLegacyExecutor

▸ **buildWSLegacyExecutor**(`subscriptionsEndpoint`, `WebSocketImpl`, `options?`):
[`Executor`](../modules/utils_src#executor)

#### Parameters

| Name                    | Type                                                                            |
| :---------------------- | :------------------------------------------------------------------------------ |
| `subscriptionsEndpoint` | `string`                                                                        |
| `WebSocketImpl`         | typeof `WebSocket`                                                              |
| `options?`              | [`LoadFromUrlOptions`](/docs/api/interfaces/loaders_url_src.LoadFromUrlOptions) |

#### Returns

[`Executor`](../modules/utils_src#executor)

#### Inherited from

[UrlLoader](loaders_url_src.UrlLoader).[buildWSLegacyExecutor](loaders_url_src.UrlLoader#buildwslegacyexecutor)

#### Defined in

[packages/loaders/url/src/index.ts:172](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L172)

---

### canLoad

▸ **canLoad**(`prismaConfigFilePath`, `options`): `Promise`\<`boolean`>

#### Parameters

| Name                   | Type                                                                                 |
| :--------------------- | :----------------------------------------------------------------------------------- |
| `prismaConfigFilePath` | `string`                                                                             |
| `options`              | [`PrismaLoaderOptions`](/docs/api/interfaces/loaders_prisma_src.PrismaLoaderOptions) |

#### Returns

`Promise`\<`boolean`>

#### Defined in

[packages/loaders/prisma/src/index.ts:27](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/prisma/src/index.ts#L27)

---

### canLoadSync

▸ **canLoadSync**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/loaders/prisma/src/index.ts:23](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/prisma/src/index.ts#L23)

---

### getExecutor

▸ **getExecutor**(`endpoint`, `asyncImport`, `options?`):
[`AsyncExecutor`](../modules/utils_src#asyncexecutor)

#### Parameters

| Name          | Type                                                                                                   |
| :------------ | :----------------------------------------------------------------------------------------------------- |
| `endpoint`    | `string`                                                                                               |
| `asyncImport` | [`AsyncImportFn`](../modules/loaders_url_src#asyncimportfn)                                            |
| `options?`    | `Omit`\<[`LoadFromUrlOptions`](/docs/api/interfaces/loaders_url_src.LoadFromUrlOptions), `"endpoint"`> |

#### Returns

[`AsyncExecutor`](../modules/utils_src#asyncexecutor)

#### Inherited from

[UrlLoader](loaders_url_src.UrlLoader).[getExecutor](loaders_url_src.UrlLoader#getexecutor)

#### Defined in

[packages/loaders/url/src/index.ts:293](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L293)

▸ **getExecutor**(`endpoint`, `syncImport`, `options?`):
[`SyncExecutor`](../modules/utils_src#syncexecutor)

#### Parameters

| Name         | Type                                                                                                   |
| :----------- | :----------------------------------------------------------------------------------------------------- |
| `endpoint`   | `string`                                                                                               |
| `syncImport` | [`SyncImportFn`](../modules/loaders_url_src#syncimportfn)                                              |
| `options?`   | `Omit`\<[`LoadFromUrlOptions`](/docs/api/interfaces/loaders_url_src.LoadFromUrlOptions), `"endpoint"`> |

#### Returns

[`SyncExecutor`](../modules/utils_src#syncexecutor)

#### Inherited from

[UrlLoader](loaders_url_src.UrlLoader).[getExecutor](loaders_url_src.UrlLoader#getexecutor)

#### Defined in

[packages/loaders/url/src/index.ts:299](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L299)

---

### getExecutorAsync

▸ **getExecutorAsync**(`endpoint`, `options?`):
[`AsyncExecutor`](../modules/utils_src#asyncexecutor)

#### Parameters

| Name       | Type                                                                                                   |
| :--------- | :----------------------------------------------------------------------------------------------------- |
| `endpoint` | `string`                                                                                               |
| `options?` | `Omit`\<[`LoadFromUrlOptions`](/docs/api/interfaces/loaders_url_src.LoadFromUrlOptions), `"endpoint"`> |

#### Returns

[`AsyncExecutor`](../modules/utils_src#asyncexecutor)

#### Inherited from

[UrlLoader](loaders_url_src.UrlLoader).[getExecutorAsync](loaders_url_src.UrlLoader#getexecutorasync)

#### Defined in

[packages/loaders/url/src/index.ts:351](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L351)

---

### getExecutorSync

▸ **getExecutorSync**(`endpoint`, `options?`): [`SyncExecutor`](../modules/utils_src#syncexecutor)

#### Parameters

| Name       | Type                                                                                                   |
| :--------- | :----------------------------------------------------------------------------------------------------- |
| `endpoint` | `string`                                                                                               |
| `options?` | `Omit`\<[`LoadFromUrlOptions`](/docs/api/interfaces/loaders_url_src.LoadFromUrlOptions), `"endpoint"`> |

#### Returns

[`SyncExecutor`](../modules/utils_src#syncexecutor)

#### Inherited from

[UrlLoader](loaders_url_src.UrlLoader).[getExecutorSync](loaders_url_src.UrlLoader#getexecutorsync)

#### Defined in

[packages/loaders/url/src/index.ts:358](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L358)

---

### getFetch

▸ **getFetch**(`customFetch`, `importFn`):
[`AsyncFetchFn`](../modules/executors_http_src#asyncfetchfn) \|
`PromiseLike`\<[`AsyncFetchFn`](../modules/executors_http_src#asyncfetchfn)>

#### Parameters

| Name          | Type                                                                          |
| :------------ | :---------------------------------------------------------------------------- |
| `customFetch` | `undefined` \| `string` \| [`FetchFn`](../modules/executors_http_src#fetchfn) |
| `importFn`    | [`AsyncImportFn`](../modules/loaders_url_src#asyncimportfn)                   |

#### Returns

[`AsyncFetchFn`](../modules/executors_http_src#asyncfetchfn) \|
`PromiseLike`\<[`AsyncFetchFn`](../modules/executors_http_src#asyncfetchfn)>

#### Inherited from

[UrlLoader](loaders_url_src.UrlLoader).[getFetch](loaders_url_src.UrlLoader#getfetch)

#### Defined in

[packages/loaders/url/src/index.ts:185](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L185)

▸ **getFetch**(`customFetch`, `importFn`):
[`SyncFetchFn`](../modules/executors_http_src#syncfetchfn)

#### Parameters

| Name          | Type                                                                          |
| :------------ | :---------------------------------------------------------------------------- |
| `customFetch` | `undefined` \| `string` \| [`FetchFn`](../modules/executors_http_src#fetchfn) |
| `importFn`    | [`SyncImportFn`](../modules/loaders_url_src#syncimportfn)                     |

#### Returns

[`SyncFetchFn`](../modules/executors_http_src#syncfetchfn)

#### Inherited from

[UrlLoader](loaders_url_src.UrlLoader).[getFetch](loaders_url_src.UrlLoader#getfetch)

#### Defined in

[packages/loaders/url/src/index.ts:190](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L190)

---

### getWebSocketImpl

▸ **getWebSocketImpl**(`importFn`, `options?`): `PromiseLike`\<typeof `WebSocket`>

#### Parameters

| Name       | Type                                                                            |
| :--------- | :------------------------------------------------------------------------------ |
| `importFn` | [`AsyncImportFn`](../modules/loaders_url_src#asyncimportfn)                     |
| `options?` | [`LoadFromUrlOptions`](/docs/api/interfaces/loaders_url_src.LoadFromUrlOptions) |

#### Returns

`PromiseLike`\<typeof `WebSocket`>

#### Inherited from

[UrlLoader](loaders_url_src.UrlLoader).[getWebSocketImpl](loaders_url_src.UrlLoader#getwebsocketimpl)

#### Defined in

[packages/loaders/url/src/index.ts:223](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L223)

▸ **getWebSocketImpl**(`importFn`, `options?`): typeof `WebSocket`

#### Parameters

| Name       | Type                                                                            |
| :--------- | :------------------------------------------------------------------------------ |
| `importFn` | [`SyncImportFn`](../modules/loaders_url_src#syncimportfn)                       |
| `options?` | [`LoadFromUrlOptions`](/docs/api/interfaces/loaders_url_src.LoadFromUrlOptions) |

#### Returns

typeof `WebSocket`

#### Inherited from

[UrlLoader](loaders_url_src.UrlLoader).[getWebSocketImpl](loaders_url_src.UrlLoader#getwebsocketimpl)

#### Defined in

[packages/loaders/url/src/index.ts:228](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L228)

---

### handleSDL

▸ **handleSDL**(`pointer`, `fetch`, `options`): [`Source`](/docs/api/interfaces/utils_src.Source)

#### Parameters

| Name      | Type                                                                            |
| :-------- | :------------------------------------------------------------------------------ |
| `pointer` | `string`                                                                        |
| `fetch`   | [`SyncFetchFn`](../modules/executors_http_src#syncfetchfn)                      |
| `options` | [`LoadFromUrlOptions`](/docs/api/interfaces/loaders_url_src.LoadFromUrlOptions) |

#### Returns

[`Source`](/docs/api/interfaces/utils_src.Source)

#### Inherited from

[UrlLoader](loaders_url_src.UrlLoader).[handleSDL](loaders_url_src.UrlLoader#handlesdl)

#### Defined in

[packages/loaders/url/src/index.ts:362](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L362)

▸ **handleSDL**(`pointer`, `fetch`, `options`):
`Promise`\<[`Source`](/docs/api/interfaces/utils_src.Source)>

#### Parameters

| Name      | Type                                                                            |
| :-------- | :------------------------------------------------------------------------------ |
| `pointer` | `string`                                                                        |
| `fetch`   | [`AsyncFetchFn`](../modules/executors_http_src#asyncfetchfn)                    |
| `options` | [`LoadFromUrlOptions`](/docs/api/interfaces/loaders_url_src.LoadFromUrlOptions) |

#### Returns

`Promise`\<[`Source`](/docs/api/interfaces/utils_src.Source)>

#### Inherited from

[UrlLoader](loaders_url_src.UrlLoader).[handleSDL](loaders_url_src.UrlLoader#handlesdl)

#### Defined in

[packages/loaders/url/src/index.ts:363](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L363)

---

### load

▸ **load**(`prismaConfigFilePath`, `options`):
`Promise`\<[`Source`](/docs/api/interfaces/utils_src.Source)[]>

#### Parameters

| Name                   | Type                                                                                 |
| :--------------------- | :----------------------------------------------------------------------------------- |
| `prismaConfigFilePath` | `string`                                                                             |
| `options`              | [`PrismaLoaderOptions`](/docs/api/interfaces/loaders_prisma_src.PrismaLoaderOptions) |

#### Returns

`Promise`\<[`Source`](/docs/api/interfaces/utils_src.Source)[]>

#### Overrides

[UrlLoader](loaders_url_src.UrlLoader).[load](loaders_url_src.UrlLoader#load)

#### Defined in

[packages/loaders/prisma/src/index.ts:40](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/prisma/src/index.ts#L40)

---

### loadSync

▸ **loadSync**(`pointer`, `options`): [`Source`](/docs/api/interfaces/utils_src.Source)[]

#### Parameters

| Name      | Type                                                                            |
| :-------- | :------------------------------------------------------------------------------ |
| `pointer` | `string`                                                                        |
| `options` | [`LoadFromUrlOptions`](/docs/api/interfaces/loaders_url_src.LoadFromUrlOptions) |

#### Returns

[`Source`](/docs/api/interfaces/utils_src.Source)[]

#### Inherited from

[UrlLoader](loaders_url_src.UrlLoader).[loadSync](loaders_url_src.UrlLoader#loadsync)

#### Defined in

[packages/loaders/url/src/index.ts:426](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L426)
