[graphql-tools-monorepo](../README) / [wrap/src](../modules/wrap_src) / RenameInterfaceFields

# Class: RenameInterfaceFields<TContext\>

[wrap/src](../modules/wrap_src).RenameInterfaceFields

## Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

## Implements

- [`Transform`](/docs/api/interfaces/delegate_src.Transform)\<`RenameInterfaceFieldsTransformationContext`,
  `TContext`>

## Table of contents

### Constructors

- [constructor](wrap_src.RenameInterfaceFields#constructor)

### Methods

- [transformRequest](wrap_src.RenameInterfaceFields#transformrequest)
- [transformSchema](wrap_src.RenameInterfaceFields#transformschema)

## Constructors

### constructor

• **new RenameInterfaceFields**<`TContext`\>(`renamer`)

#### Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

#### Parameters

| Name      | Type                                                                                                                 |
| :-------- | :------------------------------------------------------------------------------------------------------------------- |
| `renamer` | (`typeName`: `string`, `fieldName`: `string`, `fieldConfig`: `GraphQLFieldConfig`\<`any`, `any`, `any`>) => `string` |

#### Defined in

[packages/wrap/src/transforms/RenameInterfaceFields.ts:13](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/RenameInterfaceFields.ts#L13)

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
| `transformationContext` | `RenameInterfaceFieldsTransformationContext`                                                                                   |

#### Returns

[`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest)\<`any`, `any`, `any`,
`Record`\<`string`, `any`>, `any`>

#### Implementation of

Transform.transformRequest

#### Defined in

[packages/wrap/src/transforms/RenameInterfaceFields.ts:35](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/RenameInterfaceFields.ts#L35)

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

[packages/wrap/src/transforms/RenameInterfaceFields.ts:28](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/RenameInterfaceFields.ts#L28)
