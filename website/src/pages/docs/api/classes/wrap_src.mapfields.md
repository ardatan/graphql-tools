[graphql-tools-monorepo](../README) / [wrap/src](../modules/wrap_src) / MapFields

# Class: MapFields<TContext\>

[wrap/src](../modules/wrap_src).MapFields

## Type parameters

| Name       |
| :--------- |
| `TContext` |

## Implements

- [`Transform`](/docs/api/interfaces/delegate_src.Transform)\<`MapFieldsTransformationContext`,
  `TContext`>

## Table of contents

### Constructors

- [constructor](wrap_src.MapFields#constructor)

### Methods

- [transformRequest](wrap_src.MapFields#transformrequest)
- [transformResult](wrap_src.MapFields#transformresult)
- [transformSchema](wrap_src.MapFields#transformschema)

## Constructors

### constructor

• **new MapFields**<`TContext`\>(`fieldNodeTransformerMap`, `objectValueTransformerMap?`,
`errorsTransformer?`)

#### Type parameters

| Name       |
| :--------- |
| `TContext` |

#### Parameters

| Name                         | Type                                                                         |
| :--------------------------- | :--------------------------------------------------------------------------- |
| `fieldNodeTransformerMap`    | [`FieldNodeMappers`](../modules/utils_src#fieldnodemappers)                  |
| `objectValueTransformerMap?` | [`ObjectValueTransformerMap`](../modules/wrap_src#objectvaluetransformermap) |
| `errorsTransformer?`         | [`ErrorsTransformer`](../modules/wrap_src#errorstransformer)                 |

#### Defined in

[packages/wrap/src/transforms/MapFields.ts:17](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/MapFields.ts#L17)

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
| `transformationContext` | `MapFieldsTransformationContext`                                                                                               |

#### Returns

[`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest)\<`any`, `any`, `any`,
`Record`\<`string`, `any`>, `any`>

#### Implementation of

Transform.transformRequest

#### Defined in

[packages/wrap/src/transforms/MapFields.ts:86](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/MapFields.ts#L86)

---

### transformResult

▸ **transformResult**(`originalResult`, `delegationContext`, `transformationContext`):
[`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult)\<`any`, `any`>

#### Parameters

| Name                    | Type                                                                                    |
| :---------------------- | :-------------------------------------------------------------------------------------- |
| `originalResult`        | [`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult)\<`any`, `any`>      |
| `delegationContext`     | [`DelegationContext`](/docs/api/interfaces/delegate_src.DelegationContext)\<`TContext`> |
| `transformationContext` | `MapFieldsTransformationContext`                                                        |

#### Returns

[`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult)\<`any`, `any`>

#### Implementation of

Transform.transformResult

#### Defined in

[packages/wrap/src/transforms/MapFields.ts:98](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/MapFields.ts#L98)

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

[packages/wrap/src/transforms/MapFields.ts:37](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/MapFields.ts#L37)
