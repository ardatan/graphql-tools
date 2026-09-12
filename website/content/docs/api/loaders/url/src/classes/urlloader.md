---
title: "UrlLoader"
description: "The UrlLoader class exported by @graphql-tools/url-loader."
---

Defined in: [packages/loaders/url/src/index.ts:130](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L130)

This loader loads a schema from a URL. The loaded schema is a fully-executable,
remote schema since it's created using [@graphql-tools/wrap](/docs/remote-schemas).

```
const schema = await loadSchema('http://localhost:3000/graphql', {
  loaders: [
    new UrlLoader(),
  ]
});
```

## Implements

- [`Loader`](/docs/api/utils/src/interfaces/loader)\<[`LoadFromUrlOptions`](/docs/api/loaders/url/src/interfaces/loadfromurloptions)\>

## Constructors

### Constructor

> **new UrlLoader**(): `UrlLoader`

#### Returns

`UrlLoader`

## Methods

### buildHTTPExecutor()

#### Call Signature

> **buildHTTPExecutor**(`endpoint`, `fetchFn`, `options?`): [`SyncExecutor`](/docs/api/utils/src/type-aliases/syncexecutor)\<`any`, `ExecutionExtensions`\>

Defined in: [packages/loaders/url/src/index.ts:131](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L131)

##### Parameters

###### endpoint

`string`

###### fetchFn

`SyncFetchFn`

###### options?

[`LoadFromUrlOptions`](/docs/api/loaders/url/src/interfaces/loadfromurloptions)

##### Returns

[`SyncExecutor`](/docs/api/utils/src/type-aliases/syncexecutor)\<`any`, `ExecutionExtensions`\>

#### Call Signature

> **buildHTTPExecutor**(`endpoint`, `fetchFn`, `options?`): [`AsyncExecutor`](/docs/api/utils/src/type-aliases/asyncexecutor)\<`any`, `ExecutionExtensions`\>

Defined in: [packages/loaders/url/src/index.ts:137](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L137)

##### Parameters

###### endpoint

`string`

###### fetchFn

`AsyncFetchFn`

###### options?

[`LoadFromUrlOptions`](/docs/api/loaders/url/src/interfaces/loadfromurloptions)

##### Returns

[`AsyncExecutor`](/docs/api/utils/src/type-aliases/asyncexecutor)\<`any`, `ExecutionExtensions`\>

***

### buildSubscriptionExecutor()

#### Call Signature

> **buildSubscriptionExecutor**(`subscriptionsEndpoint`, `fetch`, `syncImport`, `options?`): [`SyncExecutor`](/docs/api/utils/src/type-aliases/syncexecutor)

Defined in: [packages/loaders/url/src/index.ts:252](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L252)

##### Parameters

###### subscriptionsEndpoint

`string`

###### fetch

`SyncFetchFn`

###### syncImport

[`SyncImportFn`](/docs/api/loaders/url/src/type-aliases/syncimportfn)

###### options?

[`LoadFromUrlOptions`](/docs/api/loaders/url/src/interfaces/loadfromurloptions)

##### Returns

[`SyncExecutor`](/docs/api/utils/src/type-aliases/syncexecutor)

#### Call Signature

> **buildSubscriptionExecutor**(`subscriptionsEndpoint`, `fetch`, `asyncImport`, `options?`): [`AsyncExecutor`](/docs/api/utils/src/type-aliases/asyncexecutor)

Defined in: [packages/loaders/url/src/index.ts:259](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L259)

##### Parameters

###### subscriptionsEndpoint

`string`

###### fetch

`AsyncFetchFn`

###### asyncImport

[`AsyncImportFn`](/docs/api/loaders/url/src/type-aliases/asyncimportfn)

###### options?

[`LoadFromUrlOptions`](/docs/api/loaders/url/src/interfaces/loadfromurloptions)

##### Returns

[`AsyncExecutor`](/docs/api/utils/src/type-aliases/asyncexecutor)

***

### buildWSExecutor()

> **buildWSExecutor**(`subscriptionsEndpoint`, `webSocketImpl`, `connectionParams?`): [`Executor`](/docs/api/utils/src/type-aliases/executor)

