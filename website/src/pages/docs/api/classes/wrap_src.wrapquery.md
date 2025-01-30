[graphql-tools-monorepo](../README) / [wrap/src](../modules/wrap_src) / WrapQuery

# Class: WrapQuery<TContext\>

[wrap/src](../modules/wrap_src).WrapQuery

## Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

## Implements

- [`Transform`](/docs/api/interfaces/delegate_src.Transform)\<`WrapQueryTransformationContext`,
  `TContext`>

## Table of contents

### Constructors

- [constructor](wrap_src.WrapQuery#constructor)

### Methods

- [transformRequest](wrap_src.WrapQuery#transformrequest)
- [transformResult](wrap_src.WrapQuery#transformresult)

## Constructors

### constructor

• **new WrapQuery**<`TContext`\>(`path`, `wrapper`, `extractor`)

#### Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

#### Parameters

| Name        | Type                       |
| :---------- | :------------------------- |
| `path`      | `string`[]                 |
| `wrapper`   | `QueryWrapper`             |
| `extractor` | (`result`: `any`) => `any` |

#### Defined in

[packages/wrap/src/transforms/WrapQuery.ts:16](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/WrapQuery.ts#L16)

## Methods

### transformRequest

▸ **transformRequest**(`originalRequest`, `_delegationContext`, `_transformationContext`):
[`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest)\<`any`, `any`, `any`,
`Record`\<`string`, `any`>, `any`>

#### Parameters

| Name                     | Type                                                                                                                           |
| :----------------------- | :----------------------------------------------------------------------------------------------------------------------------- |
| `originalRequest`        | [`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest)\<`any`, `any`, `any`, `Record`\<`string`, `any`>, `any`> |
| `_delegationContext`     | [`DelegationContext`](/docs/api/interfaces/delegate_src.DelegationContext)\<`TContext`>                                        |
| `_transformationContext` | `WrapQueryTransformationContext`                                                                                               |

#### Returns

[`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest)\<`any`, `any`, `any`,
`Record`\<`string`, `any`>, `any`>

#### Implementation of

Transform.transformRequest

#### Defined in

[packages/wrap/src/transforms/WrapQuery.ts:22](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/WrapQuery.ts#L22)

---

### transformResult

▸ **transformResult**(`originalResult`, `_delegationContext`, `_transformationContext`):
[`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult)\<`any`, `any`>

#### Parameters

| Name                     | Type                                                                                    |
| :----------------------- | :-------------------------------------------------------------------------------------- |
| `originalResult`         | [`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult)\<`any`, `any`>      |
| `_delegationContext`     | [`DelegationContext`](/docs/api/interfaces/delegate_src.DelegationContext)\<`TContext`> |
| `_transformationContext` | `WrapQueryTransformationContext`                                                        |

#### Returns

[`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult)\<`any`, `any`>

#### Implementation of

Transform.transformResult

#### Defined in

[packages/wrap/src/transforms/WrapQuery.ts:63](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/WrapQuery.ts#L63)
