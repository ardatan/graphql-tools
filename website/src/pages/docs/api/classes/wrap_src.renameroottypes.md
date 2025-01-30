[graphql-tools-monorepo](../README) / [wrap/src](../modules/wrap_src) / RenameRootTypes

# Class: RenameRootTypes<TContext\>

[wrap/src](../modules/wrap_src).RenameRootTypes

## Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

## Implements

- [`Transform`](/docs/api/interfaces/delegate_src.Transform)\<`RenameRootTypesTransformationContext`,
  `TContext`>

## Table of contents

### Constructors

- [constructor](wrap_src.RenameRootTypes#constructor)

### Methods

- [transformRequest](wrap_src.RenameRootTypes#transformrequest)
- [transformResult](wrap_src.RenameRootTypes#transformresult)
- [transformSchema](wrap_src.RenameRootTypes#transformschema)

## Constructors

### constructor

• **new RenameRootTypes**<`TContext`\>(`renamer`)

#### Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

#### Parameters

| Name      | Type                                          |
| :-------- | :-------------------------------------------- |
| `renamer` | (`name`: `string`) => `undefined` \| `string` |

#### Defined in

[packages/wrap/src/transforms/RenameRootTypes.ts:21](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/RenameRootTypes.ts#L21)

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
| `_transformationContext` | `RenameRootTypesTransformationContext`                                                                                         |

#### Returns

[`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest)\<`any`, `any`, `any`,
`Record`\<`string`, `any`>, `any`>

#### Implementation of

Transform.transformRequest

#### Defined in

[packages/wrap/src/transforms/RenameRootTypes.ts:45](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/RenameRootTypes.ts#L45)

---

### transformResult

▸ **transformResult**(`originalResult`, `_delegationContext`, `_transformationContext?`):
[`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult)\<`any`, `any`>

#### Parameters

| Name                      | Type                                                                                    |
| :------------------------ | :-------------------------------------------------------------------------------------- |
| `originalResult`          | [`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult)\<`any`, `any`>      |
| `_delegationContext`      | [`DelegationContext`](/docs/api/interfaces/delegate_src.DelegationContext)\<`TContext`> |
| `_transformationContext?` | `RenameRootTypesTransformationContext`                                                  |

#### Returns

[`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult)\<`any`, `any`>

#### Implementation of

Transform.transformResult

#### Defined in

[packages/wrap/src/transforms/RenameRootTypes.ts:70](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/RenameRootTypes.ts#L70)

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

[packages/wrap/src/transforms/RenameRootTypes.ts:27](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/RenameRootTypes.ts#L27)
