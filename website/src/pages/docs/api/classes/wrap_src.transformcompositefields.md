[graphql-tools-monorepo](../README) / [wrap/src](../modules/wrap_src) / TransformCompositeFields

# Class: TransformCompositeFields<TContext\>

[wrap/src](../modules/wrap_src).TransformCompositeFields

## Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

## Implements

- [`Transform`](/docs/api/interfaces/delegate_src.Transform)\<`TransformCompositeFieldsTransformationContext`,
  `TContext`>

## Table of contents

### Constructors

- [constructor](wrap_src.TransformCompositeFields#constructor)

### Methods

- [transformRequest](wrap_src.TransformCompositeFields#transformrequest)
- [transformResult](wrap_src.TransformCompositeFields#transformresult)
- [transformSchema](wrap_src.TransformCompositeFields#transformschema)

## Constructors

### constructor

• **new TransformCompositeFields**<`TContext`\>(`fieldTransformer`, `fieldNodeTransformer?`,
`dataTransformer?`, `errorsTransformer?`)

#### Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

#### Parameters

| Name                    | Type                                                                    |
| :---------------------- | :---------------------------------------------------------------------- |
| `fieldTransformer`      | [`FieldTransformer`](../modules/wrap_src#fieldtransformer)\<`TContext`> |
| `fieldNodeTransformer?` | [`FieldNodeTransformer`](../modules/wrap_src#fieldnodetransformer)      |
| `dataTransformer?`      | [`DataTransformer`](../modules/wrap_src#datatransformer)                |
| `errorsTransformer?`    | [`ErrorsTransformer`](../modules/wrap_src#errorstransformer)            |

#### Defined in

[packages/wrap/src/transforms/TransformCompositeFields.ts:43](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformCompositeFields.ts#L43)

## Methods

### transformRequest

▸ **transformRequest**(`originalRequest`, `_delegationContext`, `transformationContext`):
[`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest)\<`any`, `any`, `any`,
`Record`\<`string`, `any`>, `any`>

#### Parameters

| Name                    | Type                                                                                                                           |
| :---------------------- | :----------------------------------------------------------------------------------------------------------------------------- |
| `originalRequest`       | [`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest)\<`any`, `any`, `any`, `Record`\<`string`, `any`>, `any`> |
| `_delegationContext`    | [`DelegationContext`](/docs/api/interfaces/delegate_src.DelegationContext)\<`TContext`>                                        |
| `transformationContext` | `TransformCompositeFieldsTransformationContext`                                                                                |

#### Returns

[`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest)\<`any`, `any`, `any`,
`Record`\<`string`, `any`>, `any`>

#### Implementation of

Transform.transformRequest

#### Defined in

[packages/wrap/src/transforms/TransformCompositeFields.ts:92](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformCompositeFields.ts#L92)

---

### transformResult

▸ **transformResult**(`result`, `_delegationContext`, `transformationContext`):
[`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult)\<`any`, `any`>

#### Parameters

| Name                    | Type                                                                                    |
| :---------------------- | :-------------------------------------------------------------------------------------- |
| `result`                | [`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult)\<`any`, `any`>      |
| `_delegationContext`    | [`DelegationContext`](/docs/api/interfaces/delegate_src.DelegationContext)\<`TContext`> |
| `transformationContext` | `TransformCompositeFieldsTransformationContext`                                         |

#### Returns

[`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult)\<`any`, `any`>

#### Implementation of

Transform.transformResult

#### Defined in

[packages/wrap/src/transforms/TransformCompositeFields.ts:104](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformCompositeFields.ts#L104)

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

[packages/wrap/src/transforms/TransformCompositeFields.ts:66](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/TransformCompositeFields.ts#L66)
