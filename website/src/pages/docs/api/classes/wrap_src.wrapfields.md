[graphql-tools-monorepo](../README) / [wrap/src](../modules/wrap_src) / WrapFields

# Class: WrapFields<TContext\>

[wrap/src](../modules/wrap_src).WrapFields

## Type parameters

| Name       | Type                               |
| :--------- | :--------------------------------- |
| `TContext` | extends `Record`\<`string`, `any`> |

## Implements

- [`Transform`](/docs/api/interfaces/delegate_src.Transform)\<`WrapFieldsTransformationContext`,
  `TContext`>

## Table of contents

### Constructors

- [constructor](wrap_src.WrapFields#constructor)

### Methods

- [transformRequest](wrap_src.WrapFields#transformrequest)
- [transformResult](wrap_src.WrapFields#transformresult)
- [transformSchema](wrap_src.WrapFields#transformschema)

## Constructors

### constructor

• **new WrapFields**<`TContext`\>(`outerTypeName`, `wrappingFieldNames`, `wrappingTypeNames`,
`fieldNames?`, `prefix?`)

#### Type parameters

| Name       | Type                               |
| :--------- | :--------------------------------- |
| `TContext` | extends `Record`\<`string`, `any`> |

#### Parameters

| Name                 | Type       | Default value |
| :------------------- | :--------- | :------------ |
| `outerTypeName`      | `string`   | `undefined`   |
| `wrappingFieldNames` | `string`[] | `undefined`   |
| `wrappingTypeNames`  | `string`[] | `undefined`   |
| `fieldNames?`        | `string`[] | `undefined`   |
| `prefix`             | `string`   | `'gqtld'`     |

#### Defined in

[packages/wrap/src/transforms/WrapFields.ts:47](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/WrapFields.ts#L47)

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
| `transformationContext` | `WrapFieldsTransformationContext`                                                                                              |

#### Returns

[`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest)\<`any`, `any`, `any`,
`Record`\<`string`, `any`>, `any`>

#### Implementation of

Transform.transformRequest

#### Defined in

[packages/wrap/src/transforms/WrapFields.ts:188](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/WrapFields.ts#L188)

---

### transformResult

▸ **transformResult**(`originalResult`, `delegationContext`, `transformationContext`):
[`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult)\<`any`, `any`>

#### Parameters

| Name                    | Type                                                                                    |
| :---------------------- | :-------------------------------------------------------------------------------------- |
| `originalResult`        | [`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult)\<`any`, `any`>      |
| `delegationContext`     | [`DelegationContext`](/docs/api/interfaces/delegate_src.DelegationContext)\<`TContext`> |
| `transformationContext` | `WrapFieldsTransformationContext`                                                       |

#### Returns

[`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult)\<`any`, `any`>

#### Implementation of

Transform.transformResult

#### Defined in

[packages/wrap/src/transforms/WrapFields.ts:202](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/WrapFields.ts#L202)

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

[packages/wrap/src/transforms/WrapFields.ts:89](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/WrapFields.ts#L89)
