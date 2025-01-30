[graphql-tools-monorepo](../README) /
[loaders/apollo-engine/src](../modules/loaders_apollo_engine_src) / ApolloEngineLoader

# Class: ApolloEngineLoader

[loaders/apollo-engine/src](../modules/loaders_apollo_engine_src).ApolloEngineLoader

This loader loads a schema from Apollo Engine

## Implements

- [`Loader`](/docs/api/interfaces/utils_src.Loader)\<[`ApolloEngineOptions`](/docs/api/interfaces/loaders_apollo_engine_src.ApolloEngineOptions)>

## Table of contents

### Constructors

- [constructor](loaders_apollo_engine_src.ApolloEngineLoader#constructor)

### Methods

- [canLoad](loaders_apollo_engine_src.ApolloEngineLoader#canload)
- [canLoadSync](loaders_apollo_engine_src.ApolloEngineLoader#canloadsync)
- [load](loaders_apollo_engine_src.ApolloEngineLoader#load)
- [loadSync](loaders_apollo_engine_src.ApolloEngineLoader#loadsync)

## Constructors

### constructor

• **new ApolloEngineLoader**()

## Methods

### canLoad

▸ **canLoad**(`ptr`): `Promise`\<`boolean`>

#### Parameters

| Name  | Type     |
| :---- | :------- |
| `ptr` | `string` |

#### Returns

`Promise`\<`boolean`>

#### Defined in

[packages/loaders/apollo-engine/src/index.ts:49](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/apollo-engine/src/index.ts#L49)

---

### canLoadSync

▸ **canLoadSync**(`ptr`): `boolean`

#### Parameters

| Name  | Type     |
| :---- | :------- |
| `ptr` | `string` |

#### Returns

`boolean`

#### Defined in

[packages/loaders/apollo-engine/src/index.ts:53](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/apollo-engine/src/index.ts#L53)

---

### load

▸ **load**(`pointer`, `options`): `Promise`\<[`Source`](/docs/api/interfaces/utils_src.Source)[]>

#### Parameters

| Name      | Type                                                                                        |
| :-------- | :------------------------------------------------------------------------------------------ |
| `pointer` | `string`                                                                                    |
| `options` | [`ApolloEngineOptions`](/docs/api/interfaces/loaders_apollo_engine_src.ApolloEngineOptions) |

#### Returns

`Promise`\<[`Source`](/docs/api/interfaces/utils_src.Source)[]>

#### Implementation of

[Loader](/docs/api/interfaces/utils_src.Loader).[load](/docs/api/interfaces/utils_src.Loader#load)

#### Defined in

[packages/loaders/apollo-engine/src/index.ts:57](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/apollo-engine/src/index.ts#L57)

---

### loadSync

▸ **loadSync**(`pointer`, `options`): [`Source`](/docs/api/interfaces/utils_src.Source)[]

#### Parameters

| Name      | Type                                                                                        |
| :-------- | :------------------------------------------------------------------------------------------ |
| `pointer` | `string`                                                                                    |
| `options` | [`ApolloEngineOptions`](/docs/api/interfaces/loaders_apollo_engine_src.ApolloEngineOptions) |

#### Returns

[`Source`](/docs/api/interfaces/utils_src.Source)[]

#### Implementation of

[Loader](/docs/api/interfaces/utils_src.Loader).[loadSync](/docs/api/interfaces/utils_src.Loader#loadsync)

#### Defined in

[packages/loaders/apollo-engine/src/index.ts:78](https://github.com/ardatan/graphql-tools/blob/master/packages/loaders/apollo-engine/src/index.ts#L78)
