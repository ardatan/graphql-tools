# @graphql-tools/executor-http

### Interfaces

- [HTTPExecutorOptions](/docs/api/interfaces/executors_http_src.HTTPExecutorOptions)

### Type Aliases

- [AsyncFetchFn](executors_http_src#asyncfetchfn)
- [AsyncImportFn](executors_http_src#asyncimportfn)
- [FetchFn](executors_http_src#fetchfn)
- [HeadersConfig](executors_http_src#headersconfig)
- [RegularFetchFn](executors_http_src#regularfetchfn)
- [SyncFetchFn](executors_http_src#syncfetchfn)
- [SyncImportFn](executors_http_src#syncimportfn)
- [SyncResponse](executors_http_src#syncresponse)

### Functions

- [buildHTTPExecutor](executors_http_src#buildhttpexecutor)
- [isLiveQueryOperationDefinitionNode](executors_http_src#islivequeryoperationdefinitionnode)

## Type Aliases

### AsyncFetchFn

Ƭ **AsyncFetchFn**: (`url`: `string`, `options?`: `RequestInit`, `context?`: `any`, `info?`:
`GraphQLResolveInfo`) => `Promise`\<`Response`> \| `Response`

#### Type declaration

▸ (`url`, `options?`, `context?`, `info?`): `Promise`\<`Response`> \| `Response`

##### Parameters

| Name       | Type                 |
| :--------- | :------------------- |
| `url`      | `string`             |
| `options?` | `RequestInit`        |
| `context?` | `any`                |
| `info?`    | `GraphQLResolveInfo` |

##### Returns

`Promise`\<`Response`> \| `Response`

#### Defined in

[packages/executors/http/src/index.ts:30](https://github.com/ardatan/graphql-tools/blob/master/packages/executors/http/src/index.ts#L30)

---

### AsyncImportFn

Ƭ **AsyncImportFn**: (`moduleName`: `string`) => `PromiseLike`\<`any`>

#### Type declaration

▸ (`moduleName`): `PromiseLike`\<`any`>

##### Parameters

| Name         | Type     |
| :----------- | :------- |
| `moduleName` | `string` |

##### Returns

`PromiseLike`\<`any`>

#### Defined in

[packages/executors/http/src/index.ts:41](https://github.com/ardatan/graphql-tools/blob/master/packages/executors/http/src/index.ts#L41)

---

### FetchFn

Ƭ **FetchFn**: [`AsyncFetchFn`](executors_http_src#asyncfetchfn) \|
[`SyncFetchFn`](executors_http_src#syncfetchfn) \|
[`RegularFetchFn`](executors_http_src#regularfetchfn)

#### Defined in

[packages/executors/http/src/index.ts:39](https://github.com/ardatan/graphql-tools/blob/master/packages/executors/http/src/index.ts#L39)

---

### HeadersConfig

Ƭ **HeadersConfig**: `Record`\<`string`, `string`>

#### Defined in

[packages/executors/http/src/index.ts:84](https://github.com/ardatan/graphql-tools/blob/master/packages/executors/http/src/index.ts#L84)

---

### RegularFetchFn

Ƭ **RegularFetchFn**: (`url`: `string`) => `Promise`\<`Response`> \| `Response`

#### Type declaration

▸ (`url`): `Promise`\<`Response`> \| `Response`

##### Parameters

| Name  | Type     |
| :---- | :------- |
| `url` | `string` |

##### Returns

`Promise`\<`Response`> \| `Response`

#### Defined in

[packages/executors/http/src/index.ts:37](https://github.com/ardatan/graphql-tools/blob/master/packages/executors/http/src/index.ts#L37)

---

### SyncFetchFn

Ƭ **SyncFetchFn**: (`url`: `string`, `init?`: `RequestInit`, `context?`: `any`, `info?`:
`GraphQLResolveInfo`) => [`SyncResponse`](executors_http_src#syncresponse)

#### Type declaration

▸ (`url`, `init?`, `context?`, `info?`): [`SyncResponse`](executors_http_src#syncresponse)

##### Parameters

| Name       | Type                 |
| :--------- | :------------------- |
| `url`      | `string`             |
| `init?`    | `RequestInit`        |
| `context?` | `any`                |
| `info?`    | `GraphQLResolveInfo` |

##### Returns

[`SyncResponse`](executors_http_src#syncresponse)

#### Defined in

[packages/executors/http/src/index.ts:19](https://github.com/ardatan/graphql-tools/blob/master/packages/executors/http/src/index.ts#L19)

---

### SyncImportFn

Ƭ **SyncImportFn**: (`moduleName`: `string`) => `any`

#### Type declaration

▸ (`moduleName`): `any`

##### Parameters

| Name         | Type     |
| :----------- | :------- |
| `moduleName` | `string` |

##### Returns

`any`

#### Defined in

[packages/executors/http/src/index.ts:42](https://github.com/ardatan/graphql-tools/blob/master/packages/executors/http/src/index.ts#L42)

---

### SyncResponse

Ƭ **SyncResponse**: `Omit`\<`Response`, `"json"` \| `"text"`> & \{ `json`: () => `any` ; `text`: ()
=> `string` }

#### Defined in

[packages/executors/http/src/index.ts:25](https://github.com/ardatan/graphql-tools/blob/master/packages/executors/http/src/index.ts#L25)

## Functions

### buildHTTPExecutor

▸ **buildHTTPExecutor**(`options?`): [`SyncExecutor`](utils_src#syncexecutor)\<`any`,
[`HTTPExecutorOptions`](/docs/api/interfaces/executors_http_src.HTTPExecutorOptions)>

#### Parameters

| Name       | Type                                                                                                                                                                     |
| :--------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `options?` | `Omit`\<[`HTTPExecutorOptions`](/docs/api/interfaces/executors_http_src.HTTPExecutorOptions), `"fetch"`> & \{ `fetch`: [`SyncFetchFn`](executors_http_src#syncfetchfn) } |

#### Returns

[`SyncExecutor`](utils_src#syncexecutor)\<`any`,
[`HTTPExecutorOptions`](/docs/api/interfaces/executors_http_src.HTTPExecutorOptions)>

#### Defined in

[packages/executors/http/src/index.ts:86](https://github.com/ardatan/graphql-tools/blob/master/packages/executors/http/src/index.ts#L86)

▸ **buildHTTPExecutor**(`options?`): [`AsyncExecutor`](utils_src#asyncexecutor)\<`any`,
[`HTTPExecutorOptions`](/docs/api/interfaces/executors_http_src.HTTPExecutorOptions)>

#### Parameters

| Name       | Type                                                                                                                                                                       |
| :--------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `options?` | `Omit`\<[`HTTPExecutorOptions`](/docs/api/interfaces/executors_http_src.HTTPExecutorOptions), `"fetch"`> & \{ `fetch`: [`AsyncFetchFn`](executors_http_src#asyncfetchfn) } |

#### Returns

[`AsyncExecutor`](utils_src#asyncexecutor)\<`any`,
[`HTTPExecutorOptions`](/docs/api/interfaces/executors_http_src.HTTPExecutorOptions)>

#### Defined in

[packages/executors/http/src/index.ts:90](https://github.com/ardatan/graphql-tools/blob/master/packages/executors/http/src/index.ts#L90)

▸ **buildHTTPExecutor**(`options?`): [`AsyncExecutor`](utils_src#asyncexecutor)\<`any`,
[`HTTPExecutorOptions`](/docs/api/interfaces/executors_http_src.HTTPExecutorOptions)>

#### Parameters

| Name       | Type                                                                                                                                                                           |
| :--------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `options?` | `Omit`\<[`HTTPExecutorOptions`](/docs/api/interfaces/executors_http_src.HTTPExecutorOptions), `"fetch"`> & \{ `fetch`: [`RegularFetchFn`](executors_http_src#regularfetchfn) } |

#### Returns

[`AsyncExecutor`](utils_src#asyncexecutor)\<`any`,
[`HTTPExecutorOptions`](/docs/api/interfaces/executors_http_src.HTTPExecutorOptions)>

#### Defined in

[packages/executors/http/src/index.ts:94](https://github.com/ardatan/graphql-tools/blob/master/packages/executors/http/src/index.ts#L94)

▸ **buildHTTPExecutor**(`options?`): [`AsyncExecutor`](utils_src#asyncexecutor)\<`any`,
[`HTTPExecutorOptions`](/docs/api/interfaces/executors_http_src.HTTPExecutorOptions)>

#### Parameters

| Name       | Type                                                                                                     |
| :--------- | :------------------------------------------------------------------------------------------------------- |
| `options?` | `Omit`\<[`HTTPExecutorOptions`](/docs/api/interfaces/executors_http_src.HTTPExecutorOptions), `"fetch"`> |

#### Returns

[`AsyncExecutor`](utils_src#asyncexecutor)\<`any`,
[`HTTPExecutorOptions`](/docs/api/interfaces/executors_http_src.HTTPExecutorOptions)>

#### Defined in

[packages/executors/http/src/index.ts:98](https://github.com/ardatan/graphql-tools/blob/master/packages/executors/http/src/index.ts#L98)

---

### isLiveQueryOperationDefinitionNode

▸ **isLiveQueryOperationDefinitionNode**(`node`): `undefined` \| `boolean`

#### Parameters

| Name   | Type                      |
| :----- | :------------------------ |
| `node` | `OperationDefinitionNode` |

#### Returns

`undefined` \| `boolean`

#### Defined in

[packages/executors/http/src/isLiveQueryOperationDefinitionNode.ts:5](https://github.com/ardatan/graphql-tools/blob/master/packages/executors/http/src/isLiveQueryOperationDefinitionNode.ts#L5)
