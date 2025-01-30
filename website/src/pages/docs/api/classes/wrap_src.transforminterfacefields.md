[graphql-tools-monorepo](../README) / [wrap/src](../modules/wrap_src) / TransformInterfaceFields

# Class: TransformInterfaceFields<TContext\>

[wrap/src](../modules/wrap_src).TransformInterfaceFields

## Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

## Implements

- [`Transform`](/docs/api/interfaces/delegate_src.Transform)\<`TransformInterfaceFieldsTransformationContext`,
  `TContext`>

## Table of contents

### Constructors

- [constructor](wrap_src.TransformInterfaceFields#constructor)

### Methods

- [transformRequest](wrap_src.TransformInterfaceFields#transformrequest)
- [transformResult](wrap_src.TransformInterfaceFields#transformresult)
- [transformSchema](wrap_src.TransformInterfaceFields#transformschema)

## Constructors

### constructor

• **new TransformInterfaceFields**<`TContext`\>(`interfaceFieldTransformer`,
`fieldNodeTransformer?`)

#### Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

#### Parameters

| Name                        | Type                                                                    |
| :-------------------------- | :---------------------------------------------------------------------- |
| `interfaceFieldTransformer` | [`FieldTransformer`](../modules/wrap_src#fieldtransformer)\<`TContext`> |
| `fieldNodeTransformer?`     | [`FieldNodeTransformer`](../modules/wrap_src#fieldnodetransformer)      |

#### Defined in

[packages/wrap/src/transforms/TransformInterfaceFields.ts:16](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformInterfaceFields.ts#L16)

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
| `transformationContext` | `TransformInterfaceFieldsTransformationContext`                                                                                |

#### Returns

[`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest)\<`any`, `any`, `any`,
`Record`\<`string`, `any`>, `any`>

#### Implementation of

Transform.transformRequest

#### Defined in

[packages/wrap/src/transforms/TransformInterfaceFields.ts:58](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformInterfaceFields.ts#L58)

---

### transformResult

▸ **transformResult**(`originalResult`, `delegationContext`, `transformationContext`):
[`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult)\<`any`, `any`>

#### Parameters

| Name                    | Type                                                                                    |
| :---------------------- | :-------------------------------------------------------------------------------------- |
| `originalResult`        | [`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult)\<`any`, `any`>      |
| `delegationContext`     | [`DelegationContext`](/docs/api/interfaces/delegate_src.DelegationContext)\<`TContext`> |
| `transformationContext` | `TransformInterfaceFieldsTransformationContext`                                         |

#### Returns

[`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult)\<`any`, `any`>

#### Implementation of

Transform.transformResult

#### Defined in

[packages/wrap/src/transforms/TransformInterfaceFields.ts:70](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformInterfaceFields.ts#L70)

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

[packages/wrap/src/transforms/TransformInterfaceFields.ts:34](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformInterfaceFields.ts#L34)
