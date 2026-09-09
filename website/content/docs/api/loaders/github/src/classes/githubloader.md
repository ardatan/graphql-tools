---
title: "GithubLoader"
description: "The GithubLoader class exported by @graphql-tools/github-loader."
---

Defined in: [packages/loaders/github/src/index.ts:69](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/github/src/index.ts#L69)

This loader loads a file from GitHub.

```js
const typeDefs = await loadTypedefs('github:githubUser/githubRepo#branchName:path/to/file.ts', {
  loaders: [new GithubLoader()],
  token: YOUR_GITHUB_TOKEN,
})
```

## Implements

- [`Loader`](/docs/api/utils/src/interfaces/loader)\<[`GithubLoaderOptions`](/docs/api/loaders/github/src/interfaces/githubloaderoptions)\>

## Constructors

### Constructor

> **new GithubLoader**(): `GithubLoader`

#### Returns

`GithubLoader`

## Methods

### canLoad()

> **canLoad**(`pointer`): `Promise`\<`boolean`\>

Defined in: [packages/loaders/github/src/index.ts:70](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/github/src/index.ts#L70)

#### Parameters

##### pointer

`string`

#### Returns

`Promise`\<`boolean`\>

***

### canLoadSync()

> **canLoadSync**(`pointer`): `boolean`

Defined in: [packages/loaders/github/src/index.ts:74](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/github/src/index.ts#L74)

#### Parameters

##### pointer

`string`

#### Returns

`boolean`

***

### handleResponse()

> **handleResponse**(`__namedParameters`): [`Source`](/docs/api/utils/src/interfaces/source)[] \| `object`[]

Defined in: [packages/loaders/github/src/index.ts:133](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/github/src/index.ts#L133)

#### Parameters

##### \_\_namedParameters

###### options

`any`

###### path

`string`

###### pointer

`string`

###### response

`any`

###### status

`number`

#### Returns

[`Source`](/docs/api/utils/src/interfaces/source)[] \| `object`[]

***

### load()

> **load**(`pointer`, `options`): `Promise`\<[`Source`](/docs/api/utils/src/interfaces/source)[]\>

Defined in: [packages/loaders/github/src/index.ts:123](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/github/src/index.ts#L123)

#### Parameters

##### pointer

`string`

##### options

[`GithubLoaderOptions`](/docs/api/loaders/github/src/interfaces/githubloaderoptions)

#### Returns

`Promise`\<[`Source`](/docs/api/utils/src/interfaces/source)[]\>

#### Implementation of

[`Loader`](/docs/api/utils/src/interfaces/loader).[`load`](/docs/api/utils/src/interfaces/loader#load)

***

### loadSync()

> **loadSync**(`pointer`, `options`): [`Source`](/docs/api/utils/src/interfaces/source)[]

Defined in: [packages/loaders/github/src/index.ts:128](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/github/src/index.ts#L128)

#### Parameters

##### pointer

`string`

##### options

[`GithubLoaderOptions`](/docs/api/loaders/github/src/interfaces/githubloaderoptions)

#### Returns

[`Source`](/docs/api/utils/src/interfaces/source)[]

#### Implementation of

[`Loader`](/docs/api/utils/src/interfaces/loader).[`loadSync`](/docs/api/utils/src/interfaces/loader#loadsync)

***

### loadSyncOrAsync()

#### Call Signature

> **loadSyncOrAsync**(`pointer`, `options`, `asyncFetchFn`): `Promise`\<[`Source`](/docs/api/utils/src/interfaces/source)[]\>

Defined in: [packages/loaders/github/src/index.ts:78](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/github/src/index.ts#L78)

##### Parameters

###### pointer

`string`

###### options

[`GithubLoaderOptions`](/docs/api/loaders/github/src/interfaces/githubloaderoptions)

###### asyncFetchFn

`AsyncFetchFn`

##### Returns

`Promise`\<[`Source`](/docs/api/utils/src/interfaces/source)[]\>

#### Call Signature

> **loadSyncOrAsync**(`pointer`, `options`, `syncFetchFn`): [`Source`](/docs/api/utils/src/interfaces/source)[]

Defined in: [packages/loaders/github/src/index.ts:84](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/github/src/index.ts#L84)

##### Parameters

###### pointer

`string`

###### options

[`GithubLoaderOptions`](/docs/api/loaders/github/src/interfaces/githubloaderoptions)

###### syncFetchFn

`SyncFetchFn`

##### Returns

[`Source`](/docs/api/utils/src/interfaces/source)[]

***

### prepareRequest()

> **prepareRequest**(`__namedParameters`): `RequestInit`

Defined in: [packages/loaders/github/src/index.ts:192](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/github/src/index.ts#L192)

#### Parameters

##### \_\_namedParameters

###### name

`string`

###### options

[`GithubLoaderOptions`](/docs/api/loaders/github/src/interfaces/githubloaderoptions)

###### owner

`string`

###### path

`string`

###### ref

`string`

#### Returns

`RequestInit`
