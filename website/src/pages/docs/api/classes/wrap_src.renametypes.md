[graphql-tools-monorepo](../README) / [wrap/src](../modules/wrap_src) / RenameTypes

# Class: RenameTypes<TContext\>

[wrap/src](../modules/wrap_src).RenameTypes

## Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

## Implements

- [`Transform`](/docs/api/interfaces/delegate_src.Transform)\<`RenameTypesTransformationContext`,
  `TContext`>

## Table of contents

### Constructors

- [constructor](wrap_src.RenameTypes#constructor)

### Methods

- [transformRequest](wrap_src.RenameTypes#transformrequest)
- [transformResult](wrap_src.RenameTypes#transformresult)
- [transformSchema](wrap_src.RenameTypes#transformschema)

## Constructors

### constructor

• **new RenameTypes**<`TContext`\>(`renamer`, `options?`)

#### Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

#### Parameters

| Name       | Type                                                            |
| :--------- | :-------------------------------------------------------------- |
| `renamer`  | (`name`: `string`) => `undefined` \| `string`                   |
| `options?` | [`RenameTypesOptions`](../modules/utils_src#renametypesoptions) |

#### Defined in

[packages/wrap/src/transforms/RenameTypes.ts:32](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/RenameTypes.ts#L32)

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
| `_transformationContext` | `RenameTypesTransformationContext`                                                                                             |

#### Returns

[`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest)\<`any`, `any`, `any`,
`Record`\<`string`, `any`>, `any`>

#### Implementation of

Transform.transformRequest

#### Defined in

[packages/wrap/src/transforms/RenameTypes.ts:79](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/RenameTypes.ts#L79)

---

### transformResult

▸ **transformResult**(`originalResult`, `_delegationContext`, `_transformationContext?`):
[`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult)\<`any`, `any`>

#### Parameters

| Name                      | Type                                                                                    |
| :------------------------ | :-------------------------------------------------------------------------------------- |
| `originalResult`          | [`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult)\<`any`, `any`>      |
| `_delegationContext`      | [`DelegationContext`](/docs/api/interfaces/delegate_src.DelegationContext)\<`TContext`> |
| `_transformationContext?` | `RenameTypesTransformationContext`                                                      |

#### Returns

[`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult)\<`any`, `any`>

#### Implementation of

Transform.transformResult

#### Defined in

[packages/wrap/src/transforms/RenameTypes.ts:105](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/RenameTypes.ts#L105)

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

[packages/wrap/src/transforms/RenameTypes.ts:41](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/RenameTypes.ts#L41)
