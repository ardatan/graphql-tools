[graphql-tools-monorepo](../README) / [wrap/src](../modules/wrap_src) / MapLeafValues

# Class: MapLeafValues<TContext\>

[wrap/src](../modules/wrap_src).MapLeafValues

## Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

## Implements

- [`Transform`](/docs/api/interfaces/delegate_src.Transform)\<`MapLeafValuesTransformationContext`,
  `TContext`>

## Table of contents

### Constructors

- [constructor](wrap_src.MapLeafValues#constructor)

### Methods

- [transformRequest](wrap_src.MapLeafValues#transformrequest)
- [transformResult](wrap_src.MapLeafValues#transformresult)
- [transformSchema](wrap_src.MapLeafValues#transformschema)

## Constructors

### constructor

• **new MapLeafValues**<`TContext`\>(`inputValueTransformer`, `outputValueTransformer`)

#### Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

#### Parameters

| Name                     | Type                                                               |
| :----------------------- | :----------------------------------------------------------------- |
| `inputValueTransformer`  | [`LeafValueTransformer`](../modules/wrap_src#leafvaluetransformer) |
| `outputValueTransformer` | [`LeafValueTransformer`](../modules/wrap_src#leafvaluetransformer) |

#### Defined in

[packages/wrap/src/transforms/MapLeafValues.ts:38](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/MapLeafValues.ts#L38)

## Methods

### transformRequest

▸ **transformRequest**(`originalRequest`, `delegationContext`, `transformationContext`):
[`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest)\<`any`, `any`, `any`,
`Record`\<`string`, `any`>, `any`>

#### Parameters

| Name                    | Type                                                                                                                           |
| :---------------------- | :----------------------------------------------------------------------------------------------------------------------------- |
| `originalRequest`       | [`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest)\<`any`, `any`, `any`, `Record`\<`string`, `any`>, `any`> |
| `delegationContext`     | [`DelegationContext`](/docs/api/interfaces/delegate_src.DelegationContext)\<`TContext`>                                        |
| `transformationContext` | `MapLeafValuesTransformationContext`                                                                                           |

#### Returns

[`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest)\<`any`, `any`, `any`,
`Record`\<`string`, `any`>, `any`>

#### Implementation of

Transform.transformRequest

#### Defined in

[packages/wrap/src/transforms/MapLeafValues.ts:68](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/MapLeafValues.ts#L68)

---

### transformResult

▸ **transformResult**(`originalResult`, `_delegationContext`, `transformationContext`):
[`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult)\<`any`, `any`>

#### Parameters

| Name                    | Type                                                                                    |
| :---------------------- | :-------------------------------------------------------------------------------------- |
| `originalResult`        | [`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult)\<`any`, `any`>      |
| `_delegationContext`    | [`DelegationContext`](/docs/api/interfaces/delegate_src.DelegationContext)\<`TContext`> |
| `transformationContext` | `MapLeafValuesTransformationContext`                                                    |

#### Returns

[`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult)\<`any`, `any`>

#### Implementation of

Transform.transformResult

#### Defined in

[packages/wrap/src/transforms/MapLeafValues.ts:103](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/MapLeafValues.ts#L103)

---

### transformSchema

▸ **transformSchema**(`originalWrappingSchema`, `_subschemaConfig`): `GraphQLSchema`

#### Parameters

| Name                     | Type                                                                                                     |
| :----------------------- | :------------------------------------------------------------------------------------------------------- |
| `originalWrappingSchema` | `GraphQLSchema`                                                                                          |
| `_subschemaConfig`       | [`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)\<`any`, `any`, `any`, `TContext`> |

#### Returns

`GraphQLSchema`

#### Implementation of

Transform.transformSchema

#### Defined in

[packages/wrap/src/transforms/MapLeafValues.ts:49](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/MapLeafValues.ts#L49)