Defined in: [packages/loaders/url/src/index.ts:160](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L160)

#### Parameters

##### subscriptionsEndpoint

`string`

##### webSocketImpl

*typeof* `WebSocket`

##### connectionParams?

`Record`\<`string`, `unknown`\> \| (() => `Record`\<`string`, `unknown`\>)

#### Returns

[`Executor`](/docs/api/utils/src/type-aliases/executor)

***

### buildWSLegacyExecutor()

> **buildWSLegacyExecutor**(`subscriptionsEndpoint`, `WebSocketImpl`, `options?`): [`Executor`](/docs/api/utils/src/type-aliases/executor)

Defined in: [packages/loaders/url/src/index.ts:177](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L177)

#### Parameters

##### subscriptionsEndpoint

`string`

##### WebSocketImpl

*typeof* `WebSocket`

##### options?

[`LoadFromUrlOptions`](/docs/api/loaders/url/src/interfaces/loadfromurloptions)

#### Returns

[`Executor`](/docs/api/utils/src/type-aliases/executor)

***

### getExecutor()

#### Call Signature

> **getExecutor**(`endpoint`, `asyncImport`, `options?`): [`AsyncExecutor`](/docs/api/utils/src/type-aliases/asyncexecutor)

Defined in: [packages/loaders/url/src/index.ts:304](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L304)

##### Parameters

###### endpoint

`string`

###### asyncImport

[`AsyncImportFn`](/docs/api/loaders/url/src/type-aliases/asyncimportfn)

###### options?

`Omit`\<[`LoadFromUrlOptions`](/docs/api/loaders/url/src/interfaces/loadfromurloptions), `"endpoint"`\>

##### Returns

[`AsyncExecutor`](/docs/api/utils/src/type-aliases/asyncexecutor)

#### Call Signature

> **getExecutor**(`endpoint`, `syncImport`, `options?`): [`SyncExecutor`](/docs/api/utils/src/type-aliases/syncexecutor)

Defined in: [packages/loaders/url/src/index.ts:310](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L310)

##### Parameters

###### endpoint

`string`

###### syncImport

[`SyncImportFn`](/docs/api/loaders/url/src/type-aliases/syncimportfn)

###### options?

`Omit`\<[`LoadFromUrlOptions`](/docs/api/loaders/url/src/interfaces/loadfromurloptions), `"endpoint"`\>

##### Returns

[`SyncExecutor`](/docs/api/utils/src/type-aliases/syncexecutor)

***

### getExecutorAsync()

> **getExecutorAsync**(`endpoint`, `options?`): [`AsyncExecutor`](/docs/api/utils/src/type-aliases/asyncexecutor)

Defined in: [packages/loaders/url/src/index.ts:370](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L370)

#### Parameters

##### endpoint

`string`

##### options?

`Omit`\<[`LoadFromUrlOptions`](/docs/api/loaders/url/src/interfaces/loadfromurloptions), `"endpoint"`\>

#### Returns

[`AsyncExecutor`](/docs/api/utils/src/type-aliases/asyncexecutor)

***

### getExecutorSync()

> **getExecutorSync**(`endpoint`, `options?`): [`SyncExecutor`](/docs/api/utils/src/type-aliases/syncexecutor)

Defined in: [packages/loaders/url/src/index.ts:377](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L377)

#### Parameters

##### endpoint

`string`

##### options?

`Omit`\<[`LoadFromUrlOptions`](/docs/api/loaders/url/src/interfaces/loadfromurloptions), `"endpoint"`\>

#### Returns

[`SyncExecutor`](/docs/api/utils/src/type-aliases/syncexecutor)

***

### getFetch()

#### Call Signature

> **getFetch**(`customFetch`, `importFn`): `AsyncFetchFn` \| `PromiseLike`\<`AsyncFetchFn`\>

Defined in: [packages/loaders/url/src/index.ts:190](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L190)

##### Parameters

###### customFetch

`string` \| [`FetchFn`](/docs/api/loaders/url/src/type-aliases/fetchfn) \| `undefined`

###### importFn

