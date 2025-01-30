[graphql-tools-monorepo](../README) / [wrap/src](../modules/wrap_src) / TransformInputObjectFields

# Class: TransformInputObjectFields<TContext\>

[wrap/src](../modules/wrap_src).TransformInputObjectFields

## Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

## Implements

- [`Transform`](/docs/api/interfaces/delegate_src.Transform)\<`TransformInputObjectFieldsTransformationContext`,
  `TContext`>

## Table of contents

### Constructors

- [constructor](wrap_src.TransformInputObjectFields#constructor)

### Methods

- [transformRequest](wrap_src.TransformInputObjectFields#transformrequest)
- [transformSchema](wrap_src.TransformInputObjectFields#transformschema)

## Constructors

### constructor

• **new TransformInputObjectFields**<`TContext`\>(`inputFieldTransformer`,
`inputFieldNodeTransformer?`, `inputObjectNodeTransformer?`)

#### Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

#### Parameters

| Name                          | Type                                                                           |
| :---------------------------- | :----------------------------------------------------------------------------- |
| `inputFieldTransformer`       | [`InputFieldTransformer`](../modules/wrap_src#inputfieldtransformer)           |
| `inputFieldNodeTransformer?`  | [`InputFieldNodeTransformer`](../modules/wrap_src#inputfieldnodetransformer)   |
| `inputObjectNodeTransformer?` | [`InputObjectNodeTransformer`](../modules/wrap_src#inputobjectnodetransformer) |

#### Defined in

[packages/wrap/src/transforms/TransformInputObjectFields.ts:42](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformInputObjectFields.ts#L42)

## Methods

### transformRequest

▸ **transformRequest**(`originalRequest`, `delegationContext`, `_transformationContext`):
[`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest)\<`any`, `any`, `any`,
`Record`\<`string`, `any`>, `any`>

#### Parameters

| Name                     | Type                                                                                                                           |
| :----------------------- | :----------------------------------------------------------------------------------------------------------------------------- |
| `originalRequest`        | [`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest)\<`any`, `any`, `any`, `Record`\<`string`, `any`>, `any`> |
| `delegationContext`      | [`DelegationContext`](/docs/api/interfaces/delegate_src.DelegationContext)\<`TContext`>                                        |
| `_transformationContext` | `TransformInputObjectFieldsTransformationContext`                                                                              |

#### Returns

[`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest)\<`any`, `any`, `any`,
`Record`\<`string`, `any`>, `any`>

#### Implementation of

Transform.transformRequest

#### Defined in

[packages/wrap/src/transforms/TransformInputObjectFields.ts:91](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformInputObjectFields.ts#L91)

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

[packages/wrap/src/transforms/TransformInputObjectFields.ts:63](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformInputObjectFields.ts#L63)
