[graphql-tools-monorepo](../README) / [wrap/src](../modules/wrap_src) / WrapType

# Class: WrapType<TContext\>

[wrap/src](../modules/wrap_src).WrapType

## Type parameters

| Name       | Type                                                            |
| :--------- | :-------------------------------------------------------------- |
| `TContext` | extends `Record`\<`string`, `any`> = `Record`\<`string`, `any`> |

## Implements

- [`Transform`](/docs/api/interfaces/delegate_src.Transform)\<`WrapTypeTransformationContext`,
  `TContext`>

## Table of contents

### Constructors

- [constructor](wrap_src.WrapType#constructor)

### Methods

- [transformRequest](wrap_src.WrapType#transformrequest)
- [transformResult](wrap_src.WrapType#transformresult)
- [transformSchema](wrap_src.WrapType#transformschema)

## Constructors

### constructor

• **new WrapType**<`TContext`\>(`outerTypeName`, `innerTypeName`, `fieldName`)

#### Type parameters

| Name       | Type                                                            |
| :--------- | :-------------------------------------------------------------- |
| `TContext` | extends `Record`\<`string`, `any`> = `Record`\<`string`, `any`> |

#### Parameters

| Name            | Type     |
| :-------------- | :------- |
| `outerTypeName` | `string` |
| `innerTypeName` | `string` |
| `fieldName`     | `string` |

#### Defined in

[packages/wrap/src/transforms/WrapType.ts:13](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/WrapType.ts#L13)

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
| `transformationContext` | `WrapTypeTransformationContext`                                                                                                |

#### Returns

[`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest)\<`any`, `any`, `any`,
`Record`\<`string`, `any`>, `any`>

#### Implementation of

Transform.transformRequest

#### Defined in

[packages/wrap/src/transforms/WrapType.ts:24](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/WrapType.ts#L24)

---

### transformResult

▸ **transformResult**(`originalResult`, `delegationContext`, `transformationContext`):
[`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult)\<`any`, `any`>

#### Parameters

| Name                    | Type                                                                                    |
| :---------------------- | :-------------------------------------------------------------------------------------- |
| `originalResult`        | [`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult)\<`any`, `any`>      |
| `delegationContext`     | [`DelegationContext`](/docs/api/interfaces/delegate_src.DelegationContext)\<`TContext`> |
| `transformationContext` | `WrapTypeTransformationContext`                                                         |

#### Returns

[`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult)\<`any`, `any`>

#### Implementation of

Transform.transformResult

#### Defined in

[packages/wrap/src/transforms/WrapType.ts:36](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/WrapType.ts#L36)

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

[packages/wrap/src/transforms/WrapType.ts:17](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/WrapType.ts#L17)
