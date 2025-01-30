[graphql-tools-monorepo](../README) / [wrap/src](../modules/wrap_src) / TransformObjectFields

# Class: TransformObjectFields<TContext\>

[wrap/src](../modules/wrap_src).TransformObjectFields

## Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

## Implements

- [`Transform`](/docs/api/interfaces/delegate_src.Transform)\<`TransformObjectFieldsTransformationContext`,
  `TContext`>

## Table of contents

### Constructors

- [constructor](wrap_src.TransformObjectFields#constructor)

### Methods

- [transformRequest](wrap_src.TransformObjectFields#transformrequest)
- [transformResult](wrap_src.TransformObjectFields#transformresult)
- [transformSchema](wrap_src.TransformObjectFields#transformschema)

## Constructors

### constructor

• **new TransformObjectFields**<`TContext`\>(`objectFieldTransformer`, `fieldNodeTransformer?`)

#### Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

#### Parameters

| Name                     | Type                                                                    |
| :----------------------- | :---------------------------------------------------------------------- |
| `objectFieldTransformer` | [`FieldTransformer`](../modules/wrap_src#fieldtransformer)\<`TContext`> |
| `fieldNodeTransformer?`  | [`FieldNodeTransformer`](../modules/wrap_src#fieldnodetransformer)      |

#### Defined in

[packages/wrap/src/transforms/TransformObjectFields.ts:16](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformObjectFields.ts#L16)

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
| `transformationContext` | `TransformObjectFieldsTransformationContext`                                                                                   |

#### Returns

[`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest)\<`any`, `any`, `any`,
`Record`\<`string`, `any`>, `any`>

#### Implementation of

Transform.transformRequest

#### Defined in

[packages/wrap/src/transforms/TransformObjectFields.ts:58](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformObjectFields.ts#L58)

---

### transformResult

▸ **transformResult**(`originalResult`, `delegationContext`, `transformationContext`):
[`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult)\<`any`, `any`>

#### Parameters

| Name                    | Type                                                                                    |
| :---------------------- | :-------------------------------------------------------------------------------------- |
| `originalResult`        | [`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult)\<`any`, `any`>      |
| `delegationContext`     | [`DelegationContext`](/docs/api/interfaces/delegate_src.DelegationContext)\<`TContext`> |
| `transformationContext` | `TransformObjectFieldsTransformationContext`                                            |

#### Returns

[`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult)\<`any`, `any`>

#### Implementation of

Transform.transformResult

#### Defined in

[packages/wrap/src/transforms/TransformObjectFields.ts:70](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformObjectFields.ts#L70)

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

[packages/wrap/src/transforms/TransformObjectFields.ts:34](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformObjectFields.ts#L34)
