[graphql-tools-monorepo](../README) / [loaders/url/src](../modules/loaders_url_src) / UrlLoader

# Class: UrlLoader

[loaders/url/src](../modules/loaders_url_src).UrlLoader

This loader loads a schema from a URL. The loaded schema is a fully-executable, remote schema since
it's created using [@graphql-tools/wrap](/docs/remote-schemas).

```
const schema = await loadSchema('http://localhost:3000/graphql', {
  loaders: [
    new UrlLoader(),
  ]
});
```

## Hierarchy

- **`UrlLoader`**

  ↳ [`PrismaLoader`](loaders_prisma_src.PrismaLoader)

## Implements

- [`Loader`](/docs/api/interfaces/utils_src.Loader)\<[`LoadFromUrlOptions`](/docs/api/interfaces/loaders_url_src.LoadFromUrlOptions)>

## Table of contents

### Constructors

- [constructor](loaders_url_src.UrlLoader#constructor)

### Methods

- [buildHTTPExecutor](loaders_url_src.UrlLoader#buildhttpexecutor)
- [buildSubscriptionExecutor](loaders_url_src.UrlLoader#buildsubscriptionexecutor)
- [buildWSExecutor](loaders_url_src.UrlLoader#buildwsexecutor)
- [buildWSLegacyExecutor](loaders_url_src.UrlLoader#buildwslegacyexecutor)
- [getExecutor](loaders_url_src.UrlLoader#getexecutor)
- [getExecutorAsync](loaders_url_src.UrlLoader#getexecutorasync)
- [getExecutorSync](loaders_url_src.UrlLoader#getexecutorsync)
- [getFetch](loaders_url_src.UrlLoader#getfetch)
- [getWebSocketImpl](loaders_url_src.UrlLoader#getwebsocketimpl)
- [handleSDL](loaders_url_src.UrlLoader#handlesdl)
- [load](loaders_url_src.UrlLoader#load)
- [loadSync](loaders_url_src.UrlLoader#loadsync)

## Constructors

### constructor

• **new UrlLoader**()

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

#### Defined in

[packages/loaders/url/src/index.ts:172](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L172)

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

#### Defined in

[packages/loaders/url/src/index.ts:363](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L363)

---

### load

▸ **load**(`pointer`, `options`): `Promise`\<[`Source`](/docs/api/interfaces/utils_src.Source)[]>

#### Parameters

| Name      | Type                                                                            |
| :-------- | :------------------------------------------------------------------------------ |
| `pointer` | `string`                                                                        |
| `options` | [`LoadFromUrlOptions`](/docs/api/interfaces/loaders_url_src.LoadFromUrlOptions) |

#### Returns

`Promise`\<[`Source`](/docs/api/interfaces/utils_src.Source)[]>

#### Implementation of

[Loader](/docs/api/interfaces/utils_src.Loader).[load](/docs/api/interfaces/utils_src.Loader#load)

#### Defined in

[packages/loaders/url/src/index.ts:381](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L381)

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

#### Implementation of

[Loader](/docs/api/interfaces/utils_src.Loader).[loadSync](/docs/api/interfaces/utils_src.Loader#loadsync)

#### Defined in

[packages/loaders/url/src/index.ts:426](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L426)
