[graphql-tools-monorepo](../README) / [wrap/src](../modules/wrap_src) / RenameRootFields

# Class: RenameRootFields<TContext\>

[wrap/src](../modules/wrap_src).RenameRootFields

## Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

## Implements

- [`Transform`](/docs/api/interfaces/delegate_src.Transform)\<`RenameRootFieldsTransformationContext`,
  `TContext`>

## Table of contents

### Constructors

- [constructor](wrap_src.RenameRootFields#constructor)

### Methods

- [transformRequest](wrap_src.RenameRootFields#transformrequest)
- [transformSchema](wrap_src.RenameRootFields#transformschema)

## Constructors

### constructor

• **new RenameRootFields**<`TContext`\>(`renamer`)

#### Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

#### Parameters

| Name      | Type                                                                                                                                                  |
| :-------- | :---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `renamer` | (`operation`: `"Query"` \| `"Mutation"` \| `"Subscription"`, `name`: `string`, `fieldConfig`: `GraphQLFieldConfig`\<`any`, `any`, `any`>) => `string` |

#### Defined in

[packages/wrap/src/transforms/RenameRootFields.ts:13](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/RenameRootFields.ts#L13)

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
| `transformationContext` | `RenameRootFieldsTransformationContext`                                                                                        |

#### Returns

[`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest)\<`any`, `any`, `any`,
`Record`\<`string`, `any`>, `any`>

#### Implementation of

Transform.transformRequest

#### Defined in

[packages/wrap/src/transforms/RenameRootFields.ts:36](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/RenameRootFields.ts#L36)

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

[packages/wrap/src/transforms/RenameRootFields.ts:29](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/RenameRootFields.ts#L29)
