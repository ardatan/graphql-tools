[graphql-tools-monorepo](../README) / [wrap/src](../modules/wrap_src) / TransformEnumValues

# Class: TransformEnumValues<TContext\>

[wrap/src](../modules/wrap_src).TransformEnumValues

## Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

## Implements

- [`Transform`](/docs/api/interfaces/delegate_src.Transform)\<`TransformEnumValuesTransformationContext`,
  `TContext`>

## Table of contents

### Constructors

- [constructor](wrap_src.TransformEnumValues#constructor)

### Methods

- [transformRequest](wrap_src.TransformEnumValues#transformrequest)
- [transformResult](wrap_src.TransformEnumValues#transformresult)
- [transformSchema](wrap_src.TransformEnumValues#transformschema)

## Constructors

### constructor

• **new TransformEnumValues**<`TContext`\>(`enumValueTransformer`, `inputValueTransformer?`,
`outputValueTransformer?`)

#### Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

#### Parameters

| Name                      | Type                                                               |
| :------------------------ | :----------------------------------------------------------------- |
| `enumValueTransformer`    | [`EnumValueTransformer`](../modules/wrap_src#enumvaluetransformer) |
| `inputValueTransformer?`  | [`LeafValueTransformer`](../modules/wrap_src#leafvaluetransformer) |
| `outputValueTransformer?` | [`LeafValueTransformer`](../modules/wrap_src#leafvaluetransformer) |

#### Defined in

[packages/wrap/src/transforms/TransformEnumValues.ts:26](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformEnumValues.ts#L26)

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
| `transformationContext` | `TransformEnumValuesTransformationContext`                                                                                     |

#### Returns

[`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest)\<`any`, `any`, `any`,
`Record`\<`string`, `any`>, `any`>

#### Implementation of

Transform.transformRequest

#### Defined in

[packages/wrap/src/transforms/TransformEnumValues.ts:67](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformEnumValues.ts#L67)

---

### transformResult

▸ **transformResult**(`originalResult`, `delegationContext`, `transformationContext`):
[`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult)\<`any`, `any`>

#### Parameters

| Name                    | Type                                                                                    |
| :---------------------- | :-------------------------------------------------------------------------------------- |
| `originalResult`        | [`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult)\<`any`, `any`>      |
| `delegationContext`     | [`DelegationContext`](/docs/api/interfaces/delegate_src.DelegationContext)\<`TContext`> |
| `transformationContext` | `TransformEnumValuesTransformationContext`                                              |

#### Returns

[`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult)\<`any`, `any`>

#### Implementation of

Transform.transformResult

#### Defined in

[packages/wrap/src/transforms/TransformEnumValues.ts:82](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformEnumValues.ts#L82)

---

### transformSchema

▸ **transformSchema**(`originalWrappingSchema`, `subschemaConfig`): `GraphQLSchema`

#### Parameters

| Name                     | Type                                                                                                     |
| :----------------------- | :------------------------------------------------------------------------------------------------------- |
| `originalWrappingSchema` | `GraphQLSchema`                                                                                          |
| `subschemaConfig`        | [`SubschemaConfig`](/docs/api/interfaces/delegate_src.SubschemaConfig)\<`any`, `any`, `any`, `TContext`> |

#### Returns

`GraphQLSchema`

#### Implementation of

Transform.transformSchema

#### Defined in

[packages/wrap/src/transforms/TransformEnumValues.ts:40](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformEnumValues.ts#L40)
