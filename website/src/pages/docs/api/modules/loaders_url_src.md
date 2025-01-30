# @graphql-tools/url-loader

### References

- [FetchFn](loaders_url_src#fetchfn)

### Enumerations

- [SubscriptionProtocol](/docs/api/enums/loaders_url_src.SubscriptionProtocol)

### Classes

- [UrlLoader](/docs/api/classes/loaders_url_src.UrlLoader)

### Interfaces

- [LoadFromUrlOptions](/docs/api/interfaces/loaders_url_src.LoadFromUrlOptions)

### Type Aliases

- [AsyncImportFn](loaders_url_src#asyncimportfn)
- [SyncImportFn](loaders_url_src#syncimportfn)

## References

### FetchFn

Re-exports [FetchFn](executors_http_src#fetchfn)

## Type Aliases

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

[packages/loaders/url/src/index.ts:31](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L31)

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

[packages/loaders/url/src/index.ts:32](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/url/src/index.ts#L32)