[`AsyncImportFn`](/docs/api/loaders/url/src/type-aliases/asyncimportfn)

##### Returns

`AsyncFetchFn` \| `PromiseLike`\<`AsyncFetchFn`\>

#### Call Signature

> **getFetch**(`customFetch`, `importFn`): `SyncFetchFn`

Defined in: [packages/loaders/url/src/index.ts:195](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L195)

##### Parameters

###### customFetch

`string` \| [`FetchFn`](/docs/api/loaders/url/src/type-aliases/fetchfn) \| `undefined`

###### importFn

[`SyncImportFn`](/docs/api/loaders/url/src/type-aliases/syncimportfn)

##### Returns

`SyncFetchFn`

***

### getWebSocketImpl()

#### Call Signature

> **getWebSocketImpl**(`importFn`, `options?`): `PromiseLike`\<*typeof* `WebSocket`\>

Defined in: [packages/loaders/url/src/index.ts:229](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L229)

##### Parameters

###### importFn

[`AsyncImportFn`](/docs/api/loaders/url/src/type-aliases/asyncimportfn)

###### options?

[`LoadFromUrlOptions`](/docs/api/loaders/url/src/interfaces/loadfromurloptions)

##### Returns

`PromiseLike`\<*typeof* `WebSocket`\>

#### Call Signature

> **getWebSocketImpl**(`importFn`, `options?`): *typeof* `WebSocket`

Defined in: [packages/loaders/url/src/index.ts:234](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L234)

##### Parameters

###### importFn

[`SyncImportFn`](/docs/api/loaders/url/src/type-aliases/syncimportfn)

###### options?

[`LoadFromUrlOptions`](/docs/api/loaders/url/src/interfaces/loadfromurloptions)

##### Returns

*typeof* `WebSocket`

***

### handleSDL()

#### Call Signature

> **handleSDL**(`pointer`, `fetch`, `options`): [`Source`](/docs/api/utils/src/interfaces/source)

Defined in: [packages/loaders/url/src/index.ts:381](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L381)

##### Parameters

###### pointer

`string`

###### fetch

`SyncFetchFn`

###### options

[`LoadFromUrlOptions`](/docs/api/loaders/url/src/interfaces/loadfromurloptions)

##### Returns

[`Source`](/docs/api/utils/src/interfaces/source)

#### Call Signature

> **handleSDL**(`pointer`, `fetch`, `options`): `Promise`\<[`Source`](/docs/api/utils/src/interfaces/source)\>

Defined in: [packages/loaders/url/src/index.ts:382](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L382)

##### Parameters

###### pointer

`string`

###### fetch

`AsyncFetchFn`

###### options

[`LoadFromUrlOptions`](/docs/api/loaders/url/src/interfaces/loadfromurloptions)

##### Returns

`Promise`\<[`Source`](/docs/api/utils/src/interfaces/source)\>

***

### load()

> **load**(`pointer`, `options`): `Promise`\<[`Source`](/docs/api/utils/src/interfaces/source)[]\>

Defined in: [packages/loaders/url/src/index.ts:399](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L399)

#### Parameters

##### pointer

`string`

##### options

[`LoadFromUrlOptions`](/docs/api/loaders/url/src/interfaces/loadfromurloptions)

#### Returns

`Promise`\<[`Source`](/docs/api/utils/src/interfaces/source)[]\>

#### Implementation of

[`Loader`](/docs/api/utils/src/interfaces/loader).[`load`](/docs/api/utils/src/interfaces/loader#load)

***

### loadSync()

> **loadSync**(`pointer`, `options`): [`Source`](/docs/api/utils/src/interfaces/source)[]

Defined in: [packages/loaders/url/src/index.ts:444](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L444)

#### Parameters

##### pointer

`string`

##### options

[`LoadFromUrlOptions`](/docs/api/loaders/url/src/interfaces/loadfromurloptions)

#### Returns

[`Source`](/docs/api/utils/src/interfaces/source)[]

#### Implementation of

[`Loader`](/docs/api/utils/src/interfaces/loader).[`loadSync`](/docs/api/utils/src/interfaces/loader#loadsync)
