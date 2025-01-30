[graphql-tools-monorepo](../README) / [delegate/src](../modules/delegate_src) / BatchingOptions

# Interface: BatchingOptions<K, V, C\>

[delegate/src](../modules/delegate_src).BatchingOptions

## Type parameters

| Name | Type  |
| :--- | :---- |
| `K`  | `any` |
| `V`  | `any` |
| `C`  | `K`   |

## Table of contents

### Properties

- [dataLoaderOptions](delegate_src.BatchingOptions#dataloaderoptions)
- [extensionsReducer](delegate_src.BatchingOptions#extensionsreducer)

## Properties

### dataLoaderOptions

• `Optional` **dataLoaderOptions**: `Options`\<`K`, `V`, `C`>

#### Defined in

[packages/delegate/src/types.ts:150](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L150)

---

### extensionsReducer

• `Optional` **extensionsReducer**: (`mergedExtensions`: `Record`\<`string`, `any`>, `request`:
[`ExecutionRequest`](utils_src.ExecutionRequest)\<`any`, `any`, `any`, `Record`\<`string`, `any`>,
`any`>) => `Record`\<`string`, `any`>

#### Type declaration

▸ (`mergedExtensions`, `request`): `Record`\<`string`, `any`>

##### Parameters

| Name               | Type                                                                                                      |
| :----------------- | :-------------------------------------------------------------------------------------------------------- |
| `mergedExtensions` | `Record`\<`string`, `any`>                                                                                |
| `request`          | [`ExecutionRequest`](utils_src.ExecutionRequest)\<`any`, `any`, `any`, `Record`\<`string`, `any`>, `any`> |

##### Returns

`Record`\<`string`, `any`>

#### Defined in

[packages/delegate/src/types.ts:146](https://github.com/ardatan/graphql-tools/blob/master/packages/delegate/src/types.ts#L146)
