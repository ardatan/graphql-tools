[graphql-tools-monorepo](../README) / [wrap/src](../modules/wrap_src) / TransformRootFields

# Class: TransformRootFields<TContext\>

[wrap/src](../modules/wrap_src).TransformRootFields

## Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

## Implements

- [`Transform`](/docs/api/interfaces/delegate_src.Transform)\<`TransformRootFieldsTransformationContext`,
  `TContext`>

## Table of contents

### Constructors

- [constructor](wrap_src.TransformRootFields#constructor)

### Methods

- [transformRequest](wrap_src.TransformRootFields#transformrequest)
- [transformResult](wrap_src.TransformRootFields#transformresult)
- [transformSchema](wrap_src.TransformRootFields#transformschema)

## Constructors

### constructor

• **new TransformRootFields**<`TContext`\>(`rootFieldTransformer`, `fieldNodeTransformer?`)

#### Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

#### Parameters

| Name                    | Type                                                                            |
| :---------------------- | :------------------------------------------------------------------------------ |
| `rootFieldTransformer`  | [`RootFieldTransformer`](../modules/wrap_src#rootfieldtransformer)\<`TContext`> |
| `fieldNodeTransformer?` | [`FieldNodeTransformer`](../modules/wrap_src#fieldnodetransformer)              |

#### Defined in

[packages/wrap/src/transforms/TransformRootFields.ts:16](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformRootFields.ts#L16)

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
| `transformationContext` | `TransformRootFieldsTransformationContext`                                                                                     |

#### Returns

[`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest)\<`any`, `any`, `any`,
`Record`\<`string`, `any`>, `any`>

#### Implementation of

Transform.transformRequest

#### Defined in

[packages/wrap/src/transforms/TransformRootFields.ts:66](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformRootFields.ts#L66)

---

### transformResult

▸ **transformResult**(`originalResult`, `delegationContext`, `transformationContext`):
[`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult)\<`any`, `any`>

#### Parameters

| Name                    | Type                                                                                    |
| :---------------------- | :-------------------------------------------------------------------------------------- |
| `originalResult`        | [`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult)\<`any`, `any`>      |
| `delegationContext`     | [`DelegationContext`](/docs/api/interfaces/delegate_src.DelegationContext)\<`TContext`> |
| `transformationContext` | `TransformRootFieldsTransformationContext`                                              |

#### Returns

[`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult)\<`any`, `any`>

#### Implementation of

Transform.transformResult

#### Defined in

[packages/wrap/src/transforms/TransformRootFields.ts:78](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformRootFields.ts#L78)

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

[packages/wrap/src/transforms/TransformRootFields.ts:34](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformRootFields.ts#L34)
