[graphql-tools-monorepo](../README) / [wrap/src](../modules/wrap_src) / HoistField

# Class: HoistField<TContext\>

[wrap/src](../modules/wrap_src).HoistField

## Type parameters

| Name       | Type                                                            |
| :--------- | :-------------------------------------------------------------- |
| `TContext` | extends `Record`\<`string`, `any`> = `Record`\<`string`, `any`> |

## Implements

- [`Transform`](/docs/api/interfaces/delegate_src.Transform)\<`HoistFieldTransformationContext`,
  `TContext`>

## Table of contents

### Constructors

- [constructor](wrap_src.HoistField#constructor)

### Methods

- [transformRequest](wrap_src.HoistField#transformrequest)
- [transformResult](wrap_src.HoistField#transformresult)
- [transformSchema](wrap_src.HoistField#transformschema)

## Constructors

### constructor

• **new HoistField**<`TContext`\>(`typeName`, `pathConfig`, `newFieldName`, `alias?`)

#### Type parameters

| Name       | Type                                                            |
| :--------- | :-------------------------------------------------------------- |
| `TContext` | extends `Record`\<`string`, `any`> = `Record`\<`string`, `any`> |

#### Parameters

| Name           | Type                                                                                               | Default value |
| :------------- | :------------------------------------------------------------------------------------------------- | :------------ |
| `typeName`     | `string`                                                                                           | `undefined`   |
| `pathConfig`   | (`string` \| \{ `argFilter?`: (`arg`: `GraphQLArgument`) => `boolean` ; `fieldName`: `string` })[] | `undefined`   |
| `newFieldName` | `string`                                                                                           | `undefined`   |
| `alias`        | `string`                                                                                           | `'__gqtlw__'` |

#### Defined in

[packages/wrap/src/transforms/HoistField.ts:44](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/HoistField.ts#L44)

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
| `transformationContext` | `HoistFieldTransformationContext`                                                                                              |

#### Returns

[`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest)\<`any`, `any`, `any`,
`Record`\<`string`, `any`>, `any`>

#### Implementation of

Transform.transformRequest

#### Defined in

[packages/wrap/src/transforms/HoistField.ts:194](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/HoistField.ts#L194)

---

### transformResult

▸ **transformResult**(`originalResult`, `delegationContext`, `transformationContext`):
[`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult)\<`any`, `any`>

#### Parameters

| Name                    | Type                                                                                    |
| :---------------------- | :-------------------------------------------------------------------------------------- |
| `originalResult`        | [`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult)\<`any`, `any`>      |
| `delegationContext`     | [`DelegationContext`](/docs/api/interfaces/delegate_src.DelegationContext)\<`TContext`> |
| `transformationContext` | `HoistFieldTransformationContext`                                                       |

#### Returns

[`ExecutionResult`](/docs/api/interfaces/utils_src.ExecutionResult)\<`any`, `any`>

#### Implementation of

Transform.transformResult

#### Defined in

[packages/wrap/src/transforms/HoistField.ts:206](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/HoistField.ts#L206)

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

[packages/wrap/src/transforms/HoistField.ts:92](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/HoistField.ts#L92)
