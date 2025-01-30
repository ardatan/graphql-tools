[graphql-tools-monorepo](../README) / [loaders/github/src](../modules/loaders_github_src) /
GithubLoader

# Class: GithubLoader

[loaders/github/src](../modules/loaders_github_src).GithubLoader

This loader loads a file from GitHub.

```js
const typeDefs = await loadTypedefs('github:githubUser/githubRepo#branchName:path/to/file.ts', {
  loaders: [new GithubLoader()],
  token: YOUR_GITHUB_TOKEN
})
```

## Implements

- [`Loader`](/docs/api/interfaces/utils_src.Loader)\<[`GithubLoaderOptions`](/docs/api/interfaces/loaders_github_src.GithubLoaderOptions)>

## Table of contents

### Constructors

- [constructor](loaders_github_src.GithubLoader#constructor)

### Methods

- [canLoad](loaders_github_src.GithubLoader#canload)
- [canLoadSync](loaders_github_src.GithubLoader#canloadsync)
- [handleResponse](loaders_github_src.GithubLoader#handleresponse)
- [load](loaders_github_src.GithubLoader#load)
- [loadSync](loaders_github_src.GithubLoader#loadsync)
- [loadSyncOrAsync](loaders_github_src.GithubLoader#loadsyncorasync)
- [prepareRequest](loaders_github_src.GithubLoader#preparerequest)

## Constructors

### constructor

• **new GithubLoader**()

## Methods

### canLoad

▸ **canLoad**(`pointer`): `Promise`\<`boolean`>

#### Parameters

| Name      | Type     |
| :-------- | :------- |
| `pointer` | `string` |

#### Returns

`Promise`\<`boolean`>

#### Defined in

[packages/loaders/github/src/index.ts:69](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/github/src/index.ts#L69)

---

### canLoadSync

▸ **canLoadSync**(`pointer`): `boolean`

#### Parameters

| Name      | Type     |
| :-------- | :------- |
| `pointer` | `string` |

#### Returns

`boolean`

#### Defined in

[packages/loaders/github/src/index.ts:73](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/github/src/index.ts#L73)

---

### handleResponse

▸ **handleResponse**(`«destructured»`): [`Source`](/docs/api/interfaces/utils_src.Source)[] \| \{
`document`: `DocumentNode` ; `location`: `undefined` \| `string` }[]

#### Parameters

| Name             | Type     |
| :--------------- | :------- |
| `«destructured»` | `Object` |
| › `options`      | `any`    |
| › `path`         | `string` |
| › `pointer`      | `string` |
| › `response`     | `any`    |
| › `status`       | `number` |

#### Returns

[`Source`](/docs/api/interfaces/utils_src.Source)[] \| \{ `document`: `DocumentNode` ; `location`:
`undefined` \| `string` }[]

#### Defined in

[packages/loaders/github/src/index.ts:129](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/github/src/index.ts#L129)

---

### load

▸ **load**(`pointer`, `options`): `Promise`\<[`Source`](/docs/api/interfaces/utils_src.Source)[]>

#### Parameters

| Name      | Type                                                                                 |
| :-------- | :----------------------------------------------------------------------------------- |
| `pointer` | `string`                                                                             |
| `options` | [`GithubLoaderOptions`](/docs/api/interfaces/loaders_github_src.GithubLoaderOptions) |

#### Returns

`Promise`\<[`Source`](/docs/api/interfaces/utils_src.Source)[]>

#### Implementation of

[Loader](/docs/api/interfaces/utils_src.Loader).[load](/docs/api/interfaces/utils_src.Loader#load)

#### Defined in

[packages/loaders/github/src/index.ts:119](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/github/src/index.ts#L119)

---

### loadSync

▸ **loadSync**(`pointer`, `options`): [`Source`](/docs/api/interfaces/utils_src.Source)[]

#### Parameters

| Name      | Type                                                                                 |
| :-------- | :----------------------------------------------------------------------------------- |
| `pointer` | `string`                                                                             |
| `options` | [`GithubLoaderOptions`](/docs/api/interfaces/loaders_github_src.GithubLoaderOptions) |

#### Returns

[`Source`](/docs/api/interfaces/utils_src.Source)[]

#### Implementation of

[Loader](/docs/api/interfaces/utils_src.Loader).[loadSync](/docs/api/interfaces/utils_src.Loader#loadsync)

#### Defined in

[packages/loaders/github/src/index.ts:124](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/github/src/index.ts#L124)

---

### loadSyncOrAsync

▸ **loadSyncOrAsync**(`pointer`, `options`, `asyncFetchFn`):
`Promise`\<[`Source`](/docs/api/interfaces/utils_src.Source)[]>

#### Parameters

| Name           | Type                                                                                 |
| :------------- | :----------------------------------------------------------------------------------- |
| `pointer`      | `string`                                                                             |
| `options`      | [`GithubLoaderOptions`](/docs/api/interfaces/loaders_github_src.GithubLoaderOptions) |
| `asyncFetchFn` | [`AsyncFetchFn`](../modules/executors_http_src#asyncfetchfn)                         |

#### Returns

`Promise`\<[`Source`](/docs/api/interfaces/utils_src.Source)[]>

#### Defined in

[packages/loaders/github/src/index.ts:77](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/github/src/index.ts#L77)

▸ **loadSyncOrAsync**(`pointer`, `options`, `syncFetchFn`):
[`Source`](/docs/api/interfaces/utils_src.Source)[]

#### Parameters

| Name          | Type                                                                                 |
| :------------ | :----------------------------------------------------------------------------------- |
| `pointer`     | `string`                                                                             |
| `options`     | [`GithubLoaderOptions`](/docs/api/interfaces/loaders_github_src.GithubLoaderOptions) |
| `syncFetchFn` | [`SyncFetchFn`](../modules/executors_http_src#syncfetchfn)                           |

#### Returns

[`Source`](/docs/api/interfaces/utils_src.Source)[]

#### Defined in

[packages/loaders/github/src/index.ts:83](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/github/src/index.ts#L83)

---

### prepareRequest

▸ **prepareRequest**(`«destructured»`): `RequestInit`

#### Parameters

| Name             | Type                                                                                 |
| :--------------- | :----------------------------------------------------------------------------------- |
| `«destructured»` | `Object`                                                                             |
| › `name`         | `string`                                                                             |
| › `options`      | [`GithubLoaderOptions`](/docs/api/interfaces/loaders_github_src.GithubLoaderOptions) |
| › `owner`        | `string`                                                                             |
| › `path`         | `string`                                                                             |
| › `ref`          | `string`                                                                             |

#### Returns

`RequestInit`

#### Defined in

[packages/loaders/github/src/index.ts:188](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/github/src/index.ts#L188)
