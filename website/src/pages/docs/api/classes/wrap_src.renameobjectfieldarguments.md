[graphql-tools-monorepo](../README) / [wrap/src](../modules/wrap_src) / RenameObjectFieldArguments

# Class: RenameObjectFieldArguments<TContext\>

[wrap/src](../modules/wrap_src).RenameObjectFieldArguments

## Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

## Implements

- [`Transform`](/docs/api/interfaces/delegate_src.Transform)\<`RenameObjectFieldArgumentsTransformationContext`,
  `TContext`>

## Table of contents

### Constructors

- [constructor](wrap_src.RenameObjectFieldArguments#constructor)

### Methods

- [transformRequest](wrap_src.RenameObjectFieldArguments#transformrequest)
- [transformSchema](wrap_src.RenameObjectFieldArguments#transformschema)

## Constructors

### constructor

• **new RenameObjectFieldArguments**<`TContext`\>(`renamer`)

#### Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

#### Parameters

| Name      | Type              |
| :-------- | :---------------- |
| `renamer` | `RenamerFunction` |

#### Defined in

[packages/wrap/src/transforms/RenameObjectFieldArguments.ts:17](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/RenameObjectFieldArguments.ts#L17)

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
| `transformationContext` | `RenameObjectFieldArgumentsTransformationContext`                                                                              |

#### Returns

[`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest)\<`any`, `any`, `any`,
`Record`\<`string`, `any`>, `any`>

#### Implementation of

Transform.transformRequest

#### Defined in

[packages/wrap/src/transforms/RenameObjectFieldArguments.ts:97](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/RenameObjectFieldArguments.ts#L97)

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

[packages/wrap/src/transforms/RenameObjectFieldArguments.ts:64](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/RenameObjectFieldArguments.ts#L64)
