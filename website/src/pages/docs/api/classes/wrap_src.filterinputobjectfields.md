[graphql-tools-monorepo](../README) / [wrap/src](../modules/wrap_src) / FilterInputObjectFields

# Class: FilterInputObjectFields<TContext\>

[wrap/src](../modules/wrap_src).FilterInputObjectFields

## Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

## Implements

- [`Transform`](/docs/api/interfaces/delegate_src.Transform)\<`FilterInputObjectFieldsTransformationContext`,
  `TContext`>

## Table of contents

### Constructors

- [constructor](wrap_src.FilterInputObjectFields#constructor)

### Methods

- [transformRequest](wrap_src.FilterInputObjectFields#transformrequest)
- [transformSchema](wrap_src.FilterInputObjectFields#transformschema)

## Constructors

### constructor

• **new FilterInputObjectFields**<`TContext`\>(`filter`, `inputObjectNodeTransformer?`)

#### Type parameters

| Name       | Type                       |
| :--------- | :------------------------- |
| `TContext` | `Record`\<`string`, `any`> |

#### Parameters

| Name                          | Type                                                                           |
| :---------------------------- | :----------------------------------------------------------------------------- |
| `filter`                      | [`InputFieldFilter`](../modules/utils_src#inputfieldfilter)                    |
| `inputObjectNodeTransformer?` | [`InputObjectNodeTransformer`](../modules/wrap_src#inputobjectnodetransformer) |

#### Defined in

[packages/wrap/src/transforms/FilterInputObjectFields.ts:14](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/FilterInputObjectFields.ts#L14)

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
| `transformationContext` | `FilterInputObjectFieldsTransformationContext`                                                                                 |

#### Returns

[`ExecutionRequest`](/docs/api/interfaces/utils_src.ExecutionRequest)\<`any`, `any`, `any`,
`Record`\<`string`, `any`>, `any`>

#### Implementation of

Transform.transformRequest

#### Defined in

[packages/wrap/src/transforms/FilterInputObjectFields.ts:30](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/FilterInputObjectFields.ts#L30)

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

[packages/wrap/src/transforms/FilterInputObjectFields.ts:23](https://github.com/ardatan/graphql-tools/blob/master/packages/wrap/src/transforms/FilterInputObjectFields.ts#L23)
